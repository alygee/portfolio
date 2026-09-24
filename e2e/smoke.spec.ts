import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PNG } from 'pngjs';

type SceneFrame = { data: Buffer; length: number };

// Сэмплируем с шагом, не каждый пиксель: изображение большое, а для оценки
// монохромности и сравнения кадров достаточно выборки. Шаг — взаимно простое
// с четырьмя число пикселей, чтобы не попадать в один и тот же столбец кадра
// из-за совпадения с шириной канваса.
const SAMPLE_STEP = 4 * 977;

/**
 * Порог суммы |Δr|+|Δg|+|Δb| в сэмплированной точке, ниже которого два кадра
 * считаются одним и тем же кадром. PNG — лосслес-формат, поэтому декодированные
 * пиксели не несут артефактов сжатия, но программный рендерер (swiftshader)
 * не обязан быть побитово детерминирован кадр к кадру даже при неподвижной
 * камере — небольшой допуск нужен, чтобы такой шум не мешал ни циклу
 * ожидания стабилизации (тест завис бы в вечном ожидании точного совпадения),
 * ни проверке «кадры отличаются» (шум мог бы ложно сойти за движение камеры).
 * Порог намного меньше типичной разницы между станциями маршрута — обе
 * обязательные мутации (пустая сцена, замёрзшая камера) всё равно красят
 * тесты, см. final-fix-report.md.
 */
const FRAME_DIFF_THRESHOLD = 24;

/**
 * Снимает кадр канваса сцены скриншотом Playwright, а не чтением WebGL
 * drawing buffer (`getImageData`/`toDataURL`) со страницы. Скриншот идёт
 * через композитор браузера и не требует `preserveDrawingBuffer: true` —
 * этот флаг раньше стоял прямо в продакшен-пропах `<Canvas>` (SceneLayer.tsx)
 * ради теста и лишал композитор быстрого пути (блит вместо флипа) для каждого
 * посетителя сайта, а не только для CI; дороже всего — на мобильных
 * tile-based GPU, ровно на классе устройств из проекта `mobile`.
 *
 * PNG декодируется через pngjs, чтобы сравнивать реальные пиксели, а не байты
 * PNG-потока: кодирование PNG не гарантированно побайтово детерминировано
 * между запусками (порядок фильтров, версия либы и т.п.), сырые пиксели —
 * гарантированно.
 */
async function readSceneFrame(page: Page): Promise<SceneFrame> {
  const buffer = await page.locator('.scene-layer canvas').screenshot();
  const { data } = PNG.sync.read(buffer);
  return { data, length: data.length };
}

/** Кадр не одноцветный: среди сэмплов есть пара с разницей выше шума. */
function isMonochrome(frame: SceneFrame): boolean {
  let first: [number, number, number] | null = null;
  for (let i = 0; i < frame.length; i += SAMPLE_STEP) {
    const sample: [number, number, number] = [
      frame.data[i]!,
      frame.data[i + 1]!,
      frame.data[i + 2]!,
    ];
    if (first === null) {
      first = sample;
      continue;
    }
    const diff =
      Math.abs(sample[0] - first[0]) + Math.abs(sample[1] - first[1]) + Math.abs(sample[2] - first[2]);
    if (diff > 10) return false;
  }
  return true;
}

/** Совпадают ли два кадра с точностью до FRAME_DIFF_THRESHOLD (см. выше). */
function framesEqual(a: SceneFrame, b: SceneFrame): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += SAMPLE_STEP) {
    const diff =
      Math.abs(a.data[i]! - b.data[i]!) +
      Math.abs(a.data[i + 1]! - b.data[i + 1]!) +
      Math.abs(a.data[i + 2]! - b.data[i + 2]!);
    if (diff > FRAME_DIFF_THRESHOLD) return false;
  }
  return true;
}

/**
 * Ждёт, пока кадр канваса перестанет меняться между последовательными
 * снимками. Камера сглаживает движение экспоненциально (см. stepCamera.ts) —
 * формально это никогда не завершается, поэтому ждём практической остановки
 * (два одинаковых в пределах порога кадра подряд), а не фиксированную паузу:
 * на CI под программным рендерером swiftshader кадр может стабилизироваться
 * заметно дольше, чем на GPU у разработчика.
 */
