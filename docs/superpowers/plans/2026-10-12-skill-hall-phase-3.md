# Зал навыков (фаза 3): траектория из веба в ML — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Финальная точка маршрута — зал навыков: граф «навыки ↔ работы/проекты» с мостами из веба в ML, статусами «применён / изучаю / в плане», выводимыми из доказательств, и режимом исследования (вращение, выбор узла лучом, карточка) — при полной HTML-проекции того же самого.

**Architecture:** Чистые функции без `three` в `entities` — геометрия маршрута и зала, статус навыка, граф, раскладка, редьюсер режимов сцены со стором. Фича `skill-galaxy`: главный чанк (кнопка «Открыть зал», блокировка документа) и ленивое поддерево `scene/` (инстансы узлов, рёбра, вращение, карточка). Канвас поднимается в слой `widgets/scene`, который собирает обе фичи. Камера в зале стоит в точке стыковки, вращается сама галактика — поле рельефа не растёт.

**Tech Stack:** React 19.2.8, TypeScript 7.0.2, Vite 8, @react-three/fiber 9.7, @react-three/drei 10.7, three 0.186, zustand 5, Vitest 5, @react-three/test-renderer, Testing Library, Playwright 1.63 (Chromium + swiftshader, Firefox), Oxlint 1.83. Новых зависимостей нет.

**Spec:** `docs/superpowers/specs/2026-10-12-skill-hall-design.md` (главный документ фазы); родительская — `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md`.

## Global Constraints

- Весь пользовательский текст, комментарии, названия тестов и сообщения коммитов — на русском (английские названия технологий — норма).
- TDD: тест пишется до реализации, шаг «убедиться, что падает» выполняется по-настоящему. **Каждый новый тест доказывается мутацией**: сломать реализацию, увидеть красный, вернуть. В проекте уже находили десять тестов, неспособных упасть.
- Облегчённый FSD: слои `app / widgets / features / entities / content / shared`. Фича не импортирует другую фичу и не импортирует виджет; виджет может импортировать фичи.
- `three` — только в каталогах `src/features/*/scene/**` и `src/widgets/scene/**`. Всё, что в `entities`, `shared`, `content` и вне `scene/` у фич, — без `three` (главный чанк).
- Главный чанк ≤ 100 КБ gzip; ленивые чанки вместе ≤ 300 КБ gzip (`npm run check:size`).
- `leva` в продакшен-сборке отсутствует.
- Сайт полезен без JavaScript, без WebGL и при `prefers-reduced-motion: reduce`; всё, что есть в зале, есть и в HTML (Р1/Р2).
- «Применён» нельзя объявить, только заработать: статус выводится из `stack` работ и проектов (спека З2, К1–К2).
- Шапка документа («Senior Frontend Developer») не меняется (З7).
- Камера в `docked`/`exploring` не покидает точку стыковки; `MAX_TERRAIN_INSTANCES` (6000) не повышать.
- Не `display: none` для `main` — только `visibility: hidden` (иначе схлопнется высота документа).
- React запинен на 19.2.8; `--legacy-peer-deps` запрещён; только npm.
- Не добавлять `preserveDrawingBuffer` в `<Canvas>`. Не подавлять правила Oxlint вместо разбора.
- `.obsidian/`, `HANDOFF.md` и прочие неотслеживаемые файлы в `docs/` (`ml-*.md`, `plan-90-dney.md`, `strategiya-prodvizheniya.md`), `resume.txt`, `*.deb` не коммитить: `git add` только перечисленных в шаге файлов.
- Каждый коммит заканчивается строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Полный прогон перед каждым коммитом, если шаг не говорит иное: `npm run lint && npm run typecheck && npx vitest run`.

## Review Focus

1. **Документ остаётся заблокированным.** Зал закрыт любым путём — Esc, кнопка «Закрыть», «назад», ссылка на станцию, падение сцены — а `html.hall-open` или `overflow: hidden` остались: посетитель видит пустой экран без прокрутки. Ожидание: любой путь закрытия возвращает видимый документ, прокрутку и прежнюю позицию. Закрепляется тестами `useHallDocument` (Task 10), реакцией редьюсера на `sceneReady(false)` (Task 5), `ErrorBoundary.onError` (Task 7) и e2e (Task 12).
2. **Расхождение гидрации.** Кнопка «Открыть зал» или метки статусов отрисованы на клиенте иначе, чем в предрендере. Ожидание: SSR и первый клиентский рендер совпадают (кнопки нет: `sceneReady` ложен на сервере). Закрепляется тестом `renderToString` в Task 10 и существующим e2e «консоль чиста».
3. **Дребезг или недостижимость стыковки.** Прогресс колеблется у 1 — режим скачет; или секция «Навыки» не доскролливается — режим `docked` недостижим. Ожидание: гистерезис и стыковка в конце документа. Закрепляется тестами редьюсера (Task 5) и e2e «прокрутка до конца → кнопка видна» (Task 12).
4. **Перетаскивание засчитано кликом.** Отпускание пальца после вращения выбирает случайный узел. Ожидание: выбор только при смещении ≤ `CLICK_SLOP`. Закрепляется тестом `NodeInstances` в Task 11.
5. **Тач вне зала.** Канвас перехватывает касание и ломает прокрутку на телефоне. Ожидание: вне `exploring` у канваса `pointer-events: none` и `touch-action: auto`; внутри — `auto` и `none`. Закрепляется e2e на проекте `mobile` (Task 12).

---

### Task 1: Геометрия маршрута в `entities` и якорь «Навыки»

Маршрут получает пятую путевую точку — стыковку зала, а документ — пятый якорь прогресса `#skills`. Математика путевых точек переезжает из `career-flight/scene/route.ts` (тянет `three`) в `entities/route/geometry.ts` (без `three`): центр зала нужен и `career-flight`, и `skill-galaxy`, а импорт между фичами запрещён.

**Files:**
- Create: `src/shared/lib/vec3.ts`, `src/shared/lib/vec3.test.ts`
- Create: `src/entities/route/geometry.ts`, `src/entities/route/geometry.test.ts`
- Create: `src/entities/route/anchors.ts`, `src/entities/route/anchors.test.ts`
- Create: `src/features/career-flight/scene/hallPlacement.test.ts`
- Modify: `src/features/career-flight/scene/route.ts`, `route.test.ts`
- Modify: `src/features/career-flight/useStationHash.ts`, `useStationHash.test.ts`
- Modify: `src/features/scroll-bridge/useScrollProgress.ts`, `useScrollProgress.test.ts`
- Modify: `src/features/resume-document/ResumeDocument.tsx`
- Modify: `src/app/displayOrder.test.tsx`, `src/app/App.test.tsx`
- Modify: `src/entities/route/progress.ts` (только комментарий)
- Modify: `e2e/smoke.spec.ts` (тест «прокрутка до конца»)

**Interfaces:**
- Produces: `type Vec3 = { readonly x: number; readonly y: number; readonly z: number }`, `distance(a: Vec3, b: Vec3): number`, `length(v: Vec3): number` — `@/shared/lib/vec3`.
- Produces: `STATION_SPACING = 22`, `STATION_RISE = 2.5`, `HALL_CLIMB = 0.78`, `HALL_DOCK_DISTANCE = 26`, `HALL_RADIUS = 11`, `stationWaypoint(i): Vec3`, `hallDock(stationCount): Vec3`, `hallCenter(stationCount): Vec3`, `routeWaypoints(stationCount): Vec3[]` — `@/entities/route/geometry`.
- Produces: `HALL_ANCHOR_ID = 'skills'`, `ROUTE_ANCHOR_IDS: readonly string[]`, `ROUTE_WAYPOINTS: readonly Vec3[]`, `HALL_DOCK: Vec3`, `HALL_CENTER: Vec3` — `@/entities/route/anchors`.
- Produces: `HALL_DOCK_POINT: Vector3`, `HALL_CENTER_POINT: Vector3`, `buildRoute(points: readonly Vec3[])` — `career-flight/scene/route.ts`.

- [ ] **Step 1: Написать падающие тесты `vec3`, `geometry`, `anchors`**

`src/shared/lib/vec3.test.ts`:

```ts
import { distance, length } from './vec3';

describe('vec3', () => {
  it('distance — евклидово расстояние', () => {
    expect(distance({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBe(5);
  });

  it('length — длина вектора', () => {
    expect(length({ x: 0, y: 3, z: 4 })).toBe(5);
  });
});
```

`src/entities/route/geometry.test.ts`:

```ts
import { distance } from '@/shared/lib/vec3';
import {
  HALL_DOCK_DISTANCE,
  STATION_SPACING,
  hallCenter,
  hallDock,
  routeWaypoints,
  stationWaypoint,
} from './geometry';

describe('геометрия маршрута', () => {
  it('путевые точки станций — прежние: синус по X, подъём и шаг по Z', () => {
    // Значения фазы 1: перенос из route.ts не должен сдвинуть станции.
    expect(stationWaypoint(0)).toEqual({ x: 0, y: 0, z: -0 });
    const second = stationWaypoint(2);
    expect(second.x).toBeCloseTo(Math.sin(1.8) * 3, 10);
    expect(second.y).toBe(5);
    expect(second.z).toBe(-44);
  });

  it('шаг до стыковки равен шагу между станциями', () => {
    // stationProgress равномерен по индексу; длинный последний сегмент
    // развёл бы прогресс по индексу и по длине дуги, и камера перестала бы
    // останавливаться у станций (инвариант route.test.ts).
    const step = distance(stationWaypoint(3), hallDock(4));
    expect(step).toBeGreaterThan(STATION_SPACING - 0.5);
    expect(step).toBeLessThan(STATION_SPACING + 0.5);
  });

  it('стыковка выше и дальше последней станции', () => {
    const last = stationWaypoint(3);
    const dock = hallDock(4);
    expect(dock.y).toBeGreaterThan(last.y);
    expect(dock.z).toBeLessThan(last.z);
  });

  it('центр зала — на HALL_DOCK_DISTANCE дальше стыковки, на её высоте', () => {
    const dock = hallDock(4);
    const center = hallCenter(4);
    expect(center.y).toBe(dock.y);
    expect(dock.z - center.z).toBe(HALL_DOCK_DISTANCE);
    expect(distance(dock, center)).toBe(HALL_DOCK_DISTANCE);
  });

  it('путевые точки: станции, затем стыковка', () => {
    const points = routeWaypoints(4);
    expect(points).toHaveLength(5);
    expect(points[4]).toEqual(hallDock(4));
    expect(points[1]).toEqual(stationWaypoint(1));
  });

  it('без станций стыковка считается от начала координат, без NaN', () => {
    const dock = hallDock(0);
    expect(Number.isFinite(dock.x + dock.y + dock.z)).toBe(true);
  });
});
```

`src/entities/route/anchors.test.ts`:

```ts
import { displayJobs } from '@/content';
import { HALL_ANCHOR_ID, ROUTE_ANCHOR_IDS, ROUTE_WAYPOINTS } from './anchors';

describe('якоря маршрута', () => {
  it('секции работ в порядке отображения, затем «Навыки»', () => {
    expect(ROUTE_ANCHOR_IDS).toEqual([...displayJobs.map((job) => job.id), HALL_ANCHOR_ID]);
  });

  it('у каждого якоря своя путевая точка', () => {
    expect(ROUTE_WAYPOINTS).toHaveLength(ROUTE_ANCHOR_IDS.length);
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/shared/lib/vec3.test.ts src/entities/route/geometry.test.ts src/entities/route/anchors.test.ts`
Expected: FAIL — модулей `./vec3`, `./geometry`, `./anchors` нет.

- [ ] **Step 3: Реализация**

`src/shared/lib/vec3.ts`:

```ts
/**
 * Вектор без `three`: им пользуются чистые функции главного чанка
 * (`entities/route`, `entities/skill`). В ленивом чанке он переводится в
 * `Vector3` одной строкой.
 */
export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}
```

`src/entities/route/geometry.ts`:

```ts
import type { Vec3 } from '@/shared/lib/vec3';

/**
 * Путевые точки маршрута и положение зала — чистая математика без `three`.
 * Нужна двум фичам сразу: `career-flight` строит по ней кривую камеры,
 * `skill-galaxy` ставит зал в его центр. Импорт между фичами запрещён, а
 * `career-flight/scene/route.ts` тянет `three`, поэтому формулы живут здесь.
 */
export const STATION_SPACING = 22;
export const STATION_RISE = 2.5;

/** Угол подъёма от последней станции к стыковке, рад. */
export const HALL_CLIMB = 0.78;
/** От точки стыковки до центра зала. */
export const HALL_DOCK_DISTANCE = 26;
/** Все узлы зала лежат внутри сферы этого радиуса (инвариант раскладки). */
export const HALL_RADIUS = 11;

/** Точка маршрута, с которой видна станция с этим индексом. */
export function stationWaypoint(index: number): Vec3 {
  return { x: Math.sin(index * 0.9) * 3, y: index * STATION_RISE, z: -index * STATION_SPACING };
}

/**
 * Стыковка — последняя точка маршрута: шаг длиной `STATION_SPACING` вверх и
 * вперёд от последней станции. Длина шага та же, что между станциями: иначе
 * прогресс, равномерный по индексу, разошёлся бы с длиной дуги.
 */
export function hallDock(stationCount: number): Vec3 {
  const last = stationCount > 0 ? stationWaypoint(stationCount - 1) : { x: 0, y: 0, z: 0 };
  return {
    x: 0,
    y: last.y + STATION_SPACING * Math.sin(HALL_CLIMB),
    z: last.z - STATION_SPACING * Math.cos(HALL_CLIMB),
  };
}

/** Центр зала — прямо по курсу от стыковки, на её высоте. */
export function hallCenter(stationCount: number): Vec3 {
  const dock = hallDock(stationCount);
  return { x: dock.x, y: dock.y, z: dock.z - HALL_DOCK_DISTANCE };
}

/** Путевые точки маршрута: станции по порядку, затем стыковка. */
export function routeWaypoints(stationCount: number): Vec3[] {
  return [
    ...Array.from({ length: stationCount }, (_, index) => stationWaypoint(index)),
    hallDock(stationCount),
  ];
}
```

`src/entities/route/anchors.ts`:

```ts
import { displayJobs } from '@/content';
import { hallCenter, hallDock, routeWaypoints } from './geometry';

/** Секция «Навыки» в документе и последний якорь маршрута. */
export const HALL_ANCHOR_ID = 'skills';

/**
 * Якоря маршрута сверху вниз по документу: секции работ (`displayJobs`), затем
 * «Навыки». Индекс якоря = индекс путевой точки = индекс для хэша. Единственный
 * источник этого списка: мост скролла, синхронизация с хэшем и кривая камеры
 * читают его отсюда, иначе они снова разъедутся.
 */
export const ROUTE_ANCHOR_IDS: readonly string[] = [
  ...displayJobs.map((job) => job.id),
  HALL_ANCHOR_ID,
];

export const ROUTE_WAYPOINTS = routeWaypoints(displayJobs.length);
export const HALL_DOCK = hallDock(displayJobs.length);
export const HALL_CENTER = hallCenter(displayJobs.length);
```

- [ ] **Step 4: Тесты зелёные**

Run: `npx vitest run src/shared/lib/vec3.test.ts src/entities/route/geometry.test.ts src/entities/route/anchors.test.ts`
Expected: PASS.

- [ ] **Step 5: Перевести `route.ts` на `entities`**

Заменить начало `src/features/career-flight/scene/route.ts` (импорты, константы, `cameraWaypoint`, `buildRoute`, `route`) так, чтобы файл выглядел так (`stationPosition`, комментарий к `route` и `progressToCamera` остаются как есть):

```ts
import { CatmullRomCurve3, Vector3 } from 'three';
import { HALL_CENTER, HALL_DOCK, ROUTE_WAYPOINTS } from '@/entities/route/anchors';
import { stationWaypoint } from '@/entities/route/geometry';
import type { Vec3 } from '@/shared/lib/vec3';
import { clamp01 } from '@/shared/lib/math';

/** Насколько далеко вперёд по маршруту смотрит камера. */
export const LOOK_AHEAD = 8;

const STATION_SIDE_OFFSET = 6;
/** Ребро куба станции. Рельеф (terrain/) держит площадку под станцией ниже её основания. */
export const STATION_SIZE = 3;

const toVector = (point: Vec3) => new Vector3(point.x, point.y, point.z);

/** Точка маршрута, с которой видна станция с этим индексом. */
export function cameraWaypoint(index: number): Vector3 {
  return toVector(stationWaypoint(index));
}

/** Сама станция стоит сбоку от маршрута, чтобы камера пролетала мимо, а не сквозь. */
export function stationPosition(index: number): Vector3 {
  const side = index % 2 === 0 ? 1 : -1;
  return cameraWaypoint(index).add(new Vector3(side * STATION_SIDE_OFFSET, 0, 0));
}

export function buildRoute(points: readonly Vec3[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(points.map(toVector), false, 'catmullrom', 0.5);
}

/** (комментарий о модульном синглтоне — без изменений) */
export const route = buildRoute(ROUTE_WAYPOINTS);

/** Стыковка зала — конец маршрута; камера в `docked`/`exploring` стоит здесь. */
export const HALL_DOCK_POINT = toVector(HALL_DOCK);
/** Центр зала — точка, на которую смотрит камера в `docked`/`exploring`. */
export const HALL_CENTER_POINT = toVector(HALL_CENTER);
```

В `src/entities/route/progress.ts` в комментарии к `stationProgress` слова «шагом между станциями (`STATION_SPACING` = 22)» и «в `cameraWaypoint`» заменить на «шагом между путевыми точками (`STATION_SPACING` = 22, `entities/route/geometry.ts`; шаг до стыковки зала той же длины)» и «в `stationWaypoint`».

- [ ] **Step 6: Перевести потребителей на `ROUTE_ANCHOR_IDS`**

`src/features/career-flight/useStationHash.ts` — убрать импорт `displayJobs`, добавить `import { ROUTE_ANCHOR_IDS } from '@/entities/route/anchors';`, заменить объявление `IDS`:

```ts
/** Порядок тот же, что у секций документа и путевых точек: см. `ROUTE_ANCHOR_IDS`. */
const IDS = ROUTE_ANCHOR_IDS;
```

`src/features/scroll-bridge/useScrollProgress.ts` — то же для `SECTION_IDS`:

```ts
import { ROUTE_ANCHOR_IDS } from '@/entities/route/anchors';
// …
/** Порядок тот же, что у путевых точек маршрута: см. `ROUTE_ANCHOR_IDS`. */
const SECTION_IDS = ROUTE_ANCHOR_IDS;
```

В JSDoc `sectionsToProgress` (`src/features/scroll-bridge/scrollProgress.ts`) фразу «шапка, «Навыки» и «Образование» станциями не являются» заменить на «шапка и «Образование» якорями не являются (якоря — секции работ и «Навыки», см. `ROUTE_ANCHOR_IDS`)».

`src/features/resume-document/ResumeDocument.tsx` — заменить

```tsx
      <h2>Навыки</h2>
      <SkillList />
```

на

```tsx
      {/*
        Последний якорь маршрута (`HALL_ANCHOR_ID`): секция в точке обзора —
        камера у зала навыков. id совпадает с `ROUTE_ANCHOR_IDS`, это
        закреплено тестом `displayOrder.test.tsx`.
      */}
      <section id="skills" aria-labelledby="skills-heading">
        <h2 id="skills-heading">Навыки</h2>
        <SkillList />
      </section>
```

- [ ] **Step 7: Обновить существующие тесты под пять якорей**

`src/features/career-flight/scene/route.test.ts`:
- заменить `import { jobs } from '@/content';` на `import { jobs } from '@/content';\nimport { ROUTE_ANCHOR_IDS } from '@/entities/route/anchors';`;
- в тесте «камера останавливается рядом со станцией в её прогрессе» заменить `stationProgress(i, COUNT)` на `stationProgress(i, ROUTE_ANCHOR_IDS.length)`;
- добавить в `describe('привязка камеры к станциям')`:

```ts
  it('в конце маршрута камера у стыковки зала', () => {
    const { position } = progressToCamera(1);
    expect(position.distanceTo(HALL_DOCK_POINT)).toBeLessThan(1e-6);
  });
```

и добавить `HALL_DOCK_POINT` в импорт из `./route`.

`src/features/career-flight/useStationHash.test.ts`: заменить `import { displayJobs } from '@/content';` на `import { ROUTE_ANCHOR_IDS } from '@/entities/route/anchors';`; в трёх местах `displayJobs.length` → `ROUTE_ANCHOR_IDS.length`; `displayJobs.findIndex((job) => job.id === 'mplat')` → `ROUTE_ANCHOR_IDS.indexOf('mplat')`; `` `#${displayJobs[1]!.id}` `` → `` `#${ROUTE_ANCHOR_IDS[1]}` ``.

