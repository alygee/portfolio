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
  // тогда и только тогда, когда канвас действительно смонтирован. В
  // headless-CI сцена обычно не монтируется (WebGL недоступен без реального
  // GPU-рендерера), и раньше здесь всё равно качались 5.3 КБ, а нативная
  // физика прокрутки подменялась rAF-циклом без визуального выигрыша.
  // Указатель задан точным: на грубом указателе инерция не перехватывается
  // независимо от сцены.
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
