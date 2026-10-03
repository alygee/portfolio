import { defineConfig, devices } from '@playwright/test';

// Headless-браузер без GPU не даёт WebGL-контекста, поэтому 3D-слой в тестах не
// монтировался вовсе и его появление никто не проверял. swiftshader — программный
// рендерер: кадры считает процессор, но для страницы WebGL полноценный, и канвас
// становится наблюдаемым фактом.
const launchOptions = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Каждый воркер Chromium рендерит сцену программно (swiftshader), и с
  // рельефом кадр стоит ≈230 мс процессорного времени. Шесть воркеров на
  // 12 ядрах (дефолт — половина ядер) душат друг друга: закрытие контекста
  // не укладывалось в 30 с. Два — столько же, сколько получает раннер CI
  // (4 vCPU), так что локальный прогон повторяет условия деплоя.
  workers: 2,
  use: { baseURL: 'http://localhost:4173/portfolio/' },
  webServer: {
    // В CI dist/ уже собрана и проверена npm run check:size до запуска e2e —
    // пересобирать здесь означало бы деплоить не ту сборку, которую проверил
    // бюджет. Локально удобнее собирать самому по требованию.
    command: process.env.CI
      ? 'npm run preview -- --port 4173 --strictPort'
      : 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/portfolio/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
    // Firefox — второй движок. swiftshader-флаги выше относятся только к
    // Chromium; WebGL в headless Firefox зависит от окружения, поэтому тесты,
    // требующие смонтированной сцены (@scene), здесь не запускаются. Инвариант
    // гейта проверяется в любом случае — см. тест «тогда и только тогда».
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@scene/ },
  ],
});
