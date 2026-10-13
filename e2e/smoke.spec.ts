import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { palette } from '../src/shared/config/palette';

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

/**
 * Доля сэмплов, изменившихся сильнее шума. В зале кадр не стабилизируется
 * никогда (пульсирует «изучаю»), поэтому «изменился ли кадр» здесь — не
 * framesEqual, а сравнение доли изменившихся точек с фоном пульсации.
 */
function changedFraction(a: SceneFrame, b: SceneFrame): number {
  let changed = 0;
  let total = 0;
  for (let i = 0; i < a.length; i += SAMPLE_STEP) {
    total += 1;
    const diff =
      Math.abs(a.data[i]! - b.data[i]!) +
      Math.abs(a.data[i + 1]! - b.data[i + 1]!) +
      Math.abs(a.data[i + 2]! - b.data[i + 2]!);
    if (diff > FRAME_DIFF_THRESHOLD) changed += 1;
  }
  return changed / total;
}

/**
 * До конца документа — к стыковке; кнопка появляется при готовой сцене.
 * Прокручиваем сам документ и проверяем `toBeInViewport` ДО щелчка:
 * `locator.click()` молча прокручивает элемент в видимую область, и тест
 * проходил бы, пока посетитель до кнопки не дотянется.
 */
async function dockAtHall(page: Page) {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const button = page.getByRole('button', { name: 'Открыть зал навыков' });
  await expect(button).toBeVisible({ timeout: 20_000 });
  await expect(button).toBeInViewport();
  return button;
}

async function openHall(page: Page) {
  const button = await dockAtHall(page);
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Зал навыков' })).toBeVisible();
  return button;
}

/** Документ после закрытия зала: виден, не заблокирован и реально прокручивается. */
async function expectDocumentUsable(page: Page) {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('main')).toHaveCSS('opacity', '1');
  await expect(page.locator('html')).not.toHaveClass(/hall-open/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  // Настоящая прокрутка от пользователя (клавиша), а не window.scrollTo,
  // который работает и под overflow: hidden.
  // Нажатие повторяем: под нагрузкой первое может прийти раньше, чем
  // фокус вернулся на кнопку и документ снова прокручивается.
  const before = await page.evaluate(() => window.scrollY);
  await expect(async () => {
    await page.keyboard.press('PageUp');
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before);
  }).toPass({ timeout: 15_000 });
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

test('фон документа — цвет палитры, общей со сценой, и без JavaScript', async ({ browser }) => {
  // Фон сцены и фон документа задаются одной строкой palette.background.
  // Проверяется итог в браузере: если плагин палитры отключат или
  // переименуют переменную, у body пропадёт фон.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(palette.background.slice(i, i + 2), 16));
  await expect(page.locator('body')).toHaveCSS('background-color', `rgb(${r}, ${g}, ${b})`);
  await context.close();
});

test('сцена монтируется тогда и только тогда, когда браузер даёт WebGL', async ({ page }) => {
  // Инвариант гейта (спека §7, Р8), независимый от окружения: в Chromium со
  // swiftshader WebGL есть, и канвас обязан появиться; в браузере без WebGL
  // канваса быть не должно, а документ обязан остаться. Ветка записывается в
  // аннотацию, чтобы в отчёте было видно, что именно проверено в Firefox.
  await page.goto('/');
  const hasWebGL = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    return (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) !== null;
  });
  test.info().annotations.push({ type: 'webgl', description: String(hasWebGL) });

  if (hasWebGL) {
    await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  } else {
    await page.waitForTimeout(1500);
    await expect(page.locator('canvas')).toHaveCount(0);
  }
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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