`src/features/scroll-bridge/useScrollProgress.test.ts`: `SECTION_IDS` — из `ROUTE_ANCHOR_IDS` (импорт как выше, `displayJobs` убрать); `const SECTION_OFFSETS = [400, 1400, 2400, 3400, 4400];`; комментарий над ним — «Секции работ и «Навыки» по 1000 px, дальше хвост страницы: «Образование».». Если какой-то тест задаёт `scrollHeight` меньше `4400 + innerHeight`, последний якорь поджимается к пределу — это ожидаемое поведение `sectionsToProgress`, ассерты по индексам 0–3 от него не зависят; ассерт по последнему индексу (если есть) пересчитать от `stationProgress(4, COUNT)`.

`src/app/displayOrder.test.tsx`: импорт `ROUTE_ANCHOR_IDS`; тест «порядок секций документа совпадает с порядком отображения из контента» переименовать в «секции-якоря документа совпадают с якорями маршрута» и ожидать `toEqual(ROUTE_ANCHOR_IDS)`; комментарий — «Связывает фактический DOM с `ROUTE_ANCHOR_IDS` — тем же списком, по которому строится кривая камеры и пишется хэш». Импорт `displayJobs` удалить, если больше не используется.

`src/app/App.test.tsx`: `stationProgress(index, displayJobs.length)` → `stationProgress(ROUTE_ANCHOR_IDS.indexOf('mplat'), ROUTE_ANCHOR_IDS.length)`, строку с `findIndex` удалить, импорт `displayJobs` заменить импортом `ROUTE_ANCHOR_IDS`.

- [ ] **Step 8: Тесты зала в мире**

`src/features/career-flight/scene/hallPlacement.test.ts`:

```ts
import { HALL_CENTER, HALL_DOCK } from '@/entities/route/anchors';
import { HALL_RADIUS } from '@/entities/route/geometry';
import { distance } from '@/shared/lib/vec3';
import { DEFAULT_SCENE_CONFIG } from './sceneConfig';
import { TERRAIN } from './terrain/layout';
import { terrainColumns } from './terrain/terrainData';

describe('зал в мире', () => {
  it('висит над рельефом: нижняя точка выше любого столбика под ним', () => {
    const bottom = HALL_CENTER.y - HALL_RADIUS;
    const below = terrainColumns.filter(
      (column) => Math.hypot(column.x - HALL_CENTER.x, column.z - HALL_CENTER.z) < HALL_RADIUS + TERRAIN.cell,
    );
    expect(below.length).toBeGreaterThan(0);
    for (const column of below) {
      expect(TERRAIN.groundY + column.height).toBeLessThan(bottom);
    }
  });

  it('дальний край зала из точки стыковки не тонет в тумане', () => {
    // Узлы на дальней стороне сферы зала дальше всего от камеры. Туман
    // линейный от near до far; к середине интервала узел теряет половину
    // контраста — дальше «в плане» (уже смешанный с фоном) пропадёт совсем.
    const { near, far } = DEFAULT_SCENE_CONFIG.fog;
    const farthest = distance(HALL_DOCK, HALL_CENTER) + HALL_RADIUS;
    expect(farthest).toBeLessThan(near + (far - near) / 2);
  });
});
```

- [ ] **Step 9: Прогнать всё и разобрать падения**

Run: `npx vitest run`
Expected: PASS. Возможные падения и что с ними делать:
- `route.test.ts` «камера останавливается рядом со станцией» — кривая на изломе у последней станции даёт дугу длиннее хорды. Уменьшать `HALL_CLIMB` шагами по 0.05 (не ниже 0.55), пока тест не позеленеет; `hallPlacement.test.ts` при этом обязан остаться зелёным.
- `hallPlacement.test.ts` «висит над рельефом» — поднять зал нельзя без нарушения шага; уменьшить `HALL_RADIUS` до 10 и проверить раскладку в Task 4 (запас там есть). Если и это не помогает — остановиться и доложить.
- `terrainData.test.ts` «укладывается в бюджет экземпляров» — поле выросло из-за стыковки. Остановиться и доложить: потолок не повышать.

- [ ] **Step 10: e2e — конец прокрутки теперь у зала**

В `e2e/smoke.spec.ts` тест `'прокрутка до конца доводит хэш до последней работы'` переименовать в `'прокрутка до конца доводит хэш до зала навыков'` и ожидать `'#skills'` вместо `'#amazingcat'`.

Run: `npm run build && npm run e2e`
Expected: PASS на всех проектах (тест «deep link выживает после первой прокрутки» теперь проходит и `#skills`).

- [ ] **Step 11: Мутации**

1. В `hallDock` заменить `STATION_SPACING * Math.sin(HALL_CLIMB)` на `STATION_SPACING * 2 * Math.sin(HALL_CLIMB)` → краснеет «шаг до стыковки равен шагу между станциями». Вернуть.
2. В `anchors.ts` убрать `HALL_ANCHOR_ID` из `ROUTE_ANCHOR_IDS` → краснеют `anchors.test.ts` и `displayOrder.test.tsx`. Вернуть.
3. В `ResumeDocument.tsx` убрать `id="skills"` → краснеет `displayOrder.test.tsx`. Вернуть.
4. В `hallPlacement.test.ts` временно поставить `HALL_RADIUS + 20` вместо `HALL_RADIUS` в расчёте `farthest` → тест краснеет (проверка способна упасть). Вернуть.

- [ ] **Step 12: Commit**

