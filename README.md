# Портфолио

https://alygee.github.io/portfolio/

Персональный сайт-портфолио. Контент резюме живёт в `src/content/` и служит
источником правды для двух проекций: статического HTML-документа и 3D-сцены.

- Дизайн: `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md`
- План фаз 0-1: `docs/superpowers/plans/2026-09-13-portfolio-phases-0-1.md`

```bash
npm install
npm run dev         # разработка
npm test            # тесты
npm run build       # сборка + предрендер в dist/
npm run check:size  # бюджет главного чанка (<=100 КБ gzip, без three)
npm run e2e         # smoke-тесты в браузере (Playwright)
```

## Состояние

- Фаза 0 — сайт-резюме, предрендер, деплой: готово.
- Фаза 1 — скролл ведёт камеру по маршруту мимо четырёх станций: готово.
- Дальше по спеке: фаза 2 (среда сцены), фаза 3 (граф навыков),
  фаза 4 (GLSL), фаза 5 (постпроцессинг).