async function waitForStableFrame(page: Page): Promise<SceneFrame> {
  let previous: SceneFrame | undefined;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const frame = await readSceneFrame(page);
    if (previous && framesEqual(previous, frame)) return frame;
    previous = frame;
    await page.waitForTimeout(150);
  }
  throw new Error('кадр канваса не стабилизировался за отведённое время');
}

/**
 * `.scene-layer` лежит ниже по z-index, чем `main` (см. styles.css, Р2 в
 * спеке: HTML-проекция резюме в DOM всегда, а не только как fallback) — это
 * осознанное решение, но из-за него скриншот канваса Playwright содержит не
 * только то, что нарисовал WebGL, а весь композит экрана в границах канваса,
 * включая текст резюме, лежащий поверх. Без скрытия текста «кадр не
 * одноцветный» был бы истинным всегда — из-за текста, а не из-за сцены — и
 * не заметил бы мутацию «пустая сцена»: маскировка проверена практически при
 * разработке теста, см. final-fix-report.md.
 *
 * Скрытие через `visibility: hidden`, а не `display: none`: `display: none`
 * убрал бы `main` из потока документа, `document.documentElement.scrollHeight`
 * схлопнулся бы до высоты вьюпорта, и прокрутка в конец страницы (нужна
 * тесту движения камеры) перестала бы что-либо прокручивать.
 */
async function withHiddenResumeText<T>(page: Page, run: () => Promise<T>): Promise<T> {
  await page.evaluate(() => {
    document.querySelector('main')!.style.visibility = 'hidden';
  });
  try {
    return await run();
  } finally {
    await page.evaluate(() => {
      document.querySelector('main')!.style.visibility = '';
    });
  }
}

test('резюме читается при отключённом JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Аллагулов/);
  await expect(page.getByText('ГИСГИС')).toBeVisible();
  // Стаж считается от даты сборки — точное число месяцев меняется каждый
  // месяц, поэтому проверяем шаблон, а не конкретное значение.
  await expect(page.getByText(/Опыт — \d+ (год|года|лет)/)).toBeVisible();
  await context.close();
});

test('deep link ведёт к секции работы', async ({ page }) => {
  await page.goto('#mplat');
  await expect(page.locator('#mplat')).toBeInViewport();
});

test('deep link выживает после первой прокрутки для каждой работы', async ({ page }) => {
  // Прогресс маршрута считается от позиций секций работ, поэтому позиция, в
  // которую браузер ставит секцию по хэшу, даёт ровно прогресс её станции.
  // Красный при поломке: если прогресс снова пойдёт от доли скролла всего
  // документа, первое же событие скролла перепишет хэш на другую станцию.
  // Проверяются все секции: для отдельно взятой станции доля скролла может
  // случайно попасть в тот же индекс, для всех сразу — нет.
  await page.goto('/');
  const ids = await page.$$eval('section[id]', (sections) => sections.map((s) => s.id));
  expect(ids.length).toBeGreaterThan(1);

  for (const id of ids) {
    await page.goto(`#${id}`);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollBy(0, 12));
    await page.waitForTimeout(300);
    expect(new URL(page.url()).hash, `хэш после прокрутки у #${id}`).toBe(`#${id}`);
  }
});

test('горизонтального скролла нет на узком экране', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('при prefers-reduced-motion канвас не монтируется и мост скролла не грузит lenis', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requestedUrls.some((url) => url.includes('/assets/lenis-'))).toBe(false);
  await context.close();
});

test('инерционный скролл подключается только вместе со сценой', async ({ browser }) => {
  // Проверяется связка, а не одно из её звеньев: чанк lenis запрашивается
  // тогда и только тогда, когда канвас действительно смонтирован. До
  // swiftshader сцена в headless-CI не монтировалась вовсе (WebGL был
  // недоступен без реального GPU-рендерера), и раньше здесь всё равно
  // качались 5.3 КБ, а нативная физика прокрутки подменялась rAF-циклом без
  // визуального выигрыша. Указатель задан точным: на грубом указателе
  // инерция не перехватывается независимо от сцены.
  const context = await browser.newContext({ hasTouch: false, isMobile: false });
  const page = await context.newPage();
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.goto('/');
  await page.waitForTimeout(1500);
  const canvasCount = await page.locator('canvas').count();
  const lenisRequested = requestedUrls.some((url) => url.includes('/assets/lenis-'));
  expect(lenisRequested).toBe(canvasCount > 0);
  await context.close();
});