```bash
git add src/shared/lib/vec3.ts src/shared/lib/vec3.test.ts src/entities/route src/features/career-flight src/features/scroll-bridge src/features/resume-document/ResumeDocument.tsx src/app/displayOrder.test.tsx src/app/App.test.tsx e2e/smoke.spec.ts
git commit -m "feat: стыковка зала — пятая точка маршрута и якорь «Навыки»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Контент — ML-навыки, проекты, мосты и их инварианты

**Files:**
- Modify: `src/content/skills.ts`, `src/content/index.ts`, `src/content/content.test.ts`
- Create: `src/content/projects.ts`, `src/content/bridges.ts`
- Modify: `src/entities/skill/categories.ts`, `src/entities/skill/categories.test.ts`
- Create: `src/entities/skill/contentInvariants.test.ts`

**Interfaces:**
- Produces: `SkillCategory` + `'ml-data' | 'ml-classic' | 'ml-deep' | 'llm' | 'mlops'`; `SkillIntent = 'learning' | 'planned'`; `Skill.intent?: SkillIntent` — `@/content`.
- Produces: `type Project = { id; title; kind: 'project' | 'kaggle'; date; url; summary; bullets; stack: readonly SkillId[]; metrics? }`, `projects: readonly Project[]` — `@/content`.
- Produces: `type Bridge = { from: SkillId; to: SkillId; why: string }`, `bridges: readonly Bridge[]` — `@/content`.
- Produces: `type Domain = 'web' | 'ml'`, `CATEGORY_DOMAIN: Record<SkillCategory, Domain>`, `DOMAIN_LABELS: Record<Domain, string>` — `@/entities/skill/categories`.

- [ ] **Step 1: Написать падающие тесты контента**

В `src/content/content.test.ts`:
- заменить импорт на `import { bridges, jobs, projects, skills } from './index';`;
- **удалить** тест «каждый навык используется хотя бы на одной работе» (его заменяют К1–К2: навык без доказательств теперь законен, если у него есть намерение);
- добавить в конец `describe`:

```ts
  // Доказательства — stack работ и проектов. Статус «применён» выводится из них
  // (entities/skill/status.ts); здесь — согласованность данных с этим правилом.
  const evidence = new Set([...jobs, ...projects].flatMap((source) => [...source.stack]));

  it('К1: у навыка без доказательств указано намерение', () => {
    const orphans = skills
      .filter((skill) => !evidence.has(skill.id) && !('intent' in skill))
      .map((skill) => skill.id);
    expect(orphans).toEqual([]);
  });

  it('К2: у навыка с доказательствами намерения нет — «изучаю» не залеживается', () => {
    const stale = skills
      .filter((skill) => evidence.has(skill.id) && 'intent' in skill)
      .map((skill) => skill.id);
    expect(stale).toEqual([]);
  });

  it('К5: id навыков, работ и проектов не пересекаются — это одно пространство узлов графа', () => {
    const ids = [...skills, ...jobs, ...projects].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('К6: у проекта проверяемая ссылка и дата YYYY-MM', () => {
    for (const project of projects) {
      expect(project.url).toMatch(/^https:\/\/\S+$/);
      expect(project.date).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(project.bullets.length).toBeGreaterThan(0);
    }
  });

  it('стартовый срез: Python изучается, остальные ML-навыки в плане', () => {
    const python = skills.find((skill) => skill.id === 'python');
    expect(python && 'intent' in python ? python.intent : null).toBe('learning');
    const planned = skills.filter((skill) => 'intent' in skill && skill.intent === 'planned');
    expect(planned).toHaveLength(17);
  });
```

`src/entities/skill/contentInvariants.test.ts`:

```ts
import { bridges, jobs, projects, skills } from '@/content';
import { CATEGORY_DOMAIN } from './categories';

/**
 * Инварианты контента, которым нужен домен навыка (entities), а не только
 * данные (content). К3 спеки зала: мост ведёт из доказанного веб-навыка в
 * ML-навык — иначе «что я переношу» переносится из ниоткуда.
 */
const byId = new Map(skills.map((skill) => [skill.id as string, skill]));
const evidence = new Set([...jobs, ...projects].flatMap((source) => [...source.stack] as string[]));

describe('К3: мосты', () => {
  it('ведут из применённого веб-навыка', () => {
    for (const bridge of bridges) {
      const from = byId.get(bridge.from)!;
      expect(CATEGORY_DOMAIN[from.category], bridge.from).toBe('web');
      expect(evidence.has(bridge.from), bridge.from).toBe(true);
    }
  });

  it('ведут в ML-навык', () => {
    for (const bridge of bridges) {
      expect(CATEGORY_DOMAIN[byId.get(bridge.to)!.category], bridge.to).toBe('ml');
    }
  });

  it('уникальны и обоснованы', () => {
    const pairs = bridges.map((bridge) => `${bridge.from}→${bridge.to}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    for (const bridge of bridges) expect(bridge.why.trim().length).toBeGreaterThan(10);
  });

  it('стартовых мостов шесть', () => {
    expect(bridges).toHaveLength(6);
  });
});
```

В `src/entities/skill/categories.test.ts` добавить:

```ts
describe('CATEGORY_DOMAIN', () => {
  it('ML-категории — домен ml, прежние — web', () => {
    const ml = Object.entries(CATEGORY_DOMAIN)
      .filter(([, domain]) => domain === 'ml')
      .map(([category]) => category)
      .sort();
    expect(ml).toEqual(['llm', 'ml-classic', 'ml-data', 'ml-deep', 'mlops']);
  });
});
```

(и добавить `CATEGORY_DOMAIN` в импорт из `./categories`).

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/content src/entities/skill`
Expected: FAIL — нет экспортов `bridges`, `projects`, `CATEGORY_DOMAIN`.

- [ ] **Step 3: Реализация контента**

`src/content/skills.ts` — тип и хвост массива:

```ts
export type SkillCategory =
  | 'framework'
  | 'language'
  | 'build'
  | 'testing'
  | 'state'
  | 'backend'
  | 'database'
  | 'geo'
  | 'infra'
  | 'ml-data'
  | 'ml-classic'
  | 'ml-deep'
  | 'llm'
  | 'mlops';

/**
 * Намерение — только у навыка без доказательств (спека зала, К1–К2).
 * «Применён» здесь не пишется никогда: он выводится из `stack` работ и
 * проектов (`entities/skill/status.ts`).
 */
export type SkillIntent = 'learning' | 'planned';

export type Skill = {
  id: string;
  label: string;
  category: SkillCategory;
  intent?: SkillIntent;
};
```

В массив `skills` после `magento` добавить:

```ts
  // ML — траектория по docs/ml-engineer-plan.md. Намерение снимается в том же
  // коммите, где навык попадает в stack проекта (тест К2).
  { id: 'python', label: 'Python', category: 'ml-data', intent: 'learning' },
  { id: 'numpy', label: 'NumPy', category: 'ml-data', intent: 'planned' },
  { id: 'pandas', label: 'pandas', category: 'ml-data', intent: 'planned' },
  { id: 'sklearn', label: 'scikit-learn', category: 'ml-classic', intent: 'planned' },
  { id: 'catboost', label: 'CatBoost', category: 'ml-classic', intent: 'planned' },
  { id: 'lightgbm', label: 'LightGBM', category: 'ml-classic', intent: 'planned' },
  { id: 'pytorch', label: 'PyTorch', category: 'ml-deep', intent: 'planned' },
  { id: 'transformers', label: 'Hugging Face Transformers', category: 'ml-deep', intent: 'planned' },
  { id: 'rag', label: 'RAG', category: 'llm', intent: 'planned' },
  { id: 'vector-db', label: 'Векторные БД', category: 'llm', intent: 'planned' },
  { id: 'lora', label: 'LoRA', category: 'llm', intent: 'planned' },
  { id: 'evals', label: 'Evals', category: 'llm', intent: 'planned' },
  { id: 'fastapi', label: 'FastAPI', category: 'mlops', intent: 'planned' },
  { id: 'mlflow', label: 'MLflow', category: 'mlops', intent: 'planned' },
  { id: 'dvc', label: 'DVC', category: 'mlops', intent: 'planned' },
  { id: 'onnx', label: 'ONNX', category: 'mlops', intent: 'planned' },
  { id: 'vllm', label: 'vLLM', category: 'mlops', intent: 'planned' },
  { id: 'evidently', label: 'Evidently', category: 'mlops', intent: 'planned' },
```

`src/content/projects.ts`:

```ts
import type { SkillId } from './skills';

/**
 * ML-проект или соревнование — доказательство навыков наравне с работой.
 * Ссылка обязательна: доказательство должно быть проверяемым (К6).
 */
export type Project = {
  id: string;
  title: string;
  kind: 'project' | 'kaggle';
  /** ISO YYYY-MM — месяц публикации. */
  date: string;
  url: string;
  summary: string;
  bullets: readonly string[];
  stack: readonly SkillId[];
  metrics?: readonly { label: string; value: string }[];
};

/**
 * Пусто до первого проекта плана (Kaggle — недели 16–17, проект 1 — неделя 18).
 * Добавляя проект, сними `intent` у навыков из его `stack` (тест К2).
 */
export const projects: readonly Project[] = [];
```

`src/content/bridges.ts`:

```ts
import type { SkillId } from './skills';

/** Что переносится из веба в ML и почему (спека зала, З3). */
export type Bridge = { from: SkillId; to: SkillId; why: string };

/** Черновики формулировок (спека зала, §2.6); финальные тексты — за владельцем. */
export const bridges: readonly Bridge[] = [
  {
    from: 'postgres',
    to: 'pandas',
    why: 'Агрегации и джойны над большими таблицами предбиллинга — те же операции, что в pandas.',
  },
  {
    from: 'docker',
    to: 'fastapi',
    why: 'Упаковывал и выкатывал сервисы в контейнерах — модель за API выкатывается так же.',
  },
  {
    from: 'ci',
    to: 'mlflow',
    why: 'Строил пайплайны релизов; воспроизводимость экспериментов — та же дисциплина.',
  },
  {
    from: 'nodejs',
    to: 'vllm',
    why: 'Сервисы под нагрузкой: задержка, очереди, батчинг — ядро сервинга LLM.',
  },
  {
    from: 'typescript',
    to: 'python',
    why: 'Строгая типизация в большом коде переносится в type hints и mypy.',
  },
  {
    from: 'jest',
    to: 'evals',
    why: 'Внедрял тесты, снизившие баги на продакшене на 30%; evals — тесты для моделей.',
  },
];
```

`src/content/index.ts` — добавить:

```ts
export type { SkillIntent } from './skills';
export { projects } from './projects';
export type { Project } from './projects';
export { bridges } from './bridges';
export type { Bridge } from './bridges';
```

- [ ] **Step 4: Реализация доменов**

`src/entities/skill/categories.ts` — добавить в `CATEGORY_LABELS`:

```ts
  'ml-data': 'Python и данные',
  'ml-classic': 'Классический ML',
  'ml-deep': 'Deep Learning',
  llm: 'LLM',
  mlops: 'MLOps и сервинг',
```

в конец `CATEGORY_ORDER` — `'ml-data', 'ml-classic', 'ml-deep', 'llm', 'mlops'`, и в конец файла:

```ts
export type Domain = 'web' | 'ml';

/**
 * Домен не хранится в навыке, а выводится из категории: так навык не может
 * оказаться «ML-фреймворком» в одном месте и «вебом» в другом. Полноту
 * проверяет тип `Record`.
 */
export const CATEGORY_DOMAIN: Record<SkillCategory, Domain> = {
  language: 'web',
  framework: 'web',
  state: 'web',
  build: 'web',
  testing: 'web',
  backend: 'web',
  database: 'web',
  geo: 'web',
  infra: 'web',
  'ml-data': 'ml',
  'ml-classic': 'ml',
  'ml-deep': 'ml',
  llm: 'ml',
  mlops: 'ml',
};

export const DOMAIN_LABELS: Record<Domain, string> = { web: 'Веб', ml: 'ML' };
```

- [ ] **Step 5: Тесты зелёные, мутации**

Run: `npx vitest run`
Expected: PASS.

Мутации:
1. У `python` убрать `intent` → краснеет К1. Вернуть.
2. Добавить в `stack` ГИСГИС `'python'` → краснеет К2. Вернуть.
3. В `bridges` заменить `from: 'postgres'` на `from: 'pandas'` → краснеет К3 «ведут из применённого веб-навыка». Вернуть.
4. В `CATEGORY_DOMAIN` поставить `llm: 'web'` → краснеют `categories.test.ts` и К3. Вернуть.

- [ ] **Step 6: Commit**

```bash
git add src/content src/entities/skill
git commit -m "feat: ML-навыки с намерением, проекты и мосты — с инвариантами честности

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Статус навыка и граф

**Files:**
- Create: `src/entities/skill/status.ts`, `src/entities/skill/status.test.ts`
- Create: `src/entities/skill/graph.ts`, `src/entities/skill/graph.test.ts`

**Interfaces:**
- Consumes: `Skill`, `Job`, `Project`, `Bridge`, `displayJobs`, `skills`, `projects`, `bridges` (`@/content`); `CATEGORY_DOMAIN`, `Domain` (Task 2).
- Produces: `type SkillStatus = 'applied' | 'learning' | 'planned'`, `STATUS_LABELS: Record<SkillStatus, string>`, `skillStatus(skill: Pick<Skill, 'id' | 'intent'>, jobs: readonly Evidence[], projects: readonly Evidence[]): SkillStatus` — `@/entities/skill/status`.
- Produces: `SkillNode = { id; kind: 'skill'; label; category: SkillCategory; domain: Domain; status: SkillStatus }`, `HubNode = { id; kind: 'job' | 'project'; label; domain: Domain; href: string }`, `GraphNode = SkillNode | HubNode`, `GraphEdge = { from: string; to: string; kind: 'applied' | 'bridge' }`, `SkillGraph = { nodes: GraphNode[]; edges: GraphEdge[] }`, `buildSkillGraph(skills, jobs, projects, bridges): SkillGraph`, `skillGraph: SkillGraph` — `@/entities/skill/graph`. Ребро `applied` — `from` = хаб, `to` = навык.

- [ ] **Step 1: Написать падающие тесты**

`src/entities/skill/status.test.ts`:

```ts
import { skillStatus } from './status';

const job = { stack: ['react'] as const };
const project = { stack: ['python'] as const };

describe('skillStatus', () => {
  it('навык из stack работы — применён', () => {
    expect(skillStatus({ id: 'react' }, [job], [])).toBe('applied');
  });

  it('навык из stack проекта — применён, даже если намерение не снято', () => {
    // Данные противоречивы (К2 ловит это в контенте), но доказательство
    // сильнее заявления: статус не занижается.
    expect(skillStatus({ id: 'python', intent: 'learning' }, [], [project])).toBe('applied');
  });

  it('без доказательств — намерение', () => {
    expect(skillStatus({ id: 'python', intent: 'learning' }, [job], [])).toBe('learning');
    expect(skillStatus({ id: 'onnx', intent: 'planned' }, [job], [])).toBe('planned');
  });

  it('без доказательств и без намерения — «в плане», а не «применён»', () => {
    // Ошибка в данных не должна завышать опыт.
    expect(skillStatus({ id: 'vue' }, [job], [])).toBe('planned');
  });
});
```

`src/entities/skill/graph.test.ts`:

```ts
import { displayJobs, projects, skills, type Bridge, type Job, type Project, type Skill } from '@/content';
import { buildSkillGraph, skillGraph } from './graph';

const testSkills: Skill[] = [
  { id: 'react', label: 'React', category: 'framework' },
  { id: 'postgres', label: 'PostgreSQL', category: 'database' },
  { id: 'python', label: 'Python', category: 'ml-data', intent: 'learning' },
  { id: 'onnx', label: 'ONNX', category: 'mlops', intent: 'planned' },
];
const testJobs = [
  { id: 'acme', company: 'Acme', stack: ['react', 'postgres'] },
] as unknown as Job[];
const testProjects = [
  { id: 'demo', title: 'Демо', url: 'https://example.com/demo', stack: ['python'] },
] as unknown as Project[];
const testBridges = [{ from: 'postgres', to: 'python', why: 'потому что' }] as unknown as Bridge[];

const graph = buildSkillGraph(testSkills, testJobs, testProjects, testBridges);
const node = (id: string) => graph.nodes.find((n) => n.id === id)!;

describe('buildSkillGraph', () => {
  it('узлы — навыки, работы и проекты', () => {
    expect(graph.nodes.map((n) => [n.id, n.kind])).toEqual([
      ['react', 'skill'],
      ['postgres', 'skill'],
      ['python', 'skill'],
      ['onnx', 'skill'],
      ['acme', 'job'],
      ['demo', 'project'],
    ]);
  });

  it('у навыка домен из категории и выведенный статус', () => {
    expect(node('react')).toMatchObject({ domain: 'web', status: 'applied' });
    expect(node('python')).toMatchObject({ domain: 'ml', status: 'applied' });
    expect(node('onnx')).toMatchObject({ domain: 'ml', status: 'planned' });
  });

  it('хаб-работа ведёт к станции, хаб-проект — к репозиторию', () => {
    expect(node('acme')).toMatchObject({ label: 'Acme', domain: 'web', href: '#acme' });
    expect(node('demo')).toMatchObject({ label: 'Демо', domain: 'ml', href: 'https://example.com/demo' });
  });

  it('ребро applied — от хаба к каждому навыку его stack', () => {
    const applied = graph.edges.filter((e) => e.kind === 'applied');
    expect(applied).toEqual([
      { from: 'acme', to: 'react', kind: 'applied' },
      { from: 'acme', to: 'postgres', kind: 'applied' },
      { from: 'demo', to: 'python', kind: 'applied' },
    ]);
  });

  it('мост — ребро bridge', () => {
    expect(graph.edges.filter((e) => e.kind === 'bridge')).toEqual([
      { from: 'postgres', to: 'python', kind: 'bridge' },
    ]);
  });
});

describe('граф настоящего контента', () => {
  const ids = new Set(skillGraph.nodes.map((n) => n.id));

  it('узлов столько же, сколько навыков, работ и проектов', () => {
    expect(skillGraph.nodes).toHaveLength(skills.length + displayJobs.length + projects.length);
  });

  it('нет висячих рёбер', () => {
    for (const edge of skillGraph.edges) {
      expect(ids.has(edge.from), edge.from).toBe(true);
      expect(ids.has(edge.to), edge.to).toBe(true);
    }
  });

  it('навык имеет ребро applied тогда и только тогда, когда он применён', () => {
    const withEvidence = new Set(skillGraph.edges.filter((e) => e.kind === 'applied').map((e) => e.to));
    for (const n of skillGraph.nodes) {
      if (n.kind === 'skill') expect(withEvidence.has(n.id), n.id).toBe(n.status === 'applied');
    }
  });

  it('хабы-работы в порядке станций', () => {
    expect(skillGraph.nodes.filter((n) => n.kind === 'job').map((n) => n.id)).toEqual(
      displayJobs.map((job) => job.id),
    );
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/entities/skill/status.test.ts src/entities/skill/graph.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 3: Реализация**

`src/entities/skill/status.ts`:

```ts
import type { Skill } from '@/content';

export type SkillStatus = 'applied' | 'learning' | 'planned';

export const STATUS_LABELS: Record<SkillStatus, string> = {
  applied: 'применён',
  learning: 'изучаю',
  planned: 'в плане',
};

type Evidence = { readonly stack: readonly string[] };

/**
 * «Применён» нельзя объявить — только заработать: навык есть в stack хотя бы
 * одной работы или проекта (спека зала, З2). Иначе — заявленное намерение.
 * Единственное место, где определяется статус: HTML-проекция и сцена зовут
 * эту функцию, а не считают сами.
 */
export function skillStatus(
  skill: Pick<Skill, 'id' | 'intent'>,
  jobs: readonly Evidence[],
  projects: readonly Evidence[],
): SkillStatus {
  const proven = [...jobs, ...projects].some((source) => source.stack.includes(skill.id));
  if (proven) return 'applied';
  // К1 гарантирует намерение у навыка без доказательств. Запасной вариант —
  // «в плане»: ошибка в данных не должна завышать опыт.
  return skill.intent ?? 'planned';
}
```

`src/entities/skill/graph.ts`:

```ts
import type { Bridge, Job, Project, Skill, SkillCategory } from '@/content';
import { bridges, displayJobs, projects, skills } from '@/content';
import { CATEGORY_DOMAIN, type Domain } from './categories';
import { skillStatus, type SkillStatus } from './status';

export type SkillNode = {
  id: string;
  kind: 'skill';
  label: string;
  category: SkillCategory;
  domain: Domain;
  status: SkillStatus;
};

/** Хаб — источник доказательств: работа (станция маршрута) или ML-проект. */
export type HubNode = {
  id: string;
  kind: 'job' | 'project';
  label: string;
  domain: Domain;
  /** Работа — якорь станции `#id`; проект — его репозиторий. */
  href: string;
};

export type GraphNode = SkillNode | HubNode;
export type GraphEdge = { from: string; to: string; kind: 'applied' | 'bridge' };
export type SkillGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

/**
 * Двудольный граф зала (спека зала, З4): ребро `applied` «хаб → навык»
 * означает буквально «применён здесь»; мосты — третий вид связи, навык →
 * навык. Отдельной структуры под граф нет: всё выводится из контента.
 */
export function buildSkillGraph(
  skillList: readonly Skill[],
  jobList: readonly Job[],
  projectList: readonly Project[],
  bridgeList: readonly Bridge[],
): SkillGraph {
  const skillNodes: SkillNode[] = skillList.map((skill) => ({
    id: skill.id,
    kind: 'skill',
    label: skill.label,
    category: skill.category,
    domain: CATEGORY_DOMAIN[skill.category],
    status: skillStatus(skill, jobList, projectList),
  }));
  const jobNodes: HubNode[] = jobList.map((job) => ({
    id: job.id,
    kind: 'job',
    label: job.company,
    domain: 'web',
    href: `#${job.id}`,
  }));
  const projectNodes: HubNode[] = projectList.map((project) => ({
    id: project.id,
    kind: 'project',
    label: project.title,
    domain: 'ml',
    href: project.url,
  }));

  const applied: GraphEdge[] = [...jobList, ...projectList].flatMap((source) =>
    source.stack.map((skillId): GraphEdge => ({ from: source.id, to: skillId, kind: 'applied' })),
  );
  const bridged: GraphEdge[] = bridgeList.map((bridge) => ({
    from: bridge.from,
    to: bridge.to,
    kind: 'bridge',
  }));

  return { nodes: [...skillNodes, ...jobNodes, ...projectNodes], edges: [...applied, ...bridged] };
}

/** Граф настоящего контента. Хабы-работы — в порядке станций (`displayJobs`). */
export const skillGraph = buildSkillGraph(skills, displayJobs, projects, bridges);
```

- [ ] **Step 4: Тесты зелёные, мутации**

Run: `npx vitest run src/entities/skill`
Expected: PASS.

Мутации:
1. В `skillStatus` вернуть `'applied'` при `intent === 'learning'` → краснеет «без доказательств — намерение». Вернуть.
2. В `buildSkillGraph` строить `applied` только из `jobList` → краснеет тест про `demo → python`. Вернуть.
3. В `skillGraph` передать `jobs` вместо `displayJobs` → краснеет «хабы-работы в порядке станций». Вернуть.

- [ ] **Step 5: Commit**

```bash
git add src/entities/skill
git commit -m "feat: статус навыка из доказательств и двудольный граф зала

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Раскладка графа

**Files:**
- Create: `src/entities/skill/layout.ts`, `src/entities/skill/layout.test.ts`

**Interfaces:**
- Consumes: `SkillGraph`, `SkillNode`, `skillGraph` (Task 3); `CATEGORY_ORDER` (Task 2); `Vec3`, `distance`, `length` (Task 1); `HALL_RADIUS` (Task 1, только в тесте).
- Produces: `LAYOUT = { xOffset: 6, clusterRing: 6, hubRing: 2, gap: 6, minDist: 0.9 }`, `clusterRadius(count): number`, `fibonacciSphere(count, radius): Vec3[]`, `layoutGraph(graph: SkillGraph): Map<string, Vec3>` — `@/entities/skill/layout`. Координаты локальные, центр зала — начало координат.

- [ ] **Step 1: Написать падающие тесты**

`src/entities/skill/layout.test.ts`:

```ts
import { HALL_RADIUS } from '@/entities/route/geometry';
import { distance, length } from '@/shared/lib/vec3';
import { LAYOUT, clusterRadius, fibonacciSphere, layoutGraph } from './layout';
import { skillGraph, type SkillGraph } from './graph';

const positions = layoutGraph(skillGraph);
const at = (id: string) => positions.get(id)!;

describe('fibonacciSphere', () => {
  it('один узел — в центре кластера', () => {
    expect(fibonacciSphere(1, 2)).toEqual([{ x: 0, y: 0, z: 0 }]);
  });

  it('точки лежат на сфере заданного радиуса', () => {
    for (const point of fibonacciSphere(7, 1.5)) expect(length(point)).toBeCloseTo(1.5, 10);
  });
});

describe('clusterRadius', () => {
  it('растёт с числом узлов', () => {
    expect(clusterRadius(1)).toBe(0);
    expect(clusterRadius(6)).toBeGreaterThan(clusterRadius(3));
  });
});

describe('раскладка настоящего графа', () => {
  it('у каждого узла есть позиция', () => {
    expect(positions.size).toBe(skillGraph.nodes.length);
  });

  it('Л1: любые два узла не ближе minDist', () => {
    const ids = [...positions.keys()];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        expect(distance(at(ids[i]!), at(ids[j]!)), `${ids[i]} ↔ ${ids[j]}`).toBeGreaterThanOrEqual(
          LAYOUT.minDist,
        );
      }
    }
  });

  it('Л2: каждый узел строго в своей половине, за краем разрыва', () => {
    for (const node of skillGraph.nodes) {
      const x = at(node.id).x;
      if (node.domain === 'web') expect(x, node.id).toBeLessThan(-LAYOUT.gap / 2);
      else expect(x, node.id).toBeGreaterThan(LAYOUT.gap / 2);
    }
  });

  it('Л3: каждый мост пересекает плоскость x = 0', () => {
    const bridges = skillGraph.edges.filter((e) => e.kind === 'bridge');
    expect(bridges.length).toBeGreaterThan(0);
    for (const edge of bridges) {
      expect(Math.sign(at(edge.from).x) * Math.sign(at(edge.to).x), `${edge.from}→${edge.to}`).toBe(-1);
    }
  });

  it('Л4: все узлы внутри сферы зала', () => {
    for (const [id, point] of positions) expect(length(point), id).toBeLessThan(HALL_RADIUS);
  });

  it('Л5: детерминизм', () => {
    expect(layoutGraph(skillGraph)).toEqual(positions);
  });
});

describe('раскладка на синтетике', () => {
  it('хаб без навыков и единственный кластер получают позиции', () => {
    const graph: SkillGraph = {
      nodes: [
        { id: 'a', kind: 'skill', label: 'A', category: 'mlops', domain: 'ml', status: 'planned' },
        { id: 'h', kind: 'project', label: 'H', domain: 'ml', href: 'https://example.com' },
      ],
      edges: [],
    };
    const result = layoutGraph(graph);
    expect(result.size).toBe(2);
    expect(result.get('a')!.x).toBeGreaterThan(LAYOUT.gap / 2);
    expect(distance(result.get('a')!, result.get('h')!)).toBeGreaterThanOrEqual(LAYOUT.minDist);
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/entities/skill/layout.test.ts`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Реализация**

`src/entities/skill/layout.ts`:

```ts
import type { Vec3 } from '@/shared/lib/vec3';
import { CATEGORY_ORDER, type Domain } from './categories';
import type { SkillGraph, SkillNode } from './graph';

/**
 * Аналитическая раскладка зала (спека зала, §4). Половина домена — ось
 * `x = ±xOffset`; центры кластеров (категорий) — на кольце радиуса
 * `clusterRing` вокруг этой оси в плоскости yz; хабы — на внутреннем кольце
 * `hubRing`, поэтому рёбра «хаб → навык» расходятся спицами. Между половинами
 * — разрыв шириной `gap`, его пересекают только мосты.
 *
 * Детерминированная: без случайности и итераций — инварианты Л1–Л5
 * проверяются тестами, а не надеждой на сходимость.
 */
export const LAYOUT = {
  xOffset: 6,
  clusterRing: 6,
  hubRing: 2,
  gap: 6,
  minDist: 0.9,
} as const;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Радиус кластера: одиночный узел — в центре, дальше растёт как √n. */
export function clusterRadius(count: number): number {
  return count <= 1 ? 0 : 0.6 + 0.35 * Math.sqrt(count);
}

/** Почти равномерные точки на сфере (спираль Фибоначчи). */
export function fibonacciSphere(count: number, radius: number): Vec3[] {
  if (count === 1) return [{ x: 0, y: 0, z: 0 }];
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const theta = i * GOLDEN_ANGLE;
    return { x: Math.cos(theta) * ring * radius, y: y * radius, z: Math.sin(theta) * ring * radius };
  });
}

function ringPoint(sign: number, radius: number, index: number, count: number, phase: number): Vec3 {
  const angle = (2 * Math.PI * index) / count + phase;
  return { x: sign * LAYOUT.xOffset, y: Math.sin(angle) * radius, z: Math.cos(angle) * radius };
}

const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

export function layoutGraph(graph: SkillGraph): Map<string, Vec3> {
  const positions = new Map<string, Vec3>();

  for (const domain of ['web', 'ml'] as const satisfies readonly Domain[]) {
    const sign = domain === 'web' ? -1 : 1;
    const skills = graph.nodes.filter(
      (node): node is SkillNode => node.kind === 'skill' && node.domain === domain,
    );
    const categories = CATEGORY_ORDER.filter((category) =>
      skills.some((skill) => skill.category === category),
    );

    categories.forEach((category, index) => {
      const members = skills.filter((skill) => skill.category === category);
      const center = ringPoint(sign, LAYOUT.clusterRing, index, categories.length, 0);
      fibonacciSphere(members.length, clusterRadius(members.length)).forEach((offset, i) => {
        positions.set(members[i]!.id, add(center, offset));
      });
    });

    // Фаза π/4 разводит хабы с направлениями на центры кластеров: спица не
    // проходит сквозь соседний хаб.
    const hubs = graph.nodes.filter((node) => node.kind !== 'skill' && node.domain === domain);
    hubs.forEach((hub, index) => {
      positions.set(hub.id, ringPoint(sign, LAYOUT.hubRing, index, hubs.length, Math.PI / 4));
    });
  }

  return positions;
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `npx vitest run src/entities/skill/layout.test.ts`
Expected: PASS. Если краснеет Л1 между соседними кластерами — увеличить `clusterRing` на 0.5 (Л4 даёт запас до `HALL_RADIUS` = 11: при `clusterRing` 6 самый дальний узел ≈ 9.95). Если краснеет Л4 — уменьшить коэффициент 0.35 в `clusterRadius`. Значения, при которых зелено, — финальные; записать их в отчёт задачи.

- [ ] **Step 5: Мутации**

1. `LAYOUT.gap` не используется в формулах — проверка Л2 сравнивает с ним напрямую. Мутация: `xOffset: 2` → краснеет Л2 (узлы залезают в разрыв). Вернуть.
2. `hubRing: 0` → краснеет Л1 (хабы слиплись в одной точке). Вернуть.
3. В `ringPoint` для хабов передать `sign` = 1 всегда → краснеет Л2 для хабов-работ. Вернуть.
4. `clusterRing: 2` → краснеет Л1. Вернуть.

- [ ] **Step 6: Commit**

```bash
git add src/entities/skill/layout.ts src/entities/skill/layout.test.ts
git commit -m "feat: аналитическая раскладка зала — два кольца кластеров, хабы спицами

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Режимы сцены — редьюсер, стор и привязка к прогрессу

Каталог называется `scene-mode`, а не `scene`: линтерное правило Task 7 запрещает импорт из любого `**/scene/**` вне ленивого чанка, а этот стор живёт в главном.

**Files:**
- Create: `src/entities/scene-mode/sceneMode.ts`, `src/entities/scene-mode/sceneMode.test.ts`
- Create: `src/entities/scene-mode/sceneStore.ts`, `src/entities/scene-mode/sceneStore.test.ts`

**Interfaces:**
- Produces: `type SceneMode = 'travelling' | 'docked' | 'exploring'`, `type SceneState = { mode; sceneReady: boolean; highlightedId: string | null; selectedId: string | null }`, `type SceneEvent` (6 видов, см. код), `DOCK_EPS = 0.01`, `INITIAL_SCENE_STATE`, `reduceScene(state, event): SceneState` (возвращает **тот же объект**, если ничего не изменилось) — `@/entities/scene-mode/sceneMode`.
- Produces: `sceneStore` (zustand vanilla), `dispatchScene(event): void`, `useSceneState<T>(selector): T`, `bindProgress(source: ProgressSource): () => void` где `ProgressSource = { getState(): { progress: number }; subscribe(listener: (state: { progress: number }) => void): () => void }` — `@/entities/scene-mode/sceneStore`.

- [ ] **Step 1: Написать падающие тесты редьюсера**

`src/entities/scene-mode/sceneMode.test.ts`:

```ts
import { DOCK_EPS, INITIAL_SCENE_STATE, reduceScene, type SceneState } from './sceneMode';

const state = (patch: Partial<SceneState>): SceneState => ({ ...INITIAL_SCENE_STATE, ...patch });

describe('reduceScene: прогресс', () => {
  it('в конце маршрута — стыковка', () => {
    expect(reduceScene(state({}), { type: 'progress', value: 1 }).mode).toBe('docked');
    expect(reduceScene(state({}), { type: 'progress', value: 1 - DOCK_EPS }).mode).toBe('docked');
  });

  it('до порога — полёт', () => {
    const before = state({});
    expect(reduceScene(before, { type: 'progress', value: 0.98 })).toBe(before);
  });

  it('гистерезис: из стыковки уходит только ниже 1 − 2·EPS', () => {
    const docked = state({ mode: 'docked' });
    expect(reduceScene(docked, { type: 'progress', value: 1 - 1.5 * DOCK_EPS })).toBe(docked);
    expect(reduceScene(docked, { type: 'progress', value: 1 - 2.5 * DOCK_EPS }).mode).toBe('travelling');
  });

  it('уход из стыковки снимает подсветку', () => {
    const docked = state({ mode: 'docked', highlightedId: 'react' });
    expect(reduceScene(docked, { type: 'progress', value: 0 }).highlightedId).toBeNull();
  });

  it('в исследовании прогресс игнорируется', () => {
    const exploring = state({ mode: 'exploring', sceneReady: true });
    expect(reduceScene(exploring, { type: 'progress', value: 0 })).toBe(exploring);
  });
});

describe('reduceScene: зал', () => {
  it('открывается только из стыковки и только при готовой сцене', () => {
    expect(reduceScene(state({ mode: 'docked', sceneReady: true }), { type: 'openHall' }).mode).toBe('exploring');
    const notReady = state({ mode: 'docked' });
    expect(reduceScene(notReady, { type: 'openHall' })).toBe(notReady);
    const travelling = state({ sceneReady: true });
    expect(reduceScene(travelling, { type: 'openHall' })).toBe(travelling);
  });

  it('открытие снимает подсветку, закрытие — выбор', () => {
    const opened = reduceScene(state({ mode: 'docked', sceneReady: true, highlightedId: 'react' }), {
      type: 'openHall',
    });
    expect(opened.highlightedId).toBeNull();
    const closed = reduceScene({ ...opened, selectedId: 'react' }, { type: 'closeHall' });
    expect(closed).toMatchObject({ mode: 'docked', selectedId: null });
  });

  it('закрытие вне исследования ничего не меняет', () => {
    const docked = state({ mode: 'docked' });
    expect(reduceScene(docked, { type: 'closeHall' })).toBe(docked);
  });

  it('подсветка — только в стыковке, выбор — только в исследовании', () => {
    const travelling = state({});
    expect(reduceScene(travelling, { type: 'highlight', id: 'react' })).toBe(travelling);
    expect(reduceScene(state({ mode: 'docked' }), { type: 'highlight', id: 'react' }).highlightedId).toBe('react');
    const docked = state({ mode: 'docked' });
    expect(reduceScene(docked, { type: 'select', id: 'react' })).toBe(docked);
    expect(
      reduceScene(state({ mode: 'exploring', sceneReady: true }), { type: 'select', id: 'react' }).selectedId,
    ).toBe('react');
  });

  it('повтор того же значения не создаёт новое состояние', () => {
    const docked = state({ mode: 'docked', highlightedId: 'react' });
    expect(reduceScene(docked, { type: 'highlight', id: 'react' })).toBe(docked);
  });
});

describe('reduceScene: готовность сцены', () => {
  it('ставится и снимается', () => {
    const ready = reduceScene(state({}), { type: 'sceneReady', ready: true });
    expect(ready.sceneReady).toBe(true);
    expect(reduceScene(ready, { type: 'sceneReady', ready: false }).sceneReady).toBe(false);
  });

  it('пропавшая сцена выводит из исследования — документ обязан вернуться', () => {
    const exploring = state({ mode: 'exploring', sceneReady: true, selectedId: 'react' });
    expect(reduceScene(exploring, { type: 'sceneReady', ready: false })).toEqual(
      state({ mode: 'docked', sceneReady: false, selectedId: null }),
    );
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/entities/scene-mode`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Реализация редьюсера**

`src/entities/scene-mode/sceneMode.ts`:

```ts
/**
 * Режимы сцены (спека зала, §5.3) — чистый редьюсер без `three` и React.
 * Возвращает тот же объект, если событие ничего не меняет: стор тогда не
 * оповещает подписчиков, и ни React, ни цикл кадра не делают лишней работы.
 */
export type SceneMode = 'travelling' | 'docked' | 'exploring';

export type SceneState = {
  mode: SceneMode;
  /** Канвас смонтирован и отрисовал кадр — без этого кнопки зала нет. */
  sceneReady: boolean;
  /** Подсветка из HTML-списка; живёт только в `docked`. */
  highlightedId: string | null;
  /** Выбранный узел; живёт только в `exploring`. */
  selectedId: string | null;
};

export type SceneEvent =
  | { type: 'progress'; value: number }
  | { type: 'openHall' }
  | { type: 'closeHall' }
  | { type: 'highlight'; id: string | null }
  | { type: 'select'; id: string | null }
  | { type: 'sceneReady'; ready: boolean };

/** Порог стыковки; уход — ниже `1 − 2·DOCK_EPS` (гистерезис против дребезга). */
export const DOCK_EPS = 0.01;

export const INITIAL_SCENE_STATE: SceneState = {
  mode: 'travelling',
  sceneReady: false,
  highlightedId: null,
  selectedId: null,
};

export function reduceScene(state: SceneState, event: SceneEvent): SceneState {
  switch (event.type) {
    case 'progress':
      if (state.mode === 'travelling' && event.value >= 1 - DOCK_EPS) {
        return { ...state, mode: 'docked' };
      }
      if (state.mode === 'docked' && event.value < 1 - 2 * DOCK_EPS) {
        return { ...state, mode: 'travelling', highlightedId: null };
      }
      return state;
    case 'openHall':
      return state.mode === 'docked' && state.sceneReady
        ? { ...state, mode: 'exploring', highlightedId: null }
        : state;
    case 'closeHall':
      return state.mode === 'exploring' ? { ...state, mode: 'docked', selectedId: null } : state;
    case 'highlight':
      return state.mode === 'docked' && state.highlightedId !== event.id
        ? { ...state, highlightedId: event.id }
        : state;
    case 'select':
      return state.mode === 'exploring' && state.selectedId !== event.id
        ? { ...state, selectedId: event.id }
        : state;
    case 'sceneReady':
      if (state.sceneReady === event.ready) return state;
      if (!event.ready && state.mode === 'exploring') {
        return { ...state, sceneReady: false, mode: 'docked', selectedId: null };
      }
      return { ...state, sceneReady: event.ready };
  }
}
```

- [ ] **Step 4: Написать падающие тесты стора**

`src/entities/scene-mode/sceneStore.test.ts`:

```ts
import { createStore } from 'zustand/vanilla';
import { INITIAL_SCENE_STATE } from './sceneMode';
import { bindProgress, dispatchScene, sceneStore } from './sceneStore';

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('dispatchScene', () => {
  it('применяет редьюсер', () => {
    dispatchScene({ type: 'progress', value: 1 });
    expect(sceneStore.getState().mode).toBe('docked');
  });

  it('не оповещает подписчиков, если состояние не изменилось', () => {
    const listener = vi.fn();
    const unsubscribe = sceneStore.subscribe(listener);
    dispatchScene({ type: 'progress', value: 0.2 });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('bindProgress', () => {
  it('сразу передаёт текущий прогресс и дальше — каждое изменение', () => {
    const progress = createStore(() => ({ progress: 1 }));
    const unbind = bindProgress(progress);
    expect(sceneStore.getState().mode).toBe('docked');
    progress.setState({ progress: 0 });
    expect(sceneStore.getState().mode).toBe('travelling');
    unbind();
    progress.setState({ progress: 1 });
    expect(sceneStore.getState().mode).toBe('travelling');
  });
});
```

- [ ] **Step 5: Реализация стора**

`src/entities/scene-mode/sceneStore.ts`:

```ts
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { INITIAL_SCENE_STATE, reduceScene, type SceneEvent, type SceneState } from './sceneMode';

/**
 * Стор режимов — в главном чанке: в него пишут кнопка «Открыть зал» и
 * HTML-список навыков, а читает его и ленивая сцена (в `useFrame` — через
 * `getState()`, без React). На сервере `useStore` отдаёт начальное
 * состояние: кнопки зала в предрендере нет, гидрация не расходится.
 */
export const sceneStore = createStore<SceneState>(() => INITIAL_SCENE_STATE);

export function dispatchScene(event: SceneEvent): void {
  const current = sceneStore.getState();
  const next = reduceScene(current, event);
  if (next !== current) sceneStore.setState(next, true);
}

export function useSceneState<T>(selector: (state: SceneState) => T): T {
  return useStore(sceneStore, selector);
}

type ProgressSource = {
  getState(): { progress: number };
  subscribe(listener: (state: { progress: number }) => void): () => void;
};

/**
 * Прогресс маршрута → режим сцены. Источник передаётся параметром, а не
 * импортируется: так `entities/scene-mode` не зависит от `entities/route`.
 * Подключается в `App` (`bindProgress(progressStore)`).
 */
export function bindProgress(source: ProgressSource): () => void {
  dispatchScene({ type: 'progress', value: source.getState().progress });
  return source.subscribe((state) => dispatchScene({ type: 'progress', value: state.progress }));
}
```

- [ ] **Step 6: Тесты зелёные, мутации**

Run: `npx vitest run src/entities/scene-mode`
Expected: PASS.

Мутации:
1. `1 - 2 * DOCK_EPS` → `1 - DOCK_EPS` в ветке ухода → краснеет «гистерезис». Вернуть.
2. Убрать ветку `!event.ready && state.mode === 'exploring'` → краснеет «пропавшая сцена выводит из исследования». Вернуть.
3. В `dispatchScene` убрать `if (next !== current)` → краснеет «не оповещает подписчиков». Вернуть.
4. В `openHall` убрать `&& state.sceneReady` → краснеет «открывается только … при готовой сцене». Вернуть.

- [ ] **Step 7: Commit**

```bash
git add src/entities/scene-mode
git commit -m "feat: режимы сцены — редьюсер с гистерезисом стыковки и стор

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: HTML-проекция — домены, статусы, мосты, ML-проекты

**Files:**
- Modify: `src/features/resume-document/SkillList.tsx`
- Create: `src/features/resume-document/SkillList.test.tsx`
- Create: `src/features/resume-document/ProjectEntry.tsx`
- Modify: `src/features/resume-document/JobEntry.tsx` (экспорт `formatIsoMonth`)
- Modify: `src/features/resume-document/ResumeDocument.tsx`, `ResumeDocument.test.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**
- Consumes: `skillStatus`, `STATUS_LABELS` (Task 3); `CATEGORY_DOMAIN`, `DOMAIN_LABELS` (Task 2); `dispatchScene` (Task 5); `projects`, `bridges`, `Project` (Task 2).
- Produces: `ResumeDocument({ now?, projects?, skillsAction? })` — `projects?: readonly Project[]` (по умолчанию из контента), `skillsAction?: ReactNode` рендерится внутри секции «Навыки» сразу под заголовком (Task 10 передаёт туда кнопку зала). `formatIsoMonth(iso: string): string` экспортируется из `JobEntry.tsx`.

- [ ] **Step 1: Написать падающие тесты**

`src/features/resume-document/SkillList.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { SkillList } from './SkillList';

const item = (label: string) => screen.getByText(label).closest('li')!;

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('SkillList', () => {
  it('навыки разделены на домены «Веб» и «ML»', () => {
    render(<SkillList />);
    const ml = screen.getByRole('heading', { level: 3, name: 'ML' }).closest('.skills-domain')!;
    expect(within(ml as HTMLElement).getByText('PyTorch')).toBeInTheDocument();
    expect(within(ml as HTMLElement).queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Веб' })).toBeInTheDocument();
  });

  it('статус написан текстом, а не только цветом', () => {
    render(<SkillList />);
    expect(item('Python')).toHaveTextContent('изучаю');
    expect(item('ONNX')).toHaveTextContent('в плане');
  });

  it('у применённого навыка метки нет — это умолчание', () => {
    render(<SkillList />);
    expect(item('React').textContent).toBe('React');
  });

  it('мосты: пара навыков и обоснование', () => {
    render(<SkillList />);
    expect(screen.getByRole('heading', { level: 3, name: 'Что я переношу в ML' })).toBeInTheDocument();
    const bridge = screen.getByText('PostgreSQL → pandas').closest('li')!;
    expect(bridge).toHaveTextContent('предбиллинга');
  });

  it('в стыковке наведение на навык подсвечивает его в зале, уход снимает', () => {
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked' }, true);
    render(<SkillList />);
    fireEvent.pointerEnter(item('React'));
    expect(sceneStore.getState().highlightedId).toBe('react');
    fireEvent.pointerLeave(item('React'));
    expect(sceneStore.getState().highlightedId).toBeNull();
  });
});
```

В `ResumeDocument.test.tsx` добавить (импорт `type Project` из `@/content`):

```tsx
  const sampleProject: Project = {
    id: 'tabular',
    title: 'Табличная модель',
    kind: 'project',
    date: '2027-02',
    url: 'https://github.com/alygee/tabular',
    summary: 'Модель оттока.',
    bullets: ['CatBoost против логистической регрессии.'],
    stack: ['python'],
  };

  it('раздела «ML-проекты» нет, пока проектов нет', () => {
    render(<ResumeDocument now="2026-08" />);
    expect(screen.queryByRole('heading', { name: 'ML-проекты' })).not.toBeInTheDocument();
  });

  it('раздел «ML-проекты» появляется с первым проектом и не становится якорем маршрута', () => {
    const { container } = render(<ResumeDocument now="2026-08" projects={[sampleProject]} />);
    expect(screen.getByRole('heading', { name: 'ML-проекты' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Табличная модель' })).toHaveAttribute(
      'href',
      'https://github.com/alygee/tabular',
    );
    // Якоря маршрута — `section[id]`; у раздела проектов id нет.
    expect(container.querySelector('.projects')!.hasAttribute('id')).toBe(false);
  });

  it('действие секции «Навыки» рендерится внутри неё', () => {
    render(<ResumeDocument now="2026-08" skillsAction={<button type="button">действие</button>} />);
    const section = screen.getByRole('region', { name: 'Навыки' });
    expect(within(section).getByRole('button', { name: 'действие' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/features/resume-document`
Expected: FAIL — нет доменов, меток, мостов, пропов `projects`/`skillsAction`.

- [ ] **Step 3: Реализация**

`src/features/resume-document/SkillList.tsx`:

```tsx
import { bridges, jobs, projects, skills } from '@/content';
import { dispatchScene } from '@/entities/scene-mode/sceneStore';
import {
  CATEGORY_DOMAIN,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DOMAIN_LABELS,
  type Domain,
} from '@/entities/skill/categories';
import { STATUS_LABELS, skillStatus } from '@/entities/skill/status';

const DOMAINS: readonly Domain[] = ['web', 'ml'];
const LABEL_BY_ID = new Map<string, string>(skills.map((skill) => [skill.id, skill.label]));

/**
 * HTML-проекция зала навыков (Р1/Р2): всё, что есть в сцене, есть здесь —
 * домены, статусы (текстом, не только цветом), мосты. Наведение указателя в
 * режиме стыковки подсвечивает узел в зале; редьюсер игнорирует подсветку в
 * других режимах, поэтому обработчик безусловный.
 */
export function SkillList() {
  return (
    <>
      {DOMAINS.map((domain) => (
        <div className="skills-domain" key={domain}>
          <h3>{DOMAIN_LABELS[domain]}</h3>
          <div className="skills">
            {CATEGORY_ORDER.filter((category) => CATEGORY_DOMAIN[category] === domain).map(
              (category) => {
                const group = skills.filter((skill) => skill.category === category);
                if (group.length === 0) return null;
                return (
                  <div className="skills__group" key={category}>
                    <h4>{CATEGORY_LABELS[category]}</h4>
                    <ul>
                      {group.map((skill) => {
                        const status = skillStatus(skill, jobs, projects);
                        return (
                          <li
                            key={skill.id}
                            className={`skill skill--${status}`}
                            onPointerEnter={() => dispatchScene({ type: 'highlight', id: skill.id })}
                            onPointerLeave={() => dispatchScene({ type: 'highlight', id: null })}
                          >
                            {skill.label}
                            {status !== 'applied' && (
                              <span className="skill__status"> — {STATUS_LABELS[status]}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              },
            )}
          </div>
        </div>
      ))}

      <h3>Что я переношу в ML</h3>
      <ul className="bridges">
        {bridges.map((bridge) => (
          <li key={`${bridge.from}-${bridge.to}`}>
            <span className="bridge__pair">
              {`${LABEL_BY_ID.get(bridge.from)} → ${LABEL_BY_ID.get(bridge.to)}`}
            </span>{' '}
            — {bridge.why}
          </li>
        ))}
      </ul>
    </>
  );
}
```

`src/features/resume-document/JobEntry.tsx`: `function formatIsoMonth` → `export function formatIsoMonth`.

`src/features/resume-document/ProjectEntry.tsx`:

```tsx
import { skills, type Project } from '@/content';
import { formatIsoMonth } from './JobEntry';

const LABEL_BY_ID = new Map<string, string>(skills.map((skill) => [skill.id, skill.label]));

/**
 * ML-проект — `article`, а не `section`: якоря маршрута — `section[id]`, и
 * проект им не является (камера к проектам не летает).
 */
export function ProjectEntry({ project }: { project: Project }) {
  return (
    <article className="project" aria-labelledby={`project-${project.id}`}>
      <h3 id={`project-${project.id}`}>
        <a href={project.url} target="_blank" rel="noopener noreferrer">
          {project.title}
        </a>
      </h3>
      <p className="project__meta">
        {`${project.kind === 'kaggle' ? 'Kaggle' : 'Проект'} · ${formatIsoMonth(project.date)}`}
      </p>
      <p>{project.summary}</p>
      <ul className="job__bullets">
        {project.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <p className="project__stack">{project.stack.map((id) => LABEL_BY_ID.get(id)).join(', ')}</p>
    </article>
  );
}
```

`src/features/resume-document/ResumeDocument.tsx` — сигнатура и разметка между «Опыт работы» и «Образование»:

```tsx
import type { ReactNode } from 'react';
import { displayJobs, jobs, projects as contentProjects, type Project } from '@/content';
// …прежние импорты…
import { ProjectEntry } from './ProjectEntry';

export function ResumeDocument({
  now = currentMonthIso(),
  projects = contentProjects,
  skillsAction = null,
}: { now?: string; projects?: readonly Project[]; skillsAction?: ReactNode } = {}) {
  // …
      {displayJobs.map((job) => (
        <JobEntry job={job} now={now} key={job.id} />
      ))}

      {projects.length > 0 && (
        <section className="projects" aria-labelledby="projects-heading">
          <h2 id="projects-heading">ML-проекты</h2>
          {projects.map((project) => (
            <ProjectEntry project={project} key={project.id} />
          ))}
        </section>
      )}

      {/* (комментарий о якоре из Task 1) */}
      <section id="skills" aria-labelledby="skills-heading">
        <h2 id="skills-heading">Навыки</h2>
        {skillsAction}
        <SkillList />
      </section>
  // …
```

`src/app/styles.css` — заменить строку `.skills__group h3 { … }` на `.skills__group h4 { … }` с теми же свойствами и добавить после `.skills__group ul`:

```css
.skills-domain + .skills-domain { margin-top: 2rem; }
.skill--planned { color: var(--muted); }
.skill__status { font-size: .8125rem; color: var(--muted); }
.skill--learning .skill__status { color: var(--accent); }
.bridges { margin: 0; padding-left: 1.25rem; }
.bridge__pair { color: var(--accent); }
.project { margin-bottom: 2rem; }
.project__meta, .project__stack { font-size: .875rem; color: var(--muted); }
```

- [ ] **Step 4: Тесты зелёные, мутации**

Run: `npx vitest run`
Expected: PASS (включая прежний «группирует навыки по категориям» — заголовки категорий теперь `h4`, роль `heading` та же).

Мутации:
1. В `SkillList` убрать `status !== 'applied' &&` → краснеет «у применённого навыка метки нет». Вернуть.
2. Убрать `onPointerLeave` → краснеет тест подсветки. Вернуть.
3. В `ResumeDocument` дать разделу проектов `id="projects"` → краснеет «не становится якорем маршрута». Вернуть.

- [ ] **Step 5: Проверка глазами и e2e**

Run: `npm run build && npm run e2e`
Expected: PASS, включая axe («нарушений доступности нет») и «горизонтального скролла нет на узком экране». `npm run dev`, раздел «Навыки»: две группы, метки «изучаю»/«в плане» читаются, мосты — акцентной парой.

- [ ] **Step 6: Commit**

```bash
git add src/features/resume-document src/app/styles.css
git commit -m "feat: раздел навыков — домены, статусы текстом, мосты в ML, ML-проекты

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Слой `widgets/scene`, готовность сцены и каталожный линтер

**Files:**
- Move: `src/features/career-flight/scene/SceneLayer.tsx` → `src/widgets/scene/SceneLayer.tsx`
- Create: `src/widgets/scene/SceneReady.tsx`, `src/widgets/scene/SceneReady.test.tsx`
- Modify: `src/shared/ui/ErrorBoundary.tsx`, `ErrorBoundary.test.tsx`
- Modify: `src/app/App.tsx`, `App.test.tsx`, `sceneFailure.test.tsx`, `featureBoundaries.test.ts`, `styles.css` (комментарий)
- Modify: `.oxlintrc.json`

**Interfaces:**
- Consumes: `dispatchScene`, `useSceneState`, `bindProgress`, `sceneStore` (Task 5); `progressStore`.
- Produces: `src/widgets/scene/SceneLayer.tsx` (default export) — точка `lazy(import)`; канвас получает `pointerEvents: 'auto'` и `touchAction: 'none'` только в `exploring`. `SceneReady` — компонент внутри `<Canvas>`. `ErrorBoundary` принимает `onError?: () => void`.

- [ ] **Step 1: Написать падающие тесты**

`src/widgets/scene/SceneReady.test.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { SceneReady } from './SceneReady';

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('SceneReady', () => {
  it('сообщает о готовности после первого кадра', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneReady />);
    await renderer.advanceFrames(1, 0.016);
    expect(sceneStore.getState().sceneReady).toBe(true);
  });

  it('при размонтировании снимает готовность', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneReady />);
    await renderer.advanceFrames(1, 0.016);
    await renderer.unmount();
    expect(sceneStore.getState().sceneReady).toBe(false);
  });
});
```

В `src/shared/ui/ErrorBoundary.test.tsx` добавить:

```tsx
  it('сообщает о падении через onError', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });
```

В `src/app/App.test.tsx` добавить (импорты `act` из Testing Library, `setProgress`, `sceneStore`, `INITIAL_SCENE_STATE`; в `beforeEach` — `sceneStore.setState(INITIAL_SCENE_STATE, true)`):

```tsx
  it('режим сцены следует за прогрессом маршрута', () => {
    render(<App />);
    act(() => setProgress(1));
    expect(sceneStore.getState().mode).toBe('docked');
    act(() => setProgress(0));
    expect(sceneStore.getState().mode).toBe('travelling');
  });
```

`src/app/sceneFailure.test.tsx`: путь в `vi.mock` → `'@/widgets/scene/SceneLayer'`; добавить импорты `sceneStore`, `INITIAL_SCENE_STATE` и тест:

```tsx
  it('падение сцены в открытом зале возвращает документ', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true);

    render(<App />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Без onError у границы ошибок режим остался бы `exploring`: документ
    // скрыт, прокрутка заблокирована, сцены нет — пустой экран.
    expect(sceneStore.getState().mode).toBe('docked');
  });
```

`src/app/featureBoundaries.test.ts` — вынести разрешение пути в функцию и добавить проверку виджетов:

```ts
function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return `/src/${specifier.slice(2)}`;
  if (specifier.startsWith('.')) return new URL(specifier, `file://${fromFile}`).pathname;
  return null;
}

