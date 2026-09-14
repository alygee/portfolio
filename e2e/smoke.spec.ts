import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
  // перекрытие через z-index/DOM-порядок (подтверждено мутацией: подъём
  // z-index у .scene-layer выше main валит именно эту строку с этой самой
  // ошибкой). Ссылка открывается в новой вкладке — ждём событие popup как
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

  // Не вместо клика, а единственный способ поймать именно эту регрессию:
  // @react-three/fiber сам ставит inline pointer-events: auto на свой
  // внутренний wrapper-div (первый и единственный ребёнок .scene-layer,
  // 100% ширины и высоты) — inline-стиль всегда перебивает унаследованное
  // значение, поэтому что бы ни было написано в pointer-events у
  // .scene-layer, до канваса это не доходит вообще. Проверено мутацией:
  // .scene-layer { pointer-events: auto } не меняет исход ни клика по
  // ссылке (её по-прежнему защищает z-index main), ни hit-test в точке,
  // которую main не покрывает (там элементом всегда оказывается canvas,
  // с none и с auto одинаково). Иными словами, реальная защита от кликов
  // сегодня — это z-index main выше .scene-layer, а не pointer-events;
  // единственный способ заметить регрессию именно в этой CSS-декларации —
  // проверить её текст.
  await expect(page.locator('.scene-layer')).toHaveCSS('pointer-events', 'none');
});

test('прокрутка до конца доводит хэш до последней работы', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => new URL(page.url()).hash, { timeout: 10_000 }).toBe('#amazingcat');
});