test('нарушений доступности нет', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test('3D-слой монтируется, и канвас ровно один', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('канвас не перехватывает клики по ссылке резюме', async ({ page, context }) => {
  // .scene-layer растянут на весь вьюпорт (position: fixed; inset: 0), поэтому
  // любая ссылка в шапке резюме геометрически лежит поверх канваса. Проверяем
  // не CSS-декларацию pointer-events сама по себе (см. ниже, почему её всё
  // равно нужно проверять отдельно), а сам клик: Playwright перед click()
  // выполняет hit-test в точке клика и падает с понятной ошибкой «element
  // intercepts pointer events», если сверху что-то есть — это ловит
  // перекрытие через z-index/DOM-порядок. Защита теперь двойная (z-index и
  // pointer-events, см. ниже), поэтому мутация «поднять z-index .scene-layer
  // выше main» эту строку больше не валит: клик всё равно доходит до ссылки
  // сквозь канвас с pointer-events: none — это правильно, а не регрессия.
  // Ссылка открывается в новой вкладке — ждём событие popup как
  // доказательство, что клик действительно дошёл до <a>, а не просто не
  // бросил исключение.
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  const link = page.locator('a[href="https://t.me/albert_allagulov"]');
  await expect(link).toBeVisible();
  // Маршрут блокирует реальный переход на t.me: тесту важно, что клик дошёл
  // до ссылки, а не то, что сторонний сервис ответит. Ставим на context, а не
  // на page — новая вкладка от target="_blank" наследует маршруты контекста,
  // но не маршруты исходной страницы. Hit-test Playwright перед click() и
  // событие popup при этом проверяются как прежде: блокировка запроса не
  // мешает браузеру открыть вкладку, она лишь не даёт странице догрузиться.
  await context.route('https://t.me/**', (route) => route.abort());
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await popup.close();

  // Не вместо клика, а единственный способ поймать регрессию именно в этой
  // CSS-декларации: @react-three/fiber ставит inline `style` на свою
  // внутреннюю обёртку вокруг <canvas> (первый и единственный ребёнок
  // .scene-layer, 100% ширины и высоты) — инлайн-стиль всегда перебивает
  // унаследованное значение, поэтому pointer-events, объявленный на
  // .scene-layer в CSS, до канваса сам по себе не доходит. Действующая
  // декларация — это `style={{ pointerEvents: 'none' }}`, переданный в
  // <Canvas> (SceneLayer.tsx), и проверять нужно вычисленное значение
  // именно у канваса, а не у .scene-layer: только оно определяет, перехватит
  // ли канвас мышь. Подтверждено мутацией: временное удаление этого пропа
  // красит именно эту строку (см. task-5-report.md).
  await expect(page.locator('.scene-layer canvas')).toHaveCSS('pointer-events', 'none');
});

test('прокрутка до конца доводит хэш до последней работы', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => new URL(page.url()).hash, { timeout: 10_000 }).toBe('#amazingcat');
});

test('сцена рисует не только фон: кадр канваса не одноцветный', async ({ page }) => {
  // До swiftshader это было непроверяемо (WebGL недоступен в headless-CI без
  // GPU), а после — проверялось только «канвас есть в DOM», не «канвас что-то
  // нарисовал». Чёрный кадр или несобравшийся материал прошли бы предыдущую
  // проверку незамеченными. Красный при поломке: временное удаление станций и
  // сетки из CareerScene.tsx (остаётся только фон) красит эту строку — см.
  // final-fix-report.md, мутация «пустая сцена».
  test.setTimeout(45_000);
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });

  const frame = await withHiddenResumeText(page, () => waitForStableFrame(page));

  expect(isMonochrome(frame), 'кадр канваса одноцветный — сетка и станции не нарисовались').toBe(
    false,
  );
});