function importedFeature(fromFile: string, specifier: string): string | null {
  const path = resolveSpecifier(fromFile, specifier);
  return path === null ? null : featureOf(path);
}
```

и в `describe('границы фич')`:

```ts
  it('ни одна фича не импортирует виджет — виджет собирает фичи, а не наоборот', () => {
    const violations: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      for (const [, specifier] of code.matchAll(IMPORT_SPECIFIER)) {
        if (resolveSpecifier(file, specifier!)?.startsWith('/src/widgets/')) {
          violations.push(`${file} → ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
```

Заголовочный комментарий файла дополнить: «Виджет (`src/widgets/`) может импортировать фичи; фича виджет — нет».

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/widgets src/shared/ui src/app`
Expected: FAIL — нет `SceneReady`, `onError`, привязки режима к прогрессу; тест падения в зале красный.

- [ ] **Step 3: Перенести `SceneLayer` и добавить готовность**

```bash
mkdir -p src/widgets/scene
git mv src/features/career-flight/scene/SceneLayer.tsx src/widgets/scene/SceneLayer.tsx
```

`src/widgets/scene/SceneReady.tsx`:

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { dispatchScene } from '@/entities/scene-mode/sceneStore';

/**
 * «Сцена готова» = канвас отрисовал первый кадр, а не просто смонтирован:
 * кнопка «Открыть зал» не должна появиться раньше, чем зал можно увидеть.
 * Снятие при размонтировании выводит из режима исследования (редьюсер).
 */
export function SceneReady() {
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    dispatchScene({ type: 'sceneReady', ready: true });
  });

  useEffect(() => () => dispatchScene({ type: 'sceneReady', ready: false }), []);

  return null;
}
```

В `src/widgets/scene/SceneLayer.tsx`:
- импорты: `import { useSceneState } from '@/entities/scene-mode/sceneStore';`, `import { CareerScene } from '@/features/career-flight/scene/CareerScene';`, `import { CAMERA } from '@/features/career-flight/scene/sceneConfig';`, `import { SceneReady } from './SceneReady';`; ленивая панель — `lazy(() => import('@/features/career-flight/scene/debug/DevPanel'))`;
- тело `SceneLayer`:

```tsx
export default function SceneLayer() {
  // Указатель и жесты канвас получает только в режиме исследования зала:
  // в остальное время документ поверх сцены должен оставаться кликабельным,
  // а касание — прокручивать страницу (фаза 1.5; спека зала §5.5).
  const exploring = useSceneState((state) => state.mode === 'exploring');

  return (
    <div className="scene-layer" aria-hidden="true">
      {/* (прежний комментарий про inline pointer-events у обёртки R3F) */}
      <Canvas
        dpr={[1, 1.75]}
        camera={{ ...CAMERA }}
        style={{
          pointerEvents: exploring ? 'auto' : 'none',
          touchAction: exploring ? 'none' : 'auto',
        }}
      >
        <Suspense fallback={null}>
          <CareerScene />
          <SceneReady />
        </Suspense>
        <AdaptiveQuality />
        {DevPanel && (
          <Suspense fallback={null}>
            <DevPanel />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 4: `ErrorBoundary.onError` и `App`**

`src/shared/ui/ErrorBoundary.tsx`: `type Props = { children: ReactNode; onError?: () => void };`, в `componentDidCatch` первой строкой — `this.props.onError?.();`. В JSDoc добавить: «`onError` — для потребителя, которому мало «не рендерить ветку»: падение сцены в открытом зале обязано вернуть документ».

`src/app/App.tsx`:

```tsx
import { Suspense, lazy, useEffect } from 'react';
import { progressStore } from '@/entities/route/progressStore';
import { bindProgress, dispatchScene } from '@/entities/scene-mode/sceneStore';
// …прежние импорты…

// (прежний комментарий о ленивой границе чанка)
// oxlint-disable-next-line no-restricted-imports
const SceneLayer = lazy(() => import('@/widgets/scene/SceneLayer'));

/** Сцена упала — её больше нет: режим исследования закрывается, документ возвращается. */
function onSceneError() {
  dispatchScene({ type: 'sceneReady', ready: false });
}

export default function App() {
  const sceneEnabled = useSceneEnabled();
  useScrollProgress(sceneEnabled);
  useStationHash();
  // Режим сцены (полёт / стыковка / зал) выводится из прогресса маршрута.
  useEffect(() => bindProgress(progressStore), []);

  return (
    <>
      {sceneEnabled && (
        <ErrorBoundary onError={onSceneError}>
          {/* … */}
```

- [ ] **Step 5: Каталожное правило Oxlint**

В `.oxlintrc.json`:
- шаблон `"group": ["./scene/**", "../scene/**", "**/career-flight/scene/**"]` → `"group": ["./scene/**", "../scene/**", "**/scene/**"]`; сообщение — «Модули каталогов scene/ (src/features/*/scene/, src/widgets/scene/) тянут three и обязаны оставаться в ленивом чанке. Чистую математику берите из @/entities/…; SceneLayer подключайте только через lazy(() => import(...)).»; в комментарии над шаблоном дописать: «Любой каталог `scene/` — ленивый. Поэтому стор режимов сцены, живущий в главном чанке, называется `entities/scene-mode`, а не `entities/scene`.»;
- сообщения для `three` и `three/*`: `src/features/career-flight/scene/` → `каталогах scene/ (src/features/*/scene/, src/widgets/scene/)`;
- в `overrides`: `"files": ["src/features/career-flight/scene/**"]` → `"files": ["src/features/*/scene/**", "src/widgets/scene/**"]`; комментарий — «Ленивые поддеревья сцены: `scene/` каждой фичи и виджет, собирающий канвас».

`src/app/styles.css`: в комментарии над `.scene-layer` фразу «Возможно, фаза 3 переиспользует этот же проп для picking по узлам графа — решение не принято.» заменить на «В режиме исследования зала навыков SceneLayer переключает этот проп на auto (и touch-action на none) — только на время режима.».

- [ ] **Step 6: Прогон, мутации**

Run: `npm run lint && npm run typecheck && npx vitest run`
Expected: PASS.

Мутации:
1. В `componentDidCatch` убрать вызов `onError` → краснеют тест `ErrorBoundary` и «падение сцены в открытом зале возвращает документ». Вернуть.
2. Убрать `useEffect(() => bindProgress(…))` из `App` → краснеет «режим сцены следует за прогрессом». Вернуть.
3. Временно добавить в `src/features/career-flight/useStationHash.ts` строку `import '@/widgets/scene/SceneReady';` → краснеет «ни одна фича не импортирует виджет», а `npm run lint` — запрет `**/scene/**`. Вернуть.
4. Временно добавить в `src/entities/route/anchors.ts` `import 'three';` → `npm run lint` красный. Вернуть.

- [ ] **Step 7: Сборка и e2e**

Run: `npm run build && npm run check:size && npm run e2e`
Expected: PASS; `three` по-прежнему только в ленивых чанках (`check:size` назовёт чанк `SceneLayer-*.js`).

- [ ] **Step 8: Commit**

```bash
git add -A src/widgets src/features/career-flight/scene src/shared/ui src/app .oxlintrc.json
git commit -m "refactor: канвас в widgets/scene, готовность сцены и каталожный запрет scene/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Зал — узлы и рёбра

**Files:**
- Create (все в `src/features/skill-galaxy/scene/`): `hallData.ts`, `hallColors.ts`, `hallColors.test.ts`, `hallGeometry.ts`, `hallGeometry.test.ts`, `NodeInstances.tsx`, `HallEdges.tsx`, `SkillHall.tsx`, `SkillHall.test.tsx`
- Modify: `src/widgets/scene/SceneLayer.tsx`

**Interfaces:**
- Consumes: `skillGraph`, `SkillNode`, `HubNode`, `GraphNode`, `GraphEdge` (Task 3); `layoutGraph` (Task 4); `HALL_CENTER` (Task 1); `palette`.
- Produces: `hallGraph`, `hallPositions: Map<string, Vec3>`, `skillNodes: readonly SkillNode[]`, `hubNodes: readonly HubNode[]` — `hallData.ts`. `PLANNED_FADE = 0.7`, `nodeColor(node: GraphNode, target?: Color): Color` — `hallColors.ts`. `ARC_SEGMENTS = 16`, `ARC_LIFT = 3`, `segmentPositions(edges, positions): Float32Array`, `arcPoint(a, b, t): Vec3`, `arcPositions(edges, positions): Float32Array` — `hallGeometry.ts`. `NODE_RADIUS = 0.32`, `HUB_RADIUS = 0.6`, `SkillHall` — `SkillHall.tsx`. `NodeInstances({ nodes, positions, radius, shape, name })` — инстанс с индексом `i` = `nodes[i]` (таблица «instanceId → id» — сам массив). Имена объектов: `skill-hall`, `skill-hall-spin`, `hall-skills`, `hall-hubs`, `hall-applied-edges`, `hall-bridges`.

- [ ] **Step 1: Написать падающие тесты чистых функций**

`src/features/skill-galaxy/scene/hallColors.test.ts`:

```ts
import type { GraphNode } from '@/entities/skill/graph';
import { nodeColor } from './hallColors';

const skill = (domain: 'web' | 'ml', status: 'applied' | 'learning' | 'planned'): GraphNode => ({
  id: 'x',
  kind: 'skill',
  label: 'X',
  category: domain === 'web' ? 'framework' : 'mlops',
  domain,
  status,
});
const lightness = (node: GraphNode) => nodeColor(node).getHSL({ h: 0, s: 0, l: 0 }).l;

describe('nodeColor', () => {
  it('«в плане» тонет в фоне: темнее того же домена со статусом «применён»', () => {
    expect(lightness(skill('ml', 'planned'))).toBeLessThan(lightness(skill('ml', 'applied')));
  });

  it('«изучаю» — полный цвет домена', () => {
    expect(nodeColor(skill('ml', 'learning')).equals(nodeColor(skill('ml', 'applied')))).toBe(true);
  });

  it('домены различаются цветом', () => {
    expect(nodeColor(skill('web', 'applied')).equals(nodeColor(skill('ml', 'applied')))).toBe(false);
  });
});
```

`src/features/skill-galaxy/scene/hallGeometry.test.ts`:

```ts
import { ARC_LIFT, ARC_SEGMENTS, arcPoint, arcPositions, segmentPositions } from './hallGeometry';

const positions = new Map([
  ['a', { x: -6, y: 0, z: 0 }],
  ['b', { x: 6, y: 2, z: 0 }],
]);
const edge = { from: 'a', to: 'b', kind: 'bridge' as const };

describe('hallGeometry', () => {
  it('отрезок ребра — две вершины из раскладки', () => {
    expect([...segmentPositions([edge], positions)]).toEqual([-6, 0, 0, 6, 2, 0]);
  });

  it('дуга моста начинается и кончается в узлах', () => {
    expect(arcPoint(positions.get('a')!, positions.get('b')!, 0)).toEqual({ x: -6, y: 0, z: 0 });
    expect(arcPoint(positions.get('a')!, positions.get('b')!, 1)).toEqual({ x: 6, y: 2, z: 0 });
  });

  it('дуга поднимается над разрывом', () => {
    const middle = arcPoint(positions.get('a')!, positions.get('b')!, 0.5);
    expect(middle.y).toBeCloseTo(1 + ARC_LIFT / 2, 10);
  });

  it('дуга — ARC_SEGMENTS отрезков, концы соседних совпадают', () => {
    const array = arcPositions([edge], positions);
    expect(array).toHaveLength(ARC_SEGMENTS * 6);
    expect([...array.slice(3, 6)]).toEqual([...array.slice(6, 9)]);
  });
});
```

- [ ] **Step 2: Убедиться, что падают; реализовать**

Run: `npx vitest run src/features/skill-galaxy` — FAIL (модулей нет).

`src/features/skill-galaxy/scene/hallData.ts`:

```ts
import { skillGraph, type HubNode, type SkillNode } from '@/entities/skill/graph';
import { layoutGraph } from '@/entities/skill/layout';

/** Граф и раскладка зала — модульные синглтоны ленивого чанка, считаются один раз. */
export const hallGraph = skillGraph;
export const hallPositions = layoutGraph(hallGraph);
export const skillNodes: readonly SkillNode[] = hallGraph.nodes.filter(
  (node): node is SkillNode => node.kind === 'skill',
);
export const hubNodes: readonly HubNode[] = hallGraph.nodes.filter(
  (node): node is HubNode => node.kind !== 'skill',
);
```

`src/features/skill-galaxy/scene/hallColors.ts`:

```ts
import { Color } from 'three';
import type { GraphNode } from '@/entities/skill/graph';
import { palette } from '@/shared/config/palette';

/** Доля фона в цвете узла «в плане»: узел «тонет в тумане», но не исчезает. */
export const PLANNED_FADE = 0.7;

const BACKGROUND = new Color(palette.background);

/**
 * Цвет — по домену (веб — цвет текста, ML — акцент), а не по 14 категориям:
 * эстетика фазы 2 держится на одном акценте (спека зала, §5.2). Статус —
 * смешением с фоном, без прозрачности: прозрачные инстансы пришлось бы
 * сортировать.
 */
export function nodeColor(node: GraphNode, target = new Color()): Color {
  target.set(node.domain === 'web' ? palette.foreground : palette.accent);
  if (node.kind === 'skill' && node.status === 'planned') target.lerp(BACKGROUND, PLANNED_FADE);
  return target;
}
```

`src/features/skill-galaxy/scene/hallGeometry.ts`:

```ts
import type { GraphEdge } from '@/entities/skill/graph';
import type { Vec3 } from '@/shared/lib/vec3';

/** Отрезков в дуге моста. */
export const ARC_SEGMENTS = 16;
/** Подъём контрольной точки дуги над серединой моста. */
export const ARC_LIFT = 3;

type Positions = ReadonlyMap<string, Vec3>;

/** Вершины `LineSegments`: по паре на ребро. */
export function segmentPositions(edges: readonly GraphEdge[], positions: Positions): Float32Array {
  const array = new Float32Array(edges.length * 6);
  edges.forEach((edge, index) => {
    const a = positions.get(edge.from)!;
    const b = positions.get(edge.to)!;
    array.set([a.x, a.y, a.z, b.x, b.y, b.z], index * 6);
  });
  return array;
}

/** Квадратичная кривая Безье от a к b через точку над их серединой. */
export function arcPoint(a: Vec3, b: Vec3, t: number): Vec3 {
  const control = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + ARC_LIFT, z: (a.z + b.z) / 2 };
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
    z: u * u * a.z + 2 * u * t * control.z + t * t * b.z,
  };
}

/** Вершины `LineSegments` для дуг мостов: `ARC_SEGMENTS` отрезков на мост. */
export function arcPositions(edges: readonly GraphEdge[], positions: Positions): Float32Array {
  const array = new Float32Array(edges.length * ARC_SEGMENTS * 6);
  let offset = 0;
  for (const edge of edges) {
    const a = positions.get(edge.from)!;
    const b = positions.get(edge.to)!;
    for (let s = 0; s < ARC_SEGMENTS; s += 1) {
      const p = arcPoint(a, b, s / ARC_SEGMENTS);
      const q = arcPoint(a, b, (s + 1) / ARC_SEGMENTS);
      array.set([p.x, p.y, p.z, q.x, q.y, q.z], offset);
      offset += 6;
    }
  }
  return array;
}
```

Run: `npx vitest run src/features/skill-galaxy` — PASS.

- [ ] **Step 3: Написать падающие тесты компонента**

`src/features/skill-galaxy/scene/SkillHall.test.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import {
  Color,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type LineSegments,
  type Mesh,
  type Object3D,
} from 'three';
import { HALL_CENTER } from '@/entities/route/anchors';
import { ARC_SEGMENTS } from './hallGeometry';
import { hallGraph, hallPositions, hubNodes, skillNodes } from './hallData';
import { SkillHall } from './SkillHall';

async function renderHall() {
  const renderer = await ReactThreeTestRenderer.create(<SkillHall />);
  const hall = renderer.scene.children[0]!.instance as Object3D;
  const byName = <T extends Object3D>(name: string) => hall.getObjectByName(name) as T;
  return { renderer, hall, byName };
}

function instancePosition(mesh: InstancedMesh, index: number): Vector3 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  const position = new Vector3();
  matrix.decompose(position, new Quaternion(), new Vector3());
  return position;
}

describe('SkillHall', () => {
  it('зал добавляет ровно 4 draw call: два InstancedMesh и два LineSegments', async () => {
    const { hall } = await renderHall();
    let instanced = 0;
    let lines = 0;
    let other = 0;
    hall.traverse((object) => {
      if ((object as InstancedMesh).isInstancedMesh) instanced += 1;
      else if ((object as LineSegments).isLineSegments) lines += 1;
      else if ((object as Mesh).isMesh) other += 1;
    });
    expect({ instanced, lines, other }).toEqual({ instanced: 2, lines: 2, other: 0 });
  });

  it('стоит в центре зала из геометрии маршрута', async () => {
    const { hall } = await renderHall();
    expect(hall.position.toArray()).toEqual([HALL_CENTER.x, HALL_CENTER.y, HALL_CENTER.z]);
  });

  it('инстансов столько же, сколько узлов каждого вида', async () => {
    const { byName } = await renderHall();
    expect(byName<InstancedMesh>('hall-skills').count).toBe(skillNodes.length);
    expect(byName<InstancedMesh>('hall-hubs').count).toBe(hubNodes.length);
  });

  it('инстанс с индексом i — это узел i и стоит в его позиции раскладки', async () => {
    const { byName } = await renderHall();
    const mesh = byName<InstancedMesh>('hall-skills');
    skillNodes.forEach((node, index) => {
      const expected = hallPositions.get(node.id)!;
      expect(instancePosition(mesh, index).distanceTo(new Vector3(expected.x, expected.y, expected.z))).toBeLessThan(1e-5);
    });
  });

  it('ограничивающая сфера охватывает все узлы — иначе отсечение спрячет зал', async () => {
    const { byName } = await renderHall();
    for (const name of ['hall-skills', 'hall-hubs']) {
      const mesh = byName<InstancedMesh>(name);
      expect(mesh.boundingSphere).not.toBeNull();
      for (let index = 0; index < mesh.count; index += 1) {
        expect(mesh.boundingSphere!.containsPoint(instancePosition(mesh, index))).toBe(true);
      }
    }
  });

  it('узел «в плане» темнее изучаемого того же домена', async () => {
    const { byName } = await renderHall();
    const mesh = byName<InstancedMesh>('hall-skills');
    const lightness = (id: string) => {
      const color = new Color();
      mesh.getColorAt(skillNodes.findIndex((node) => node.id === id), color);
      return color.getHSL({ h: 0, s: 0, l: 0 }).l;
    };
    expect(lightness('onnx')).toBeLessThan(lightness('python'));
  });

  it('вершин рёбер: по паре на ребро applied и 2·ARC_SEGMENTS на мост', async () => {
    const { byName } = await renderHall();
    const count = (name: string) =>
      (byName<LineSegments>(name).geometry as BufferGeometry).getAttribute('position').count;
    const applied = hallGraph.edges.filter((edge) => edge.kind === 'applied').length;
    const bridges = hallGraph.edges.filter((edge) => edge.kind === 'bridge').length;
    expect(count('hall-applied-edges')).toBe(applied * 2);
    expect(count('hall-bridges')).toBe(bridges * ARC_SEGMENTS * 2);
  });
});
```

- [ ] **Step 4: Убедиться, что падают; реализовать компоненты**

Run: `npx vitest run src/features/skill-galaxy/scene/SkillHall.test.tsx` — FAIL.

`src/features/skill-galaxy/scene/NodeInstances.tsx`:

```tsx
import { useLayoutEffect, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import type { GraphNode } from '@/entities/skill/graph';
import type { Vec3 } from '@/shared/lib/vec3';
import { nodeColor } from './hallColors';

type Props = {
  nodes: readonly GraphNode[];
  positions: ReadonlyMap<string, Vec3>;
  radius: number;
  shape: 'icosahedron' | 'octahedron';
  name: string;
};

/**
 * Узлы одного вида одним `InstancedMesh`. Индекс инстанса = индекс в `nodes`:
 * это и есть таблица «instanceId → id узла» для выбора лучом.
 */
export function NodeInstances({ nodes, positions, radius, shape, name }: Props) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current!;
    const matrix = new Matrix4();
    const color = new Color();
    nodes.forEach((node, index) => {
      const p = positions.get(node.id)!;
      matrix.makeScale(radius, radius, radius).setPosition(p.x, p.y, p.z);
      instanced.setMatrixAt(index, matrix);
      instanced.setColorAt(index, nodeColor(node, color));
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    // Как у рельефа: сфера, посчитанная до записи матриц, описывает единичную
    // геометрию в начале координат, и отсечение прятало бы весь зал.
    instanced.computeBoundingSphere();
  }, [nodes, positions, radius]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]} name={name}>
      {shape === 'icosahedron' ? <icosahedronGeometry args={[1, 1]} /> : <octahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial roughness={0.4} metalness={0.1} />
    </instancedMesh>
  );
}
```

`src/features/skill-galaxy/scene/HallEdges.tsx`:

```tsx
import { useMemo } from 'react';
import type { GraphEdge } from '@/entities/skill/graph';
import { palette } from '@/shared/config/palette';
import type { Vec3 } from '@/shared/lib/vec3';
import { arcPositions, segmentPositions } from './hallGeometry';

type Props = { edges: readonly GraphEdge[]; positions: ReadonlyMap<string, Vec3> };

/** Два draw call на все рёбра: «применён здесь» — приглушённо, мосты — акцентом. */
export function HallEdges({ edges, positions }: Props) {
  const applied = useMemo(
    () => segmentPositions(edges.filter((edge) => edge.kind === 'applied'), positions),
    [edges, positions],
  );
  const arcs = useMemo(
    () => arcPositions(edges.filter((edge) => edge.kind === 'bridge'), positions),
    [edges, positions],
  );

  return (
    <>
      <lineSegments name="hall-applied-edges">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[applied, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.muted} transparent opacity={0.35} />
      </lineSegments>
      <lineSegments name="hall-bridges">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[arcs, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.accent} />
      </lineSegments>
    </>
  );
}
```

`src/features/skill-galaxy/scene/SkillHall.tsx`:

```tsx
import { HALL_CENTER } from '@/entities/route/anchors';
import { HallEdges } from './HallEdges';
import { hallGraph, hallPositions, hubNodes, skillNodes } from './hallData';
import { NodeInstances } from './NodeInstances';

export const NODE_RADIUS = 0.32;
export const HUB_RADIUS = 0.6;

/**
 * Зал навыков — 4 draw call (спека зала, §5.2). Внешняя группа ставит зал в
 * мир, внутренняя (`skill-hall-spin`) в Task 9 начнёт вращаться.
 */
export function SkillHall() {
  return (
    <group name="skill-hall" position={[HALL_CENTER.x, HALL_CENTER.y, HALL_CENTER.z]}>
      <group name="skill-hall-spin">
        <NodeInstances nodes={skillNodes} positions={hallPositions} radius={NODE_RADIUS} shape="icosahedron" name="hall-skills" />
        <NodeInstances nodes={hubNodes} positions={hallPositions} radius={HUB_RADIUS} shape="octahedron" name="hall-hubs" />
        <HallEdges edges={hallGraph.edges} positions={hallPositions} />
      </group>
    </group>
  );
}
```

`src/widgets/scene/SceneLayer.tsx`: импорт `import { SkillHall } from '@/features/skill-galaxy/scene/SkillHall';`, в `<Suspense>` между `<CareerScene />` и `<SceneReady />` — `<SkillHall />`.

- [ ] **Step 5: Тесты зелёные, мутации**

Run: `npx vitest run`
Expected: PASS.

Мутации:
1. Убрать `computeBoundingSphere()` в `NodeInstances` → краснеет тест сферы. Вернуть.
2. В `nodeColor` убрать смешение с фоном → краснеют `hallColors.test.ts` и тест «в плане» темнее. Вернуть.
3. Добавить в `SkillHall` лишний `<mesh><boxGeometry /></mesh>` → краснеет «4 draw call». Вернуть.

- [ ] **Step 6: Глазами и e2e**

`npm run dev`: прокрутить до конца — зал виден на горизонте с последней станции, у стыковки — целиком; веб слева, ML справа, бирюзовые дуги мостов над разрывом. Результат и скриншот — в отчёт задачи.

Run: `npm run build && npm run check:size && npm run e2e`
Expected: PASS; размер ленивых чанков записать в отчёт.

- [ ] **Step 7: Commit**

```bash
git add src/features/skill-galaxy src/widgets/scene/SceneLayer.tsx
git commit -m "feat: зал навыков — узлы и хабы инстансами, рёбра и мосты двумя LineSegments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Камера у зала, вращение галактики и пульсация

**Files:**
- Modify: `src/features/career-flight/scene/CameraRig.tsx`, `CameraRig.test.tsx`
- Create (в `src/features/skill-galaxy/scene/`): `spin.ts`, `spin.test.ts`, `spinStore.ts`, `hallScale.ts`, `hallScale.test.ts`
- Modify: `src/features/skill-galaxy/scene/SkillHall.tsx`, `NodeInstances.tsx`, `SkillHall.test.tsx`
- Modify: `e2e/smoke.spec.ts` (тест «камера движется»)

**Interfaces:**
- Consumes: `sceneStore`, `SceneMode`, `SceneState`, `INITIAL_SCENE_STATE` (Task 5); `HALL_DOCK_POINT`, `HALL_CENTER_POINT` (Task 1).
- Produces: `type Spin = { yaw; pitch; yawVelocity; pitchVelocity }`, `SPIN = { idleSpeed: 0.12, damping: 3, maxPitch: 0.6, dragGain: 0.006, maxVelocity: 4 }`, `INITIAL_SPIN`, `stepSpin(spin, delta, mode, dragging): Spin` (тот же объект, если зал неподвижен), `dragSpin(spin, dx, dy, dt): Spin` — `spin.ts`. `spinStore: StoreApi<{ spin: Spin; dragging: boolean }>` — `spinStore.ts`. `EMPHASIS_SCALE = 1.6`, `PULSE_AMPLITUDE = 0.25`, `PULSE_SPEED = 3`, `instanceScale(node, state, time): number` — `hallScale.ts`.

- [ ] **Step 1: Написать падающие тесты**

`src/features/skill-galaxy/scene/spin.test.ts`:

```ts
import { INITIAL_SPIN, SPIN, dragSpin, stepSpin } from './spin';

describe('stepSpin', () => {
  it('в полёте зал неподвижен', () => {
    expect(stepSpin(INITIAL_SPIN, 0.1, 'travelling', false)).toBe(INITIAL_SPIN);
  });

  it('в стыковке медленно вращается по yaw', () => {
    expect(stepSpin(INITIAL_SPIN, 1, 'docked', false).yaw).toBeCloseTo(SPIN.idleSpeed, 10);
  });

  it('пока указатель тянет, шаг кадра углы не трогает', () => {
    const dragged = { ...INITIAL_SPIN, yawVelocity: 2 };
    expect(stepSpin(dragged, 0.1, 'exploring', true)).toBe(dragged);
  });

  it('в исследовании после отпускания — инерция с затуханием', () => {
    const released = { ...INITIAL_SPIN, yawVelocity: 2 };
    const next = stepSpin(released, 0.1, 'exploring', false);
    expect(next.yaw).toBeCloseTo(0.2, 10);
    expect(next.yawVelocity).toBeLessThan(2);
    expect(next.yawVelocity).toBeGreaterThan(0);
  });

  it('наклон ограничен', () => {
    const spinning = { ...INITIAL_SPIN, pitch: SPIN.maxPitch, pitchVelocity: 3 };
    expect(stepSpin(spinning, 0.5, 'exploring', false).pitch).toBe(SPIN.maxPitch);
  });
});

describe('dragSpin', () => {
  it('смещение указателя поворачивает зал и задаёт скорость', () => {
    const next = dragSpin(INITIAL_SPIN, 100, 0, 0.1);
    expect(next.yaw).toBeCloseTo(100 * SPIN.dragGain, 10);
    expect(next.yawVelocity).toBeCloseTo((100 * SPIN.dragGain) / 0.1, 10);
  });

  it('скорость ограничена, нулевой интервал не даёт бесконечность', () => {
    expect(dragSpin(INITIAL_SPIN, 5000, 0, 0.001).yawVelocity).toBe(SPIN.maxVelocity);
    expect(dragSpin(INITIAL_SPIN, 10, 0, 0).yawVelocity).toBe(0);
  });

  it('наклон не выходит за предел', () => {
    expect(dragSpin(INITIAL_SPIN, 0, 10_000, 0.1).pitch).toBe(SPIN.maxPitch);
  });
});
```

`src/features/skill-galaxy/scene/hallScale.test.ts`:

```ts
import type { GraphNode } from '@/entities/skill/graph';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { EMPHASIS_SCALE, instanceScale } from './hallScale';

const learning: GraphNode = { id: 'python', kind: 'skill', label: 'Python', category: 'ml-data', domain: 'ml', status: 'learning' };
const applied: GraphNode = { id: 'react', kind: 'skill', label: 'React', category: 'framework', domain: 'web', status: 'applied' };
const docked = { ...INITIAL_SCENE_STATE, mode: 'docked' as const };

describe('instanceScale', () => {
  it('в полёте всё неподвижно, даже изучаемое', () => {
    expect(instanceScale(learning, INITIAL_SCENE_STATE, 0.5)).toBe(1);
  });

  it('у зала изучаемый узел пульсирует', () => {
    expect(instanceScale(learning, docked, 0.5)).not.toBe(instanceScale(learning, docked, 1));
  });

  it('применённый узел не пульсирует', () => {
    expect(instanceScale(applied, docked, 0.5)).toBe(1);
  });

  it('подсвеченный и выбранный узлы крупнее', () => {
    expect(instanceScale(applied, { ...docked, highlightedId: 'react' }, 0)).toBe(EMPHASIS_SCALE);
    expect(instanceScale(applied, { ...docked, mode: 'exploring', selectedId: 'react' }, 0)).toBe(EMPHASIS_SCALE);
  });
});
```

В `CameraRig.test.tsx` добавить (импорты `Vector3` из `three`, `sceneStore`, `INITIAL_SCENE_STATE`, `HALL_CENTER_POINT`, `HALL_DOCK_POINT` из `./route`; `afterEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true))`):

```tsx
  it('у зала стоит в точке стыковки и смотрит в центр зала', async () => {
    progressStore.setState({ progress: 1 });
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked' }, true);
    const { renderer, getCamera } = await mount();
    await renderer.advanceFrames(240, 0.016);

    const camera = getCamera();
    expect(camera.position.distanceTo(HALL_DOCK_POINT)).toBeLessThan(1e-3);
    // На прогрессе 1 касательная маршрута смотрит вверх по подъёму (≈45°),
    // поэтому без режима стыковки скалярное произведение было бы ≈0.7.
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    const toCenter = HALL_CENTER_POINT.clone().sub(camera.position).normalize();
    expect(forward.dot(toCenter)).toBeGreaterThan(0.999);
  });
```

В `SkillHall.test.tsx` добавить (импорты `sceneStore`, `INITIAL_SCENE_STATE`, `spinStore`, `INITIAL_SPIN`, `NODE_RADIUS`; `beforeEach(() => { sceneStore.setState(INITIAL_SCENE_STATE, true); spinStore.setState({ spin: INITIAL_SPIN, dragging: false }); })`):

```tsx
  const scaleOf = (mesh: InstancedMesh, id: string) => {
    const matrix = new Matrix4();
    mesh.getMatrixAt(skillNodes.findIndex((node) => node.id === id), matrix);
    const scale = new Vector3();
    matrix.decompose(new Vector3(), new Quaternion(), scale);
    return scale.x;
  };

  it('в полёте зал неподвижен', async () => {
    const { renderer, byName } = await renderHall();
    await renderer.advanceFrames(30, 0.05);
    expect(byName('skill-hall-spin').rotation.y).toBe(0);
    expect(scaleOf(byName<InstancedMesh>('hall-skills'), 'python')).toBeCloseTo(NODE_RADIUS, 10);
  });

  it('в стыковке зал вращается, изучаемый узел пульсирует', async () => {
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked' }, true);
    const { renderer, byName } = await renderHall();
    await renderer.advanceFrames(10, 0.05);
    expect(byName('skill-hall-spin').rotation.y).toBeGreaterThan(0);
    const mesh = byName<InstancedMesh>('hall-skills');
    const first = scaleOf(mesh, 'python');
    await renderer.advanceFrames(3, 0.05);
    expect(scaleOf(mesh, 'python')).not.toBeCloseTo(first, 5);
  });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/features/skill-galaxy src/features/career-flight/scene/CameraRig.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/features/skill-galaxy/scene/spin.ts`:

```ts
import type { SceneMode } from '@/entities/scene-mode/sceneMode';

/**
 * Вращение зала. Вращается галактика, а не камера: камера у зала не покидает
 * точку стыковки, и поле рельефа не приходится расширять (спека зала, §5.1).
 */
export type Spin = { yaw: number; pitch: number; yawVelocity: number; pitchVelocity: number };

export const SPIN = {
  /** Собственное вращение в стыковке, рад/с. */
  idleSpeed: 0.12,
  /** Затухание инерции после отпускания, 1/с. */
  damping: 3,
  /** Предел наклона, рад. */
  maxPitch: 0.6,
  /** Радиан на пиксель перетаскивания. */
  dragGain: 0.006,
  /** Предел скорости инерции, рад/с. */
  maxVelocity: 4,
} as const;

export const INITIAL_SPIN: Spin = { yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0 };

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

export function stepSpin(spin: Spin, delta: number, mode: SceneMode, dragging: boolean): Spin {
  // В полёте зал неподвижен: кадр у маршрута стабилен (на этом держатся
  // пиксельные e2e), а GPU не тратится на далёкую анимацию.
  if (mode === 'travelling' || dragging) return spin;
  if (mode === 'docked') {
    return { ...spin, yaw: spin.yaw + SPIN.idleSpeed * delta, yawVelocity: 0, pitchVelocity: 0 };
  }
  const decay = Math.exp(-SPIN.damping * delta);
  return {
    yaw: spin.yaw + spin.yawVelocity * delta,
    pitch: clamp(spin.pitch + spin.pitchVelocity * delta, SPIN.maxPitch),
    yawVelocity: spin.yawVelocity * decay,
    pitchVelocity: spin.pitchVelocity * decay,
  };
}

/** Смещение указателя за `dt` секунд → углы и скорость для инерции. */
export function dragSpin(spin: Spin, dx: number, dy: number, dt: number): Spin {
  const yawStep = dx * SPIN.dragGain;
  const pitchStep = dy * SPIN.dragGain;
  const velocity = (step: number) => (dt > 0 ? clamp(step / dt, SPIN.maxVelocity) : 0);
  return {
    yaw: spin.yaw + yawStep,
    pitch: clamp(spin.pitch + pitchStep, SPIN.maxPitch),
    yawVelocity: velocity(yawStep),
    pitchVelocity: velocity(pitchStep),
  };
}
```

`src/features/skill-galaxy/scene/spinStore.ts`:

```ts
import { createStore } from 'zustand/vanilla';
import { INITIAL_SPIN, type Spin } from './spin';

/** Читается и пишется в цикле кадра и в обработчиках указателя — без React. */
export const spinStore = createStore<{ spin: Spin; dragging: boolean }>(() => ({
  spin: INITIAL_SPIN,
  dragging: false,
}));
```

`src/features/skill-galaxy/scene/hallScale.ts`:

```ts
import type { SceneState } from '@/entities/scene-mode/sceneMode';
import type { GraphNode } from '@/entities/skill/graph';

export const EMPHASIS_SCALE = 1.6;
export const PULSE_AMPLITUDE = 0.25;
/** Рад/с. */
export const PULSE_SPEED = 3;

/** Множитель масштаба узла: подсветка/выбор крупнее, «изучаю» у зала пульсирует. */
export function instanceScale(
  node: GraphNode,
  state: Pick<SceneState, 'mode' | 'highlightedId' | 'selectedId'>,
  time: number,
): number {
  if (node.id === state.highlightedId || node.id === state.selectedId) return EMPHASIS_SCALE;
  if (state.mode !== 'travelling' && node.kind === 'skill' && node.status === 'learning') {
    return 1 + PULSE_AMPLITUDE * Math.sin(time * PULSE_SPEED);
  }
  return 1;
}
```

`NodeInstances.tsx` — добавить запоминание масштабов и шаг кадра (импорты `useFrame` из `@react-three/fiber`, `sceneStore` из `@/entities/scene-mode/sceneStore`, `instanceScale` из `./hallScale`):

```tsx
  // Масштаб, записанный в матрицу инстанса в прошлый раз: матрица
  // переписывается только у изменившихся узлов (обычно — 1–3 за кадр).
  const scales = useRef<number[]>([]);
  // Время пульсации копится из delta кадра, а не из clock: тест с
  // advanceFrames шагает delta детерминированно, а clock идёт по часам.
  const time = useRef(0);

  // в конце useLayoutEffect, после computeBoundingSphere():
  //   scales.current = nodes.map(() => 1);

  useFrame((_, delta) => {
    time.current += delta;
    const instanced = mesh.current;
    if (!instanced) return;
    const state = sceneStore.getState();
    const matrix = new Matrix4();
    let changed = false;
    nodes.forEach((node, index) => {
      const scale = instanceScale(node, state, time.current);
      if (scale === scales.current[index]) return;
      scales.current[index] = scale;
      changed = true;
      const p = positions.get(node.id)!;
      const size = radius * scale;
      matrix.makeScale(size, size, size).setPosition(p.x, p.y, p.z);
      instanced.setMatrixAt(index, matrix);
    });
    if (changed) instanced.instanceMatrix.needsUpdate = true;
  });
```

`SkillHall.tsx` — внутреннюю группу заменить компонентом `SpinningGroup` (импорты `useFrame`, `useRef`, `type ReactNode`, `type Group`, `sceneStore`, `spinStore`, `stepSpin`):

```tsx
function SpinningGroup({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const { mode } = sceneStore.getState();
    const { spin, dragging } = spinStore.getState();
    const next = stepSpin(spin, delta, mode, dragging);
    if (next !== spin) spinStore.setState({ spin: next });
    // Порядок Эйлера XYZ: сначала yaw вокруг вертикали, затем наклон —
    // как глобус, который крутят и наклоняют к себе.
    group.current!.rotation.set(next.pitch, next.yaw, 0);
  });

  return (
    <group ref={group} name="skill-hall-spin">
      {children}
    </group>
  );
}
```

`CameraRig.tsx` — в начале `useFrame` (импорты `sceneStore`, `HALL_CENTER_POINT`, `HALL_DOCK_POINT`):

```ts
    // У зала камера стоит в точке стыковки и смотрит в его центр; вращается
    // сама галактика (spin.ts). Стыковка — конец маршрута, поэтому переход
    // из полёта — это только поворот взгляда, сглаженный stepCamera.
    const { mode } = sceneStore.getState();
    const { position, target } =
      mode === 'travelling'
        ? progressToCamera(progressStore.getState().progress)
        : { position: HALL_DOCK_POINT, target: HALL_CENTER_POINT };
```

(прежние строки чтения `progress` и вызова `progressToCamera` удалить). Комментарий JSDoc компонента дополнить: «Режим сцены читается из `sceneStore` так же, без React».

- [ ] **Step 4: e2e — кадр «после прокрутки» берётся на маршруте, не у зала**

В `e2e/smoke.spec.ts`, тест `'камера движется: кадр при прокрутке в конец отличается от начального'`: переименовать в `'камера движется: кадр у последней станции отличается от начального'`; прокрутку заменить на

```ts
    await page.evaluate(() => document.getElementById('amazingcat')!.scrollIntoView());
```

и дописать в комментарий: «У зала (конец документа) галактика вращается и кадр не стабилизируется никогда, поэтому второй кадр берётся у последней станции — там сцена неподвижна (spin.ts: в полёте зал стоит)».

- [ ] **Step 5: Прогон, мутации**

Run: `npx vitest run && npm run build && npm run e2e`
Expected: PASS.

Мутации:
1. В `CameraRig` всегда брать `progressToCamera` → краснеет «у зала … смотрит в центр». Вернуть.
2. В `stepSpin` убрать ранний выход для `travelling` → краснеют `spin.test.ts` и «в полёте зал неподвижен». Вернуть.
3. В `instanceScale` убрать условие `state.mode !== 'travelling'` → краснеют «в полёте всё неподвижно» и тест масштаба в `SkillHall.test.tsx`. Вернуть.
4. В `dragSpin` убрать `dt > 0 ?` → краснеет «нулевой интервал не даёт бесконечность». Вернуть.

- [ ] **Step 6: Commit**

```bash
git add src/features/skill-galaxy src/features/career-flight/scene/CameraRig.tsx src/features/career-flight/scene/CameraRig.test.tsx e2e/smoke.spec.ts
git commit -m "feat: камера стыкуется у зала, галактика вращается, «изучаю» пульсирует

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Режим исследования — документ (кнопка, блокировка, история, Lenis)

**Files:**
- Create: `src/features/skill-galaxy/OpenHallButton.tsx`, `OpenHallButton.test.tsx`
- Create: `src/features/skill-galaxy/useHallDocument.ts`, `useHallDocument.test.tsx`
- Modify: `src/features/scroll-bridge/useScrollProgress.ts`, `useScrollProgress.test.ts`
- Modify: `src/app/App.tsx`, `App.test.tsx`, `styles.css`

**Interfaces:**
- Consumes: `sceneStore`, `dispatchScene`, `useSceneState`, `INITIAL_SCENE_STATE` (Task 5); `ResumeDocument({ skillsAction })` (Task 6).
- Produces: `OpenHallButton` (рендерится при `sceneReady && mode !== 'travelling'`; доступное имя «Открыть зал навыков»); `useHallDocument(): void`, `HALL_OPEN_CLASS = 'hall-open'` — главный чанк, без `three`. Все пути закрытия сводятся к `dispatchScene({ type: 'closeHall' })`; эффект `useHallDocument` при выходе из `exploring` снимает класс, восстанавливает прокрутку и, если сверху своя запись истории, делает `history.back()`.

- [ ] **Step 1: Написать падающие тесты**

`src/features/skill-galaxy/OpenHallButton.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { INITIAL_SCENE_STATE, type SceneState } from '@/entities/scene-mode/sceneMode';
import { dispatchScene, sceneStore } from '@/entities/scene-mode/sceneStore';
import { OpenHallButton } from './OpenHallButton';

const setScene = (patch: Partial<SceneState>) =>
  act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, ...patch }, true));
const button = () => screen.queryByRole('button', { name: 'Открыть зал навыков' });

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('OpenHallButton', () => {
  it('без готовой сцены кнопки нет — даже в стыковке', () => {
    setScene({ mode: 'docked' });
    render(<OpenHallButton />);
    expect(button()).toBeNull();
  });

  it('в полёте кнопки нет', () => {
    setScene({ sceneReady: true });
    render(<OpenHallButton />);
    expect(button()).toBeNull();
  });

  it('в стыковке при готовой сцене открывает зал', () => {
    setScene({ mode: 'docked', sceneReady: true });
    render(<OpenHallButton />);
    fireEvent.click(button()!);
    expect(sceneStore.getState().mode).toBe('exploring');
  });

  it('после закрытия зала фокус возвращается на кнопку', () => {
    setScene({ mode: 'docked', sceneReady: true });
    render(<OpenHallButton />);
    fireEvent.click(button()!);
    act(() => dispatchScene({ type: 'closeHall' }));
    expect(button()).toHaveFocus();
  });
});
```

`src/features/skill-galaxy/useHallDocument.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { dispatchScene, sceneStore } from '@/entities/scene-mode/sceneStore';
import { HALL_OPEN_CLASS, useHallDocument } from './useHallDocument';

const root = document.documentElement;
const openHall = () =>
  act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true));
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sceneStore.setState(INITIAL_SCENE_STATE, true);
  root.classList.remove(HALL_OPEN_CLASS);
  window.history.replaceState(null, '', '/');
  scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('scrollY', 1234);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useHallDocument', () => {
  it('открытый зал блокирует документ и кладёт запись в историю', () => {
    const push = vi.spyOn(window.history, 'pushState');
    renderHook(() => useHallDocument());
    openHall();
    expect(root).toHaveClass(HALL_OPEN_CLASS);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('Esc закрывает зал, снимает блокировку и возвращает позицию прокрутки', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(sceneStore.getState().mode).toBe('docked');
    expect(root).not.toHaveClass(HALL_OPEN_CLASS);
    expect(scrollTo).toHaveBeenCalledWith(0, 1234);
  });

  it('«назад» закрывает зал и не уходит ещё на шаг назад', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => {
      // Браузер при «назад» уже снял нашу запись: сверху — прежняя.
      window.history.replaceState(null, '');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(sceneStore.getState().mode).toBe('docked');
    expect(back).not.toHaveBeenCalled();
  });

  it('закрытие кнопкой убирает свою запись истории', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => dispatchScene({ type: 'closeHall' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('падение сцены в открытом зале снимает блокировку', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => dispatchScene({ type: 'sceneReady', ready: false }));
    expect(root).not.toHaveClass(HALL_OPEN_CLASS);
  });
});
```

В `src/features/scroll-bridge/useScrollProgress.test.ts` добавить (импорты `sceneStore`, `INITIAL_SCENE_STATE`):

```ts
  it('в зале навыков инерционный скролл останавливается, после закрытия — продолжается', async () => {
    const instance = { on: vi.fn(), raf: vi.fn(), destroy: vi.fn(), stop: vi.fn(), start: vi.fn() };
    LenisCtor.mockImplementationOnce(function () {
      return instance;
    });
    mockMatchMedia({ coarse: false });
    renderHook(() => useScrollProgress(SCENE_MOUNTED));
    await flushMicrotasks();

    act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true));
    expect(instance.stop).toHaveBeenCalledTimes(1);
    act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true));
    expect(instance.start).toHaveBeenCalled();
    sceneStore.setState(INITIAL_SCENE_STATE, true);
  });