test('3D-слой монтируется, и канвас ровно один', { tag: '@scene' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('канвас не перехватывает клики по ссылке резюме', { tag: '@scene' }, async ({ page, context }) => {
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

test('прокрутка до конца доводит хэш до зала навыков', { tag: '@scene' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => new URL(page.url()).hash, { timeout: 10_000 }).toBe('#skills');
});

test('сцена рисует не только фон: кадр канваса не одноцветный', { tag: '@scene' }, async ({ page }) => {
  // До swiftshader это было непроверяемо (WebGL недоступен в headless-CI без
  // GPU), а после — проверялось только «канвас есть в DOM», не «канвас что-то
  // нарисовал». Чёрный кадр или несобравшийся материал прошли бы предыдущую
  // проверку незамеченными. Красный при поломке: временное удаление станций и
  // рельефа из CareerScene.tsx (остаётся только фон) красит эту строку — см.
  // final-fix-report.md, мутация «пустая сцена».
  // Бюджет с запасом под программный рендерер: с рельефом (≈5000 столбиков)
  // swiftshader считает кадр ≈230 мс (4 fps против 60 без рельефа), и один
  // снимок канваса ждёт очередь кадров ≈6 с. Замер 2026-10-03; на GPU
  // посетителя это не переносится — CI проверяет кадр, а не частоту кадров.
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });

  const frame = await withHiddenResumeText(page, () => waitForStableFrame(page));

  expect(isMonochrome(frame), 'кадр канваса одноцветный — рельеф и станции не нарисовались').toBe(
    false,
  );
});

test('камера движется: кадр у последней станции отличается от начального', { tag: '@scene' }, async ({ page }) => {
  // Юнит-тесты CameraRig двигают камеру через @react-three/test-renderer —
  // фейковый рендерер, который ничего не рисует. Замёрзшая камера (например,
  // если camera.position.copy перестанет вызываться) прошла бы их и все
  // остальные e2e незамеченной: канвас по-прежнему один, клики по-прежнему
  // проходят, хэш по-прежнему меняется (он читается из progressStore
  // независимо от того, применяет ли CameraRig это значение к камере). Этот
  // тест — единственный, что смотрит на сам кадр. Красный при поломке:
  // временное отключение camera.position.copy в CameraRig.tsx красит эту
  // строку — см. final-fix-report.md, мутация «замёрзшая камера».
  // У зала (конец документа) галактика вращается и кадр не стабилизируется
  // никогда, поэтому второй кадр берётся у последней станции — там сцена
  // неподвижна (spin.ts: в полёте зал стоит).
  // Бюджет с запасом под программный рендерер: с рельефом (≈5000 столбиков)
  // swiftshader считает кадр ≈230 мс (4 fps против 60 без рельефа), и один
  // снимок канваса ждёт очередь кадров ≈6 с. Замер 2026-10-03; на GPU
  // посетителя это не переносится — CI проверяет кадр, а не частоту кадров.
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });

  const { start, end } = await withHiddenResumeText(page, async () => {
    const start = await waitForStableFrame(page);
    await page.evaluate(() => document.getElementById('amazingcat')!.scrollIntoView());
    const end = await waitForStableFrame(page);
    return { start, end };
  });

  expect(
    framesEqual(start, end),
    'кадр не изменился (в пределах допуска) после прокрутки в конец — камера не сдвинулась',
  ).toBe(false);
});