test('камера движется: кадр при прокрутке в конец отличается от начального', async ({ page }) => {
  // Юнит-тесты CameraRig двигают камеру через @react-three/test-renderer —
  // фейковый рендерер, который ничего не рисует. Замёрзшая камера (например,
  // если camera.position.copy перестанет вызываться) прошла бы их и все
  // остальные e2e незамеченной: канвас по-прежнему один, клики по-прежнему
  // проходят, хэш по-прежнему меняется (он читается из progressStore
  // независимо от того, применяет ли CameraRig это значение к камере). Этот
  // тест — единственный, что смотрит на сам кадр. Красный при поломке:
  // временное отключение camera.position.copy в CameraRig.tsx красит эту
  // строку — см. final-fix-report.md, мутация «замёрзшая камера».
  test.setTimeout(45_000);
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });

  const { start, end } = await withHiddenResumeText(page, async () => {
    const start = await waitForStableFrame(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const end = await waitForStableFrame(page);
    return { start, end };
  });

  expect(
    framesEqual(start, end),
    'кадр не изменился (в пределах допуска) после прокрутки в конец — камера не сдвинулась',
  ).toBe(false);
});

test('за время загрузки и прокрутки консоль и страница не сообщают об ошибках', async ({
  page,
}) => {
  // Закрывает целый класс невидимых отказов: расхождение гидрации, ворнинги
  // WebGL/three, необработанные исключения в useFrame — ничего из этого не
  // валит ни одну из проверок выше (канвас всё равно смонтирован, клики
  // всё равно проходят), но означает, что что-то в цикле рендера или
  // гидрации сломано.
  test.setTimeout(45_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });

  // Прокрутка через несколько станций и обратно — не только вниз до конца:
  // именно повторные события скролла и смена активной станции туда-обратно
  // раньше всего проявляли гидрационные расхождения и предупреждения WebGL.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  expect(consoleErrors, `ошибки в консоли: ${consoleErrors.join('; ')}`).toEqual([]);
  expect(pageErrors, `необработанные ошибки страницы: ${pageErrors.join('; ')}`).toEqual([]);
});

test('заголовок резюме физически лежит поверх канваса (z-index), не только под pointer-events', async ({
  page,
}) => {
  // После того как pointer-events: none на канвасе стал действующим (см.
  // тест выше), у z-index не осталось ни одного теста: если .scene-layer
  // всплывёт над main, непрозрачный канвас визуально закроет резюме, но
  // клик всё равно дойдёт до ссылки сквозь pointer-events: none — предыдущий
  // тест останется зелёным.
  //
  // document.elementFromPoint сам пропускает элементы с pointer-events: none
  // (тот же алгоритм хит-теста, что у click()) — наивная проверка «попадание
  // в центр заголовка возвращает элемент внутри main» была бы зелёной даже
  // при регрессии z-index: канвас с pointer-events: none просто не участвовал
  // бы в хит-тесте независимо от того, кто выше по стеку. Чтобы проверить
  // z-index изолированно от pointer-events, канвасу здесь временно (только в
  // памяти страницы, не в файле) выставляется pointer-events: auto — и уже
  // после этого выполняется хит-тест. Красный при поломке: временный подъём
  // z-index .scene-layer выше main в styles.css красит эту строку — см.
  // final-fix-report.md, мутация «z-index».
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });

  // R3F ставит <canvas> в DOM с дефолтным intrinsic-размером (300x150) и
  // растягивает его до размеров .scene-layer асинхронно, через
  // ResizeObserver — на следующем тике после монтирования, не в том же
  // кадре. Без этого ожидания канвас в момент хит-теста ниже покрывает
  // только левый верхний угол экрана, заголовок физически вне его области,
  // и тест был бы зелёным при любом z-index — не потому что резюме и правда
  // сверху, а потому что канвас ещё не дорос до размера вьюпорта.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const canvas = document.querySelector('.scene-layer canvas') as HTMLCanvasElement | null;
        return canvas ? Math.round(canvas.getBoundingClientRect().width) : 0;
      }),
    )
    .toBeGreaterThan(300);

  const hit = await page.evaluate(() => {
    const canvas = document.querySelector('.scene-layer canvas') as HTMLCanvasElement;
    const previousPointerEvents = canvas.style.pointerEvents;
    canvas.style.pointerEvents = 'auto';

    const heading = document.querySelector('h1')!;
    const rect = heading.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const element = document.elementFromPoint(x, y);

    canvas.style.pointerEvents = previousPointerEvents;

    return {
      isCanvas: element === canvas,
      insideMain: element != null && element.closest('main') != null,
      tag: element?.tagName ?? null,
    };
  });

  expect(hit.isCanvas, `хит-тест центра заголовка попал на канвас (tag=${hit.tag})`).toBe(false);
  expect(hit.insideMain, `хит-тест центра заголовка не попал внутрь main (tag=${hit.tag})`).toBe(
    true,
  );
});