```

(Если в файле уже есть общий `beforeEach` с `mockMatchMedia`, повторный вызов не нужен — оставить один.)

В `src/app/App.test.tsx` добавить (импорты `renderToString` из `react-dom/server`, `act`):

```tsx
  it('кнопка зала появляется в стыковке при готовой сцене', () => {
    render(<App />);
    act(() => {
      setProgress(1);
      sceneStore.setState({ ...sceneStore.getState(), sceneReady: true });
    });
    expect(screen.getByRole('button', { name: 'Открыть зал навыков' })).toBeInTheDocument();
  });

  it('в предрендере кнопки зала нет, даже если на клиенте зал уже готов', () => {
    // Иначе гидрация разойдётся: сервер рендерит начальное состояние стора.
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true);
    const html = renderToString(<App />);
    expect(html).not.toContain('Открыть зал навыков');
    expect(html).toContain('id="skills"');
  });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/features/skill-galaxy src/features/scroll-bridge src/app`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/features/skill-galaxy/OpenHallButton.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';

/**
 * Вход в режим исследования (спека зала, §5.5). Без готовой сцены кнопки нет:
 * без WebGL, при reduced-motion или упавшем чанке она открывала бы пустоту.
 * В исследовании кнопка остаётся в DOM под скрытым `main` — чтобы вернуть на
 * неё фокус, когда зал закроют любым путём.
 */
export function OpenHallButton() {
  const mode = useSceneState((state) => state.mode);
  const ready = useSceneState((state) => state.sceneReady);
  const button = useRef<HTMLButtonElement>(null);
  const previous = useRef(mode);

  useEffect(() => {
    if (previous.current === 'exploring' && mode === 'docked') button.current?.focus();
    previous.current = mode;
  }, [mode]);

  if (!ready || mode === 'travelling') return null;

  return (
    <button
      ref={button}
      type="button"
      className="open-hall"
      onClick={() => dispatchScene({ type: 'openHall' })}
    >
      Открыть зал навыков
    </button>
  );
}
```

