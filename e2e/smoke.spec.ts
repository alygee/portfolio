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

test('deep link выживает после первой прокрутки', async ({ page }) => {
  // Прогресс маршрута считается от позиций секций работ, поэтому позиция, в
  // которую браузер ставит секцию по хэшу, даёт ровно прогресс её станции.
  // Красный при поломке: если прогресс снова пойдёт от доли скролла всего
  // документа, первое же событие скролла перепишет хэш на другую станцию.
  await page.goto('#mplat');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, 12));
  await page.waitForTimeout(500);
  expect(new URL(page.url()).hash).toBe('#mplat');
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
  // Грубая проверка (отсутствие канваса) не различает причину: в headless-CI
  // без GPU канвас не смонтируется и без этого флага (detect-gpu вернёт
  // низкий tier). Поэтому дополнительно проверяем наблюдаемый и
  // GPU-независимый эффект именно prefers-reduced-motion: мост скролла
  // (useScrollProgress) в этом режиме идёт нативной веткой и не должен
  // запрашивать чанк lenis вообще.
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

test('без prefers-reduced-motion мост скролла грузит чанк lenis', async ({ browser }) => {
  // Симметричная пара к тесту выше: без неё проверка «lenis не грузится при
  // reducedMotion» была бы тривиально зелёной, если бы lenis перестал
  // подключаться вообще, независимо от флага. hasTouch/isMobile переопределены
  // явно: в мобильном проекте (coarse pointer) мост скролла тоже идёт
  // нативной веткой независимо от reducedMotion — здесь проверяется именно
  // ветка с Lenis, поэтому указатель принудительно «точный».
  const context = await browser.newContext({ hasTouch: false, isMobile: false });
  const page = await context.newPage();
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(requestedUrls.some((url) => url.includes('/assets/lenis-'))).toBe(true);
  await context.close();
});

test('нарушений доступности нет', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});