test('за время загрузки и прокрутки консоль и страница не сообщают об ошибках', { tag: '@scene' }, async ({
  page,
}) => {
  // Закрывает целый класс невидимых отказов: расхождение гидрации, ворнинги
  // WebGL/three, необработанные исключения в useFrame — ничего из этого не
  // валит ни одну из проверок выше (канвас всё равно смонтирован, клики
  // всё равно проходят), но означает, что что-то в цикле рендера или
  // гидрации сломано.
  // Бюджет с запасом под программный рендерер: с рельефом (≈5000 столбиков)
  // swiftshader считает кадр ≈230 мс (4 fps против 60 без рельефа), и один
  // снимок канваса ждёт очередь кадров ≈6 с. Замер 2026-10-03; на GPU
  // посетителя это не переносится — CI проверяет кадр, а не частоту кадров.
  test.setTimeout(120_000);
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

test('заголовок резюме физически лежит поверх канваса (z-index), не только под pointer-events', { tag: '@scene' }, async ({
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

test('кнопка зала есть тогда и только тогда, когда браузер даёт WebGL', async ({ page }) => {
  test.setTimeout(90_000); // в полном прогоне Firefox рисует программно и под нагрузкой поднимает сцену дольше 20 с
  // Все проекты, включая Firefox без WebGL: там кнопки быть не должно, а
  // раздел навыков со статусами обязан остаться полным.
  await page.goto('/');
  const hasWebGL = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    return (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) !== null;
  });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const button = page.getByRole('button', { name: 'Открыть зал навыков' });
  if (hasWebGL) {
    await expect(button).toBeVisible({ timeout: 45_000 });
  } else {
    await page.waitForTimeout(1500);
    await expect(button).toHaveCount(0);
  }
  await expect(page.locator('#skills')).toContainText('изучаю');
  await expect(page.locator('#skills')).toContainText('Что я переношу в ML');
});

test('зал: документ гаснет, канвас ловит указатель, прокрутка стоит; Esc всё возвращает', { tag: '@scene' }, async ({ page }) => {
  test.setTimeout(120_000);
  const button = await dockAtHall(page);
  const canvas = page.locator('.scene-layer canvas');
  // touch-action не наследуется, а R3F кладёт проп style на обёртку вокруг
  // канваса; действующее значение для касаний складывается по предкам.
  const canvasWrapper = page.locator('.scene-layer > div').first();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  await expect(canvasWrapper).toHaveCSS('touch-action', 'auto');

  await button.click();
  await expect(page.getByRole('button', { name: 'Закрыть' })).toBeFocused();
  // Щелчок по кнопке, уже лежащей во вьюпорте, не должен сдвигать документ.
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await expect(page.locator('main')).toHaveCSS('visibility', 'hidden', { timeout: 15_000 });
  await expect(canvas).toHaveCSS('pointer-events', 'auto');
  await expect(canvasWrapper).toHaveCSS('touch-action', 'none');
  // Пользовательская прокрутка (клавиатура) заблокирована overflow: hidden.
  await page.keyboard.press('PageUp');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCSS('visibility', 'visible');
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  await expect(canvasWrapper).toHaveCSS('touch-action', 'auto');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, 0);
  await expect(button).toBeFocused();
});

test('«назад» закрывает зал и не уводит со страницы', { tag: '@scene' }, async ({ page }) => {
  test.setTimeout(120_000);
  await openHall(page);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCSS('visibility', 'visible');
  expect(new URL(page.url()).hash).toBe('#skills');
});

for (const path of ['Esc', 'кнопка «Закрыть»', '«назад»'] as const) {
  test(`закрытие зала: ${path} возвращает видимый прокручиваемый документ на то же место`, { tag: '@scene' }, async ({ page }) => {
    test.setTimeout(120_000);
    await openHall(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    if (path === 'Esc') await page.keyboard.press('Escape');
    else if (path === '«назад»') await page.goBack();
    else await page.getByRole('button', { name: 'Закрыть' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, 0);
    await expectDocumentUsable(page);
  });
}

test('щелчок по узлу открывает его карточку', { tag: '@scene' }, async ({ page }) => {
  // Луч R3F считается синхронно на событии указателя — кадр для этого не
  // нужен, поэтому перебор точек быстрый даже под swiftshader. Полоса по
  // центру — вне панелей оверлея (сверху — «Закрыть», снизу — карточка).
  // Область «Выбранный узел» есть всегда (с подсказкой), так что признак
  // выбора — заголовок h3 с названием узла, а не видимость области.
  test.setTimeout(120_000);
  await openHall(page);
  const box = (await page.locator('.scene-layer canvas').boundingBox())!;
  const title = page.getByRole('region', { name: 'Выбранный узел' }).getByRole('heading', { level: 3 });
  await expect(title).toHaveCount(0);
  let found = false;
  for (let row = 9; row <= 21 && !found; row += 1) {
    for (let col = 3; col <= 27 && !found; col += 1) {
      await page.mouse.click(box.x + (box.width * col) / 30, box.y + (box.height * row) / 30);
      found = (await title.count()) > 0;
    }
  }
  expect(found, 'ни один щелчок по сетке точек не попал в узел').toBe(true);
  await expect(title).not.toHaveText('');
});

test('стрелки перебирают узлы, ссылка «где применён» ведёт к станции', { tag: '@scene' }, async ({ page }) => {
  test.setTimeout(120_000);
  await openHall(page);
  await page.keyboard.press('ArrowRight');
  const card = page.getByRole('region', { name: 'Выбранный узел' });
  await expect(card.getByRole('heading', { level: 3 })).toHaveText('TypeScript');
  const link = card.getByRole('link').first();
  const href = (await link.getAttribute('href'))!;
  expect(href).toMatch(/^#/);
  await link.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator(href)).toBeInViewport({ timeout: 10_000 });
  await expect(page.locator('main')).toHaveCSS('visibility', 'visible');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
});

test('в открытом зале нарушений доступности нет', { tag: '@scene' }, async ({ page }) => {
  test.setTimeout(120_000);
  await openHall(page);
  // Документ гаснет 0,3 с: на полупрозрачном тексте axe видит ложный
  // недостаток контраста, а к моменту проверки он уже скрыт от читателей.
  await expect(page.locator('main')).toHaveCSS('visibility', 'hidden', { timeout: 15_000 });
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test('у стыковки зал нарисован и вращается', { tag: '@scene' }, async ({ page }) => {
  // Мутация «зала нет» (убрать <SkillHall /> из SceneLayer) делает два кадра
  // у стыковки одинаковыми: камера неподвижна, рельеф статичен.
  test.setTimeout(120_000);
  await dockAtHall(page);
  const { first, second } = await withHiddenResumeText(page, async () => {
    await page.waitForTimeout(6000); // камера доворачивает взгляд (stepCamera, 4/с)
    const first = await readSceneFrame(page);
    await page.waitForTimeout(2000);
    return { first, second: await readSceneFrame(page) };
  });
  expect(isMonochrome(second)).toBe(false);
  expect(framesEqual(first, second), 'кадр у стыковки не меняется — зал не вращается или не нарисован').toBe(false);
});

test('перетаскивание вращает зал', { tag: '@scene' }, async ({ page }) => {
  test.setTimeout(120_000);
  await openHall(page);
  const box = (await page.locator('.scene-layer canvas').boundingBox())!;
  await page.waitForTimeout(2000);
  const before = await readSceneFrame(page);
  await page.waitForTimeout(1000);
  const idle = await readSceneFrame(page);
  const background = changedFraction(before, idle); // только пульсация «изучаю»

  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.3, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1500); // инерция гаснет (SPIN.damping = 3/с)
  const after = await readSceneFrame(page);

  // Зал занимает часть широкого десктопного кадра: на практике поворот
  // меняет 4% сэмплов на desktop и 10% на mobile при фоне 0, поэтому порог 2%.
  expect(changedFraction(idle, after)).toBeGreaterThan(Math.max(0.02, background * 3));
});

test('касание вне зала не перехватывается канвасом (mobile)', { tag: '@scene' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'нужен сенсорный проект');
  test.setTimeout(120_000);
  await dockAtHall(page);
  const canvas = page.locator('.scene-layer canvas');
  const canvasWrapper = page.locator('.scene-layer > div').first();
  await expect(canvasWrapper).toHaveCSS('touch-action', 'auto');
  await expect(canvas).toHaveCSS('pointer-events', 'none');

  // Хит-тест по сетке: ни одна точка экрана не отдаёт касание канвасу.
  const hitCanvas = await page.evaluate(() => {
    const target = document.querySelector('.scene-layer canvas');
    for (let row = 1; row < 10; row += 1) {
      for (let col = 1; col < 10; col += 1) {
        const element = document.elementFromPoint((innerWidth * col) / 10, (innerHeight * row) / 10);
        if (element === target) return true;
      }
    }
    return false;
  });
  expect(hitCanvas, 'касание попадает в канвас вне режима исследования').toBe(false);

  // Настоящий жест: свайп вниз по документу прокручивает его вверх.
  const before = await page.evaluate(() => window.scrollY);
  const cdp = await page.context().newCDPSession(page);
  const x = 200;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 300 }] });
  for (let step = 1; step <= 10; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 300 + step * 30 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before);
});