`src/features/skill-galaxy/useHallDocument.ts`:

```ts
import { useEffect } from 'react';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';

export const HALL_OPEN_CLASS = 'hall-open';
const HISTORY_MARKER = 'skillHall';

function ownsTopHistoryEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && HISTORY_MARKER in state;
}

/**
 * Документ на время режима исследования: гаснет (`html.hall-open`, CSS),
 * не прокручивается, Esc и «назад» закрывают зал. Все пути закрытия — Esc,
 * кнопка, «назад», ссылка на станцию, падение сцены — сводятся к выходу из
 * `exploring`, а уборка живёт в одном месте: в сбросе этого эффекта. Так ни
 * один путь не оставит документ заблокированным.
 */
export function useHallDocument(): void {
  const exploring = useSceneState((state) => state.mode === 'exploring');

  useEffect(() => {
    if (!exploring) return;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const close = () => dispatchScene({ type: 'closeHall' });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    root.classList.add(HALL_OPEN_CLASS);
    window.history.pushState({ [HISTORY_MARKER]: true }, '');
    window.addEventListener('popstate', close);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', close);
      window.removeEventListener('keydown', onKeyDown);
      root.classList.remove(HALL_OPEN_CLASS);
      window.scrollTo(0, scrollY);
      // Закрыли не «назад» — своя запись осталась сверху; убираем её, иначе
      // следующее «назад» посетителя ничего видимого не сделает.
      if (ownsTopHistoryEntry()) window.history.back();
    };
  }, [exploring]);
}
```

`src/features/scroll-bridge/useScrollProgress.ts` (импорт `sceneStore` из `@/entities/scene-mode/sceneStore`):
- тип `lenis` расширить: `{ raf: (time: number) => void; destroy: () => void; stop: () => void; start: () => void }`;
- объявить `let unsubscribeMode: (() => void) | undefined;` рядом с `let lenis`;
- после `lenis = instance;`:

```ts
      // Зал навыков блокирует прокрутку через overflow: hidden, но Lenis
      // крутит документ сам, мимо overflow, — его нужно остановить явно.
      unsubscribeMode = sceneStore.subscribe((state) => {
        if (state.mode === 'exploring') instance.stop();
        else instance.start();
      });
```

- в функции очистки — `unsubscribeMode?.();` перед `lenis?.destroy();`.

`src/app/App.tsx`: импорты `OpenHallButton` и `useHallDocument` из `@/features/skill-galaxy/…`; после `useEffect(() => bindProgress(…))` — `useHallDocument();`; `<ResumeDocument skillsAction={<OpenHallButton />} />`.

`src/app/styles.css`: строку `main { position: relative; z-index: 1; }` заменить на

```css
main { position: relative; z-index: 1; transition: opacity .3s ease; }
/* Режим исследования зала: документ гаснет, но остаётся в потоке —
   visibility, а не display: none, иначе схлопнется высота документа и
   потеряется позиция прокрутки (урок фазы 1.5). */
html.hall-open { overflow: hidden; }
html.hall-open main { opacity: 0; visibility: hidden; transition: opacity .3s ease, visibility 0s linear .3s; }
.open-hall {
  margin: 0 0 1.5rem;
  padding: .6rem 1.1rem;
  font: inherit;
  color: var(--bg);
  background: var(--accent);
  border: 0;
  border-radius: .4rem;
  cursor: pointer;
}
.open-hall:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
```

- [ ] **Step 4: Прогон, мутации**

Run: `npm run lint && npm run typecheck && npx vitest run`
Expected: PASS.

Мутации:
1. В `useHallDocument` убрать `window.scrollTo(0, scrollY)` → краснеет тест Esc. Вернуть.
2. Убрать `if (ownsTopHistoryEntry())` (звать `back()` всегда) → краснеет «“назад” … не уходит ещё на шаг назад». Вернуть.
3. В `OpenHallButton` убрать `!ready ||` → краснеет «без готовой сцены кнопки нет». Вернуть.
4. В `useScrollProgress` убрать подписку → краснеет тест Lenis. Вернуть.
5. В `sceneStore.ts` заменить `useStore(sceneStore, selector)` на `selector(sceneStore.getState())` → краснеет тест предрендера. Вернуть.

- [ ] **Step 5: Commit**

```bash
git add src/features/skill-galaxy src/features/scroll-bridge src/app
git commit -m "feat: вход в зал — кнопка, блокировка документа, Esc и «назад», стоп Lenis

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Режим исследования — сцена (перетаскивание, выбор лучом, карточка)

**Files:**
- Create (в `src/features/skill-galaxy/scene/`): `hallInteraction.ts`, `HallControls.tsx`, `nodeDetails.ts`, `nodeDetails.test.ts`, `HallOverlay.tsx`, `HallOverlay.test.tsx`, `NodeInstances.test.tsx`
- Modify: `src/features/skill-galaxy/scene/NodeInstances.tsx`
- Modify: `src/widgets/scene/SceneLayer.tsx`, `src/app/styles.css`

**Interfaces:**
- Consumes: `spinStore`, `dragSpin` (Task 9); `hallGraph`, `skillNodes`, `hubNodes` (Task 8); `sceneStore`, `dispatchScene`, `useSceneState` (Task 5); `bridges` (Task 2); `STATUS_LABELS`, `CATEGORY_LABELS`, `DOMAIN_LABELS`.
- Produces: `CLICK_SLOP = 6`, `hoverStore: StoreApi<{ hover: { id: string; x: number; y: number } | null }>` — `hallInteraction.ts`. `describeNode(id: string, graph?: SkillGraph): NodeDetails | null`, где `NodeDetails = { title; meta; linksTitle; links: NodeLink[]; bridges: { pair: string; why: string }[] }`, `NodeLink = { id; label; kind: 'job' | 'project' | 'skill'; href: string | null }` — `nodeDetails.ts`. `HallControls` (внутри `<Canvas>`), `HallOverlay` (DOM, рядом со слоем сцены). Доступные имена: диалог «Зал навыков», кнопка «Закрыть», регион карточки «Выбранный узел».

- [ ] **Step 1: Написать падающие тесты**

`src/features/skill-galaxy/scene/nodeDetails.test.ts`:

```ts
import { describeNode } from './nodeDetails';

describe('describeNode', () => {
  it('навык: домен, категория и статус; где применён — хабы-работы со ссылкой на станцию', () => {
    const details = describeNode('postgres')!;
    expect(details.title).toBe('PostgreSQL');
    expect(details.meta).toBe('Веб · Базы данных · применён');
    expect(details.links).toEqual([
      { id: 'mplat', label: 'Мобильная платформа', kind: 'job', href: '#mplat' },
    ]);
    expect(details.bridges).toEqual([
      { pair: 'PostgreSQL → pandas', why: expect.stringContaining('предбиллинга') },
    ]);
  });

  it('изучаемый навык: доказательств нет, мост в него есть', () => {
    const details = describeNode('python')!;
    expect(details.meta).toContain('изучаю');
    expect(details.links).toEqual([]);
    expect(details.bridges.map((bridge) => bridge.pair)).toEqual(['TypeScript → Python']);
  });

  it('хаб-работа перечисляет свои навыки', () => {
    const details = describeNode('mplat')!;
    expect(details.meta).toBe('Работа');
    expect(details.links).toContainEqual({ id: 'react', label: 'React', kind: 'skill', href: null });
  });

  it('неизвестный узел — null', () => {
    expect(describeNode('nope')).toBeNull();
  });
});
```

`src/features/skill-galaxy/scene/NodeInstances.test.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { CLICK_SLOP, hoverStore } from './hallInteraction';
import { hubNodes, skillNodes } from './hallData';
import { SkillHall } from './SkillHall';

const explore = () =>
  sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true);

async function meshes() {
  const renderer = await ReactThreeTestRenderer.create(<SkillHall />);
  const byName = (name: string) => renderer.scene.findAll((node) => node.props.name === name)[0]!;
  return { renderer, skills: byName('hall-skills'), hubs: byName('hall-hubs') };
}
const noop = () => {};

beforeEach(() => {
  sceneStore.setState(INITIAL_SCENE_STATE, true);
  hoverStore.setState({ hover: null });
});

describe('выбор узла лучом', () => {
  it('щелчок по инстансу выбирает его узел', async () => {
    explore();
    const { renderer, skills, hubs } = await meshes();
    await renderer.fireEvent(skills, 'click', { instanceId: 3, delta: 0, stopPropagation: noop });
    expect(sceneStore.getState().selectedId).toBe(skillNodes[3]!.id);
    await renderer.fireEvent(hubs, 'click', { instanceId: 0, delta: 0, stopPropagation: noop });
    expect(sceneStore.getState().selectedId).toBe(hubNodes[0]!.id);
  });

  it('отпускание после перетаскивания выбором не считается', async () => {
    explore();
    const { renderer, skills } = await meshes();
    await renderer.fireEvent(skills, 'click', {
      instanceId: 3,
      delta: CLICK_SLOP + 1,
      stopPropagation: noop,
    });
    expect(sceneStore.getState().selectedId).toBeNull();
  });

  it('наведение показывает подсказку, уход — убирает', async () => {
    explore();
    const { renderer, skills } = await meshes();
    await renderer.fireEvent(skills, 'pointerMove', {
      instanceId: 0,
      nativeEvent: { clientX: 10, clientY: 20 },
      stopPropagation: noop,
    });
    expect(hoverStore.getState().hover).toEqual({ id: skillNodes[0]!.id, x: 10, y: 20 });
    await renderer.fireEvent(skills, 'pointerOut', { stopPropagation: noop });
    expect(hoverStore.getState().hover).toBeNull();
  });

  it('вне исследования у узлов нет обработчиков указателя', async () => {
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true);
    const { skills } = await meshes();
    expect(skills.props.onClick).toBeUndefined();
  });
});
```

`src/features/skill-galaxy/scene/HallOverlay.test.tsx`:

```tsx
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { dispatchScene, sceneStore } from '@/entities/scene-mode/sceneStore';
import { hallGraph } from './hallData';
import { hoverStore } from './hallInteraction';
import { HallOverlay } from './HallOverlay';

const explore = () =>
  act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true));
const card = () => screen.getByRole('region', { name: 'Выбранный узел' });

beforeEach(() => {
  sceneStore.setState(INITIAL_SCENE_STATE, true);
  hoverStore.setState({ hover: null });
});

describe('HallOverlay', () => {
  it('вне исследования ничего не рисует', () => {
    act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true));
    render(<HallOverlay />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('диалог с именем, фокус — на «Закрыть»', () => {
    explore();
    render(<HallOverlay />);
    expect(screen.getByRole('dialog', { name: 'Зал навыков' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();
  });

  it('«Закрыть» закрывает зал', () => {
    explore();
    render(<HallOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(sceneStore.getState().mode).toBe('docked');
  });

  it('→ выбирает первый узел графа, ← от него — последний', () => {
    explore();
    render(<HallOverlay />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(sceneStore.getState().selectedId).toBe(hallGraph.nodes[0]!.id);
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(sceneStore.getState().selectedId).toBe(hallGraph.nodes[hallGraph.nodes.length - 1]!.id);
  });

  it('карточка навыка: статус, где применён, мосты', () => {
    explore();
    act(() => dispatchScene({ type: 'select', id: 'postgres' }));
    render(<HallOverlay />);
    expect(within(card()).getByRole('heading', { name: 'PostgreSQL' })).toBeInTheDocument();
    expect(card()).toHaveTextContent('применён');
    expect(within(card()).getByRole('link', { name: 'Мобильная платформа' })).toHaveAttribute('href', '#mplat');
    expect(card()).toHaveTextContent('PostgreSQL → pandas');
  });

  it('ссылка на работу закрывает зал и после «назад» прокручивает к станции', async () => {
    const station = document.createElement('section');
    station.id = 'mplat';
    station.scrollIntoView = vi.fn();
    document.body.append(station);
    explore();
    act(() => dispatchScene({ type: 'select', id: 'postgres' }));
    render(<HallOverlay />);

    fireEvent.click(within(card()).getByRole('link', { name: 'Мобильная платформа' }));
    expect(sceneStore.getState().mode).toBe('docked');
    // useHallDocument при закрытии делает history.back(); здесь его нет —
    // имитируем событие, которое пришлёт браузер.
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(station.scrollIntoView).toHaveBeenCalled());
    station.remove();
  });

  it('подсказка при наведении показывает подпись узла', () => {
    explore();
    act(() => hoverStore.setState({ hover: { id: 'react', x: 10, y: 20 } }));
    render(<HallOverlay />);
    expect(screen.getByText('React', { selector: '.hall-tooltip' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/features/skill-galaxy`
Expected: FAIL.

- [ ] **Step 3: Реализация — взаимодействие и данные карточки**

`src/features/skill-galaxy/scene/hallInteraction.ts`:

```ts
import { createStore } from 'zustand/vanilla';

/** Смещение указателя (px), после которого отпускание — конец перетаскивания, а не щелчок. */
export const CLICK_SLOP = 6;

export type Hover = { id: string; x: number; y: number } | null;

/** Узел под указателем и позиция подсказки; пишет сцена, читает DOM-оверлей. */
export const hoverStore = createStore<{ hover: Hover }>(() => ({ hover: null }));
```

`src/features/skill-galaxy/scene/nodeDetails.ts`:

```ts
import { bridges } from '@/content';
import { CATEGORY_LABELS, DOMAIN_LABELS } from '@/entities/skill/categories';
import type { HubNode, SkillGraph } from '@/entities/skill/graph';
import { STATUS_LABELS } from '@/entities/skill/status';
import { hallGraph } from './hallData';

export type NodeLink = { id: string; label: string; kind: 'job' | 'project' | 'skill'; href: string | null };
export type NodeDetails = {
  title: string;
  meta: string;
  linksTitle: string;
  links: NodeLink[];
  bridges: { pair: string; why: string }[];
};

/** Содержимое карточки узла — то же, что HTML-раздел «Навыки» говорит об этом узле. */
export function describeNode(id: string, graph: SkillGraph = hallGraph): NodeDetails | null {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (node === undefined) return null;
  const labelOf = (nodeId: string) => graph.nodes.find((candidate) => candidate.id === nodeId)?.label ?? nodeId;

  if (node.kind === 'skill') {
    const hubs = graph.edges
      .filter((edge) => edge.kind === 'applied' && edge.to === id)
      .map((edge) => graph.nodes.find((candidate) => candidate.id === edge.from))
      .filter((hub): hub is HubNode => hub !== undefined && hub.kind !== 'skill');
    return {
      title: node.label,
      meta: `${DOMAIN_LABELS[node.domain]} · ${CATEGORY_LABELS[node.category]} · ${STATUS_LABELS[node.status]}`,
      linksTitle: 'Где применён',
      links: hubs.map((hub) => ({ id: hub.id, label: hub.label, kind: hub.kind, href: hub.href })),
      bridges: bridges
        .filter((bridge) => bridge.from === id || bridge.to === id)
        .map((bridge) => ({ pair: `${labelOf(bridge.from)} → ${labelOf(bridge.to)}`, why: bridge.why })),
    };
  }

  return {
    title: node.label,
    meta: node.kind === 'job' ? 'Работа' : 'ML-проект',
    linksTitle: 'Навыки',
    links: graph.edges
      .filter((edge) => edge.kind === 'applied' && edge.from === id)
      .map((edge) => ({ id: edge.to, label: labelOf(edge.to), kind: 'skill' as const, href: null })),
    bridges: [],
  };
}
```

`NodeInstances.tsx` — обработчики только в `exploring` (импорты `type ThreeEvent` из `@react-three/fiber`, `dispatchScene`, `useSceneState`, `CLICK_SLOP`, `hoverStore`):

```tsx
  const exploring = useSceneState((state) => state.mode === 'exploring');

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // delta — путь указателя от нажатия до отпускания: после вращения зала
    // отпускание над узлом не должно его выбирать.
    if (event.delta > CLICK_SLOP || event.instanceId === undefined) return;
    dispatchScene({ type: 'select', id: nodes[event.instanceId]!.id });
  };
  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    hoverStore.setState({
      hover: { id: nodes[event.instanceId]!.id, x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
    });
  };
  const onPointerOut = () => hoverStore.setState({ hover: null });
  // Вне исследования обработчиков нет вовсе: R3F не бросает лучи в объекты
  // без обработчиков, а канвас там и так не получает указатель.
  const handlers = exploring ? { onClick, onPointerMove, onPointerOut } : {};
```

и `{...handlers}` в `<instancedMesh …>`.

`src/features/skill-galaxy/scene/HallControls.tsx`:

```tsx
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useSceneState } from '@/entities/scene-mode/sceneStore';
import { dragSpin } from './spin';
import { spinStore } from './spinStore';

/**
 * Перетаскивание по канвасу вращает зал (спека зала, §5.4). Нажатие ловится
 * на канвасе, движение и отпускание — на окне: указатель может уйти с канваса
 * на оверлей, а захват указателя (setPointerCapture) спорил бы с событиями R3F.
 */
export function HallControls() {
  const element = useThree((state) => state.gl.domElement);
  const exploring = useSceneState((state) => state.mode === 'exploring');

  useEffect(() => {
    if (!exploring) return;
    let last: { x: number; y: number; time: number } | null = null;

    const onDown = (event: PointerEvent) => {
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      spinStore.setState({ dragging: true });
    };
    const onMove = (event: PointerEvent) => {
      if (last === null) return;
      const dt = (event.timeStamp - last.time) / 1000;
      spinStore.setState({
        spin: dragSpin(spinStore.getState().spin, event.clientX - last.x, event.clientY - last.y, dt),
      });
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };
    const onUp = () => {
      last = null;
      spinStore.setState({ dragging: false });
    };

    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      spinStore.setState({ dragging: false });
    };
  }, [element, exploring]);

  return null;
}
```

- [ ] **Step 4: Реализация — оверлей**

`src/features/skill-galaxy/scene/HallOverlay.tsx`:

```tsx
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useStore } from 'zustand';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';
import { hallGraph } from './hallData';
import { hoverStore } from './hallInteraction';
import { describeNode } from './nodeDetails';

const ORDER = hallGraph.nodes.map((node) => node.id);
const LABELS = new Map(hallGraph.nodes.map((node) => [node.id, node.label]));

function goToStation(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  // Закрытие зала снимает свою запись истории (history.back в useHallDocument),
  // и на popstate браузер восстанавливает позицию прокрутки. Прокрутка к
  // станции — после этого, иначе восстановление перебьёт её.
  window.addEventListener(
    'popstate',
    () => window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 0),
    { once: true },
  );
  dispatchScene({ type: 'closeHall' });
}

/**
 * DOM-интерфейс режима исследования: диалог с подсказкой, кнопкой «Закрыть»,
 * карточкой выбранного узла и подсказкой при наведении. Лежит вне
 * `.scene-layer` (`aria-hidden`), иначе диалог был бы скрыт от скринридеров.
 * Сам диалог прозрачен для указателя — вращать зал можно сквозь него; панели
 * указатель получают.
 */
export function HallOverlay() {
  const exploring = useSceneState((state) => state.mode === 'exploring');
  const selectedId = useSceneState((state) => state.selectedId);
  const hover = useStore(hoverStore, (state) => state.hover);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (exploring) closeButton.current?.focus();
  }, [exploring]);

  if (!exploring) return null;

  const details = selectedId === null ? null : describeNode(selectedId);

  const step = (direction: 1 | -1) => {
    const index = selectedId === null ? (direction === 1 ? -1 : 0) : ORDER.indexOf(selectedId);
    dispatchScene({ type: 'select', id: ORDER[(index + direction + ORDER.length) % ORDER.length]! });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <div className="hall-overlay" role="dialog" aria-modal="true" aria-labelledby="hall-title" onKeyDown={onKeyDown}>
      <header className="hall-overlay__panel">
        <h2 id="hall-title">Зал навыков</h2>
        <p className="hall-overlay__hint">Перетаскивайте, чтобы вращать. ← → — перебрать узлы. Esc — выйти.</p>
        <button ref={closeButton} type="button" onClick={() => dispatchScene({ type: 'closeHall' })}>
          Закрыть
        </button>
      </header>

      <section className="hall-overlay__panel hall-card" aria-label="Выбранный узел" aria-live="polite">
        {details === null ? (
          <p>Выберите узел — щелчком или стрелками.</p>
        ) : (
          <>
            <h3>{details.title}</h3>
            <p className="hall-card__meta">{details.meta}</p>
            {details.links.length > 0 && (
              <>
                <h4>{details.linksTitle}</h4>
                <ul>
                  {details.links.map((link) => (
                    <li key={link.id}>
                      {link.kind === 'job' && link.href !== null && (
                        <a href={link.href} onClick={(event) => goToStation(event, link.id)}>
                          {link.label}
                        </a>
                      )}
                      {link.kind === 'project' && link.href !== null && (
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.label}
                        </a>
                      )}
                      {link.kind === 'skill' && link.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {details.bridges.length > 0 && (
              <>
                <h4>Что переносится в ML</h4>
                <ul>
                  {details.bridges.map((bridge) => (
                    <li key={bridge.pair}>
                      <span className="bridge__pair">{bridge.pair}</span> — {bridge.why}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      {hover !== null && (
        <div className="hall-tooltip" aria-hidden="true" style={{ left: hover.x, top: hover.y }}>
          {LABELS.get(hover.id)}
        </div>
      )}
    </div>
  );
}
```

`src/widgets/scene/SceneLayer.tsx`: импорты `HallControls`, `HallOverlay` из `@/features/skill-galaxy/scene/…`; `<HallControls />` — внутри `<Canvas>` после `<AdaptiveQuality />`; возвращаемое значение обернуть во фрагмент и после `</div>` слоя добавить `<HallOverlay />` с комментарием «Оверлей — вне `.scene-layer`: у слоя `aria-hidden`, а диалог должен быть доступен».

`src/app/styles.css` — добавить:

```css
.hall-overlay {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  pointer-events: none;
}
.hall-overlay__panel {
  pointer-events: auto;
  max-width: min(28rem, 100%);
  padding: .75rem 1rem;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--fg) 15%, transparent);
  border-radius: .5rem;
}
.hall-overlay__panel h2 { margin: 0; font-size: 1rem; }
.hall-overlay__hint, .hall-card__meta { margin: .25rem 0 .5rem; font-size: .8125rem; color: var(--muted); }
.hall-overlay__panel button { font: inherit; color: var(--fg); background: none; border: 1px solid var(--muted); border-radius: .3rem; padding: .3rem .8rem; cursor: pointer; }
.hall-card h3 { margin: 0; }
.hall-card h4 { margin: .75rem 0 .25rem; font-size: .8125rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.hall-card ul { margin: 0; padding-left: 1.25rem; }
.hall-tooltip {
  position: fixed;
  transform: translate(12px, 12px);
  padding: .2rem .45rem;
  font-size: .8125rem;
  color: var(--fg);
  background: var(--bg);
  border-radius: .25rem;
  pointer-events: none;
}
```

- [ ] **Step 5: Прогон, мутации**

Run: `npm run lint && npm run typecheck && npx vitest run`
Expected: PASS.

Мутации:
1. В `onClick` убрать проверку `event.delta > CLICK_SLOP` → краснеет «отпускание после перетаскивания выбором не считается». Вернуть.
2. `handlers` всегда с обработчиками → краснеет «вне исследования у узлов нет обработчиков». Вернуть.
3. В `goToStation` прокручивать сразу, без ожидания `popstate` → тест ссылки остаётся зелёным (это ожидаемо: порядок проверяет e2e Task 12) — мутацию не засчитывать, отметить в отчёте. Убрать `dispatchScene({ type: 'closeHall' })` → краснеет. Вернуть.
4. В `describeNode` фильтровать мосты только по `bridge.from === id` → краснеет «изучаемый навык: … мост в него есть». Вернуть.

- [ ] **Step 6: Глазами**

`npm run dev`, прокрутить до конца, «Открыть зал навыков»: перетаскивание вращает с инерцией, щелчок по узлу открывает карточку, ←/→ перебирают, ссылка «Мобильная платформа» закрывает зал и ведёт к станции, Esc и «назад» закрывают. На узком окне (400 px) панели не вылезают за край. Записать в отчёт.

- [ ] **Step 7: Commit**

```bash
git add src/features/skill-galaxy src/widgets/scene/SceneLayer.tsx src/app/styles.css
git commit -m "feat: исследование зала — вращение перетаскиванием, выбор лучом, карточка узла

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: e2e зала

**Files:**
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: всё из Task 1–11 через браузер; существующие помощники `readSceneFrame`, `isMonochrome`, `framesEqual`, `withHiddenResumeText`.

- [ ] **Step 1: Помощники**

В `e2e/smoke.spec.ts` после `withHiddenResumeText` добавить:

```ts
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

/** До конца документа — к стыковке; кнопка появляется при готовой сцене. */
async function dockAtHall(page: Page) {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const button = page.getByRole('button', { name: 'Открыть зал навыков' });
  await expect(button).toBeVisible({ timeout: 20_000 });
  return button;
}

async function openHall(page: Page) {
  const button = await dockAtHall(page);
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Зал навыков' })).toBeVisible();
  return button;
}
```

- [ ] **Step 2: Тесты**

```ts
test('кнопка зала есть тогда и только тогда, когда браузер даёт WebGL', async ({ page }) => {
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
    await expect(button).toBeVisible({ timeout: 20_000 });
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
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  await expect(canvas).toHaveCSS('touch-action', 'auto');

  await button.click();
  await expect(page.getByRole('button', { name: 'Закрыть' })).toBeFocused();
  await expect(page.locator('main')).toHaveCSS('visibility', 'hidden');
  await expect(canvas).toHaveCSS('pointer-events', 'auto');
  await expect(canvas).toHaveCSS('touch-action', 'none');
  // Пользовательская прокрутка (клавиатура) заблокирована overflow: hidden.
  await page.keyboard.press('PageUp');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCSS('visibility', 'visible');
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
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

test('щелчок по узлу открывает его карточку', { tag: '@scene' }, async ({ page }) => {
  // Луч R3F считается синхронно на событии указателя — кадр для этого не
  // нужен, поэтому перебор точек быстрый даже под swiftshader. Полоса по
  // центру — вне панелей оверлея (сверху — «Закрыть», снизу — карточка).
  test.setTimeout(120_000);
  await openHall(page);
  const box = (await page.locator('.scene-layer canvas').boundingBox())!;
  const title = page.getByRole('region', { name: 'Выбранный узел' }).getByRole('heading', { level: 3 });
  let found = false;
  for (let row = 3; row <= 7 && !found; row += 1) {
    for (let col = 2; col <= 18 && !found; col += 1) {
      await page.mouse.click(box.x + (box.width * col) / 20, box.y + (box.height * row) / 10);
      found = (await title.count()) > 0;
    }
  }
  expect(found, 'ни один щелчок по сетке точек не попал в узел').toBe(true);
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
});

test('в открытом зале нарушений доступности нет', { tag: '@scene' }, async ({ page }) => {
  test.setTimeout(120_000);
  await openHall(page);
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

  expect(changedFraction(idle, after)).toBeGreaterThan(Math.max(0.05, background * 3));
});
```

- [ ] **Step 3: Прогон**

Run: `npm run build && npm run e2e`
Expected: PASS на desktop и mobile; в Firefox — только тест кнопки (ветка без WebGL) и прежние тесты без `@scene`. Если «щелчок по узлу» не находит узел — увеличить плотность сетки (шаг 1/30), но не расширять полосу на панели оверлея.

- [ ] **Step 4: Мутации (каждая — пересборка и прогон одного теста через `npx playwright test -g '<имя>' --project=desktop`)**

1. Убрать `<SkillHall />` из `SceneLayer` → краснеет «у стыковки зал нарисован и вращается». Вернуть.
2. Убрать `<HallControls />` → краснеет «перетаскивание вращает зал». Вернуть.
3. В CSS убрать `html.hall-open { overflow: hidden; }` → краснеет тест Esc (прокрутка сдвинулась). Вернуть.
4. В `SceneLayer` оставить `touchAction: 'auto'` всегда → краснеет тест Esc на `touch-action`. Вернуть.
5. В `goToStation` прокручивать сразу, без ожидания `popstate` → «ссылка … ведёт к станции» — записать результат: если остаётся зелёным, значит Chromium восстанавливает позицию до `popstate`, и ожидание не нужно; упростить код не надо (Firefox и Safari ведут себя иначе), но в отчёте это отметить.

- [ ] **Step 5: Commit**

```bash
git add e2e/smoke.spec.ts
git commit -m "test(e2e): зал навыков — вход, выход, выбор узла, вращение, доступность

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Документы, проверка владельцем, деплой

**Files:**
- Modify: `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md` (§2, §3.2, §4, §6, §7 — по §10 спеки зала), `README.md`

- [ ] **Step 1: Родительская спека и README**

- §2 «Зал навыков»: абзац о траектории — статусы «применён / изучаю / в плане» из доказательств, хабы-работы и проекты, мосты из веба в ML, режим исследования по кнопке; ссылка на `2026-10-12-skill-hall-design.md`.
- §3.2 (структура): слой `widgets/scene` (канвас), фича `skill-galaxy` (главный чанк + `scene/`), `entities/scene-mode`, `entities/route/geometry.ts`, `anchors.ts`; правило «любой каталог `scene/` — ленивый».
- §4: `Skill.intent`, `Project`, `Bridge`; `skillStatus`; `buildSkillGraph(skills, jobs, projects, bridges)`; абзац «граф выводится из этих же данных» остаётся верным.
- §6, после абзаца о фазе 2: абзац о фазе 3 — что сделано и что вне фазы (спека зала §11).
- §7 «Средства»: строку про `frameloop="demand"` в `docked` заменить: «`frameloop` всегда `always`: у зала вращение и пульсация требуют кадров (спека зала §5.4); зал — 4 draw call, закреплено `SkillHall.test.tsx`».
- README: строка «План фазы 3: `docs/superpowers/plans/2026-10-12-skill-hall-phase-3.md`»; в «Состояние» — «Фаза 3 — зал навыков: траектория из веба в ML, граф двумя `InstancedMesh` и двумя `LineSegments`, режим исследования (вращение, выбор лучом, карточка)»; «Дальше по спеке: фаза 4 (GLSL), фаза 5 (постпроцессинг)».

- [ ] **Step 2: Проверка владельцем (блокирующая)**

Попросить владельца:
1. `npm run dev`: прокрутить маршрут до зала. Оценить: читается ли разделение «веб слева — ML справа», видны ли бирюзовые мосты, не теряются ли «в плане» в тумане, не слишком ли быстро вращение. Значения `LAYOUT`, `PLANNED_FADE`, `SPIN.idleSpeed`, `HALL_DOCK_DISTANCE` правит по просьбе владельца; после правки — `npx vitest run` (инварианты Л1–Л5 и «дальний край зала не тонет в тумане» обязаны остаться зелёными).
2. Прочитать черновики `why` в `src/content/bridges.ts` и заменить своими формулировками (или явно одобрить черновики).
3. `npm run build && npm run preview -- --host` — на телефоне: прокрутка до зала, кнопка, вращение пальцем, выбор узла, «назад». Прокрутка вне зала не должна цепляться за канвас.

- [ ] **Step 3: Полный прогон**

Run: `npm run lint && npm run typecheck && npx vitest run && npm run build && npm run check:size && npm run e2e`
Expected: всё зелёное; записать размеры главного и ленивых чанков и число e2e по проектам.

- [ ] **Step 4: Commit документов**

```bash
git add docs/superpowers/specs/2026-09-13-portfolio-3d-design.md README.md src/content/bridges.ts src/entities/skill/layout.ts src/features/skill-galaxy/scene
git commit -m "docs: зафиксировать зал навыков в спеке и README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(В `git add` — только реально изменённые на Step 2 файлы.)

- [ ] **Step 5: Деплой — только с явного согласия владельца**

Спросить владельца, можно ли пушить в `main` (пуш = деплой). После согласия:

```bash
git push origin main
gh run watch --exit-status $(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')
curl -s https://alygee.github.io/portfolio/ | grep -Eo 'Опыт — [0-9]+ (год|года|лет)'
curl -s https://alygee.github.io/portfolio/ | grep -o 'id="skills"'
```

Expected: прогон зелёный, строка стажа и якорь `skills` найдены в предрендере. Попросить владельца открыть живой сайт и пройти маршрут до зала.

---

## Self-review плана

**Покрытие спеки:** З1–З2, К1–К6 — Task 2–3; З3 и мосты — Task 2, 6, 8; З4 (двудольный граф) — Task 3; З5 (инструменты) — Task 2; З6 (режим по кнопке, подсветка из HTML) — Task 6, 10, 11; З7 (шапка не меняется) — нигде не трогается, Global Constraints; З8 и §4 (раскладка, Л1–Л5) — Task 4; §5.1 (место в мире, туман, рельеф под залом) — Task 1; §5.2 (кодирование, 4 draw call) — Task 8; §5.3 (режимы) — Task 5; §5.4 (камера, вращение) — Task 9; §5.5 (исследование) — Task 10–11; §5.6 (подсветка) — Task 6 (+ масштаб подсветки — Task 9); §6 (HTML) — Task 1, 6; §7 (структура, линтер) — Task 7; §8 (деградация) — Task 5, 7, 10, 12; §9 (тесты) — по задачам; §10 (родительская спека) — Task 13.

**Проверка имён между задачами:** `ROUTE_ANCHOR_IDS`, `HALL_DOCK`, `HALL_CENTER` (Task 1) → Task 8, 9; `skillGraph` (Task 3) → `hallData` (Task 8); `sceneStore`/`dispatchScene`/`useSceneState` (Task 5) → Task 6, 7, 9, 10, 11; `spinStore`/`dragSpin` (Task 9) → Task 11; `CLICK_SLOP`/`hoverStore` (Task 11) — только Task 11; имена объектов сцены (`hall-skills`, `hall-hubs`, `skill-hall-spin`) — Task 8 → Task 9, 11.

**Известные риски, проверяемые по ходу:** излом маршрута у стыковки (Task 1, Step 9 — порядок действий записан), бюджет экземпляров рельефа (Task 1 — стоп и доклад), стабильность e2e под swiftshader у вращающегося зала (Task 12 — сравнение долей, а не равенство кадров).
