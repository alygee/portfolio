# Портфолио: фазы 0-1 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Задеплоить работающий сайт-резюме без 3D (фаза 0), затем добавить поверх него ленивый WebGL-слой, в котором скролл ведёт камеру по кривой мимо четырёх станций-работ (фаза 1).

**Architecture:** Контент в `src/content/` — единственный источник правды; из него рендерятся две независимые проекции: семантический HTML-документ (всегда в DOM) и 3D-сцена поверх него, монтируемая лениво. Скролл не проходит через React-состояние: Lenis → транзиентный zustand-стор → `useFrame` в `CameraRig`. Вся логика движения камеры и подсчёта данных вынесена в чистые функции, тестируемые в Vitest без браузера и без WebGL.

**Tech Stack:** React 19, TypeScript, Vite, @react-three/fiber, @react-three/drei, three, zustand, lenis, detect-gpu, Vitest, @testing-library/react, @react-three/test-renderer, Playwright, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md`

## Global Constraints

- Главный бандл без `three`: ≤ 100 КБ gzip. `three` только в ленивом чанке.
- LCP формируется HTML-проекцией, а не канвасом. HTML-документ присутствует в DOM всегда, не как fallback.
- Канвас не монтируется вообще (а не «без анимации»), если: нет WebGL, `prefers-reduced-motion: reduce`, или `detect-gpu` tier ≤ 1.
- На мобильных инерция скролла не перехватывается — камера привязана к нативному скроллу документа.
- FSD облегчённый: слои `app / content / entities / features / shared` соблюдаются, строгость сегментов внутри слоёв — нет.
- Кадры: 60 fps десктоп, ≥ 30 fps мобильные. `dpr={[1, 1.75]}`.
- Деплой: GitHub Pages, чистая статика.
- Весь пользовательский текст — на русском.
- Пиксельные снимки визуала не тестируются никогда.
- TDD: тест пишется до реализации, каждая задача заканчивается коммитом.

**Объём относительно спеки:** решение Р7 (машина состояний `travelling | docked`)
в фазе 1 реализуется наполовину — вводятся тип и переключатель, но состояние
`docked` ещё никем не выставляется: оно нужно залу навыков, то есть фазе 3.
Так же и `frameloop="demand"` из §7: оптимизация покоящейся камеры имеет смысл
только вместе с `docked`. Это запланированный недобор, а не пропуск.

**Соответствие спеке:** спека §8 обещает проверку `CameraRig` на `t = 0 / 0.5 / 1`. В плане это реализовано как тесты чистых функций `progressToCamera` и `stepCamera` (Task 7, Task 9) плюс smoke-тест монтирования `CameraRig` через тестовый компонент-шпион. Причина: полагаться на приватное API test-renderer для чтения камеры — хрупко, а проверяемое поведение от этого не страдает.

---

### Task 1: Скаффолд проекта и первый рендер

Setup, конфигурация и первый осмысленный deliverable объединены: пустой скаффолд нечего ревьюить, а «страница показывает имя» — уже проверяемое поведение.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: ничего.
- Produces: `App` — React-компонент без пропсов, дефолтный экспорт из `src/app/App.tsx`. Алиас `@/` → `src/`. Команды `npm test`, `npm run build`, `npm run dev`.

- [ ] **Step 1: Создать package.json и .gitignore**

Скаффолд собирается вручную, а не через `npm create vite`: интерактивный вопрос про непустую директорию (в репозитории уже есть `docs/` и `.git/`) сломает неинтерактивное выполнение.

```bash
cd /home/albert/projects/portfolio
cat > package.json <<'EOF'
{
  "name": "portfolio",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
EOF
cat > .gitignore <<'EOF'
node_modules
dist
coverage
test-results
playwright-report
.DS_Store
EOF
```

- [ ] **Step 2: Установить зависимости**

Версии не пинятся в плане намеренно — ставим актуальные, `npm` запишет их в `package.json` сам.

```bash
cd /home/albert/projects/portfolio
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react @types/react @types/react-dom \
  vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Создать конфигурацию TypeScript и Vite**

```bash
cd /home/albert/projects/portfolio
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
EOF
cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/portfolio/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
EOF
mkdir -p src/shared/test src/app
cat > src/shared/test/setup.ts <<'EOF'
import '@testing-library/jest-dom/vitest';
EOF
cat > index.html <<'EOF'
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Альберт Аллагулов — Senior Frontend Developer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
```

- [ ] **Step 4: Написать падающий тест**

```bash
cat > src/app/App.test.tsx <<'EOF'
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('показывает имя в единственном заголовке первого уровня', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Альберт Аллагулов');
  });
});
EOF
```

- [ ] **Step 5: Запустить тест и убедиться, что он падает**

Run: `cd /home/albert/projects/portfolio && npx vitest run src/app/App.test.tsx`
Expected: FAIL — `Failed to resolve import "./App"`.

- [ ] **Step 6: Минимальная реализация**

```bash
cat > src/app/App.tsx <<'EOF'
export default function App() {
  return (
    <main>
      <h1>Альберт Аллагулов</h1>
    </main>
  );
}
EOF
cat > src/main.tsx <<'EOF'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
EOF
```

- [ ] **Step 7: Запустить тест и сборку**

Run: `cd /home/albert/projects/portfolio && npx vitest run && npm run build`
Expected: тест PASS, сборка завершается без ошибок, появляется `dist/`.

- [ ] **Step 8: Коммит**

```bash
cd /home/albert/projects/portfolio
git add -A
git commit -m "feat: скаффолд Vite + React + TS и первый рендер"
```

---

### Task 2: Контент-модель и данные резюме

**Files:**
- Create: `src/content/skills.ts`, `src/content/jobs.ts`, `src/content/index.ts`
- Test: `src/content/content.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `type SkillCategory = 'framework' | 'language' | 'build' | 'testing' | 'state' | 'backend' | 'database' | 'geo' | 'infra'`
  - `type Skill = { id: string; label: string; category: SkillCategory }`
  - `skills: readonly Skill[]`, `type SkillId = typeof skills[number]['id']`
  - `type Job = { id: string; company: string; url?: string; city: string; start: string; end: string | null; role: string; summary: string; bullets: readonly string[]; stack: readonly SkillId[]; metrics?: readonly { label: string; value: string }[] }`
  - `jobs: readonly Job[]` — упорядочены хронологически, от самой ранней к самой поздней (порядок маршрута камеры).
  - `type JobId = typeof jobs[number]['id']`

- [ ] **Step 1: Написать падающий тест**

`SkillId` выводится из массива `skills`, поэтому опечатку в `job.stack` ловит компилятор. Тесты покрывают то, что типы поймать не могут: дубли, порядок, корректность дат.

```bash
mkdir -p src/content
cat > src/content/content.test.ts <<'EOF'
import { jobs, skills } from './index';

describe('контент-модель', () => {
  it('не содержит дублей id навыков', () => {
    const ids = skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('не содержит дублей id работ', () => {
    const ids = jobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('все навыки в стеках работ существуют в справочнике', () => {
    const known = new Set(skills.map((s) => s.id));
    const unknown = jobs.flatMap((j) => j.stack.filter((id) => !known.has(id)));
    expect(unknown).toEqual([]);
  });

  it('каждый навык используется хотя бы на одной работе', () => {
    const used = new Set(jobs.flatMap((j) => [...j.stack]));
    const orphans = skills.filter((s) => !used.has(s.id)).map((s) => s.id);
    expect(orphans).toEqual([]);
  });

  it('даты записаны как YYYY-MM, конец не раньше начала', () => {
    for (const job of jobs) {
      expect(job.start).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      if (job.end !== null) {
        expect(job.end).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
        expect(job.end >= job.start).toBe(true);
      }
    }
  });

  it('работы упорядочены хронологически от ранней к поздней', () => {
    const starts = jobs.map((j) => j.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it('ровно одна работа является текущей', () => {
    expect(jobs.filter((j) => j.end === null)).toHaveLength(1);
  });

  it('у каждой работы есть непустое описание и пункты', () => {
    for (const job of jobs) {
      expect(job.summary.length).toBeGreaterThan(0);
      expect(job.bullets.length).toBeGreaterThan(0);
    }
  });
});
EOF
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/content/content.test.ts`
Expected: FAIL — `Failed to resolve import "./index"`.

- [ ] **Step 3: Создать справочник навыков**

```bash
cat > src/content/skills.ts <<'EOF'
export type SkillCategory =
  | 'framework'
  | 'language'
  | 'build'
  | 'testing'
  | 'state'
  | 'backend'
  | 'database'
  | 'geo'
  | 'infra';

export type Skill = {
  id: string;
  label: string;
  category: SkillCategory;
};

export const skills = [
  { id: 'typescript', label: 'TypeScript', category: 'language' },
  { id: 'javascript', label: 'JavaScript', category: 'language' },
  { id: 'php', label: 'PHP', category: 'language' },
  { id: 'react', label: 'React', category: 'framework' },
  { id: 'vue', label: 'Vue', category: 'framework' },
  { id: 'angular', label: 'Angular', category: 'framework' },
  { id: 'angularjs', label: 'AngularJS', category: 'framework' },
  { id: 'extjs', label: 'ExtJS', category: 'framework' },
  { id: 'laravel', label: 'Laravel', category: 'backend' },
  { id: 'nodejs', label: 'Node.js', category: 'backend' },
  { id: 'vite', label: 'Vite', category: 'build' },
  { id: 'webpack', label: 'Webpack', category: 'build' },
  { id: 'jest', label: 'Jest', category: 'testing' },
  { id: 'vitest', label: 'Vitest', category: 'testing' },
  { id: 'cypress', label: 'Cypress', category: 'testing' },
  { id: 'storybook', label: 'Storybook', category: 'testing' },
  { id: 'redux', label: 'Redux Toolkit', category: 'state' },
  { id: 'zustand', label: 'Zustand', category: 'state' },
  { id: 'effector', label: 'Effector', category: 'state' },
  { id: 'rxjs', label: 'RxJS', category: 'state' },
  { id: 'chakra', label: 'Chakra UI', category: 'framework' },
  { id: 'maplibre', label: 'MapLibre', category: 'geo' },
  { id: 'mapbox', label: 'Mapbox', category: 'geo' },
  { id: 'openlayers', label: 'OpenLayers', category: 'geo' },
  { id: 'postgres', label: 'PostgreSQL', category: 'database' },
  { id: 'mongodb', label: 'MongoDB', category: 'database' },
  { id: 'mysql', label: 'MySQL', category: 'database' },
  { id: 'graphql', label: 'GraphQL', category: 'backend' },
  { id: 'websocket', label: 'WebSocket', category: 'backend' },
  { id: 'docker', label: 'Docker', category: 'infra' },
  { id: 'ci', label: 'CI/CD', category: 'infra' },
  { id: 'wordpress', label: 'WordPress', category: 'backend' },
  { id: 'magento', label: 'Magento', category: 'backend' },
] as const satisfies readonly Skill[];

export type SkillId = (typeof skills)[number]['id'];
EOF
```

- [ ] **Step 4: Создать данные о работах**

```bash
cat > src/content/jobs.ts <<'EOF'
import type { SkillId } from './skills';

export type Job = {
  id: string;
  company: string;
  url?: string;
  city: string;
  /** ISO YYYY-MM, месяц начала включительно */
  start: string;
  /** ISO YYYY-MM, месяц окончания включительно; null — настоящее время */
  end: string | null;
  role: string;
  summary: string;
  bullets: readonly string[];
  stack: readonly SkillId[];
  metrics?: readonly { label: string; value: string }[];
};

export const jobs = [
  {
    id: 'amazingcat',
    company: 'AmazingCat',
    url: 'https://amazingcat.net/',
    city: 'Омск',
    start: '2016-09',
    end: '2017-11',
    role: 'PHP (fullstack) разработчик',
    summary: 'Разработка тем и плагинов для e-commerce.',
    bullets: [
      'Разрабатывал темы и плагины для e-commerce (WordPress, Magento).',
      'Оптимизировал SQL-запросы, ускорив работу магазинов на 15–20%.',
      'Настроил CI/CD и Docker для автоматизации релизов.',
    ],
    stack: ['php', 'javascript', 'wordpress', 'magento', 'mysql', 'docker', 'ci'],
    metrics: [{ label: 'Скорость магазинов', value: '+15–20%' }],
  },
  {
    id: 'polykod',
    company: 'Поликод',
    url: 'https://polykod.ru/polygon/',
    city: 'Казань',
    start: '2017-11',
    end: '2018-07',
    role: 'Front-end разработчик',
    summary: 'Интерфейс геологической системы.',
    bullets: [
      'Разработка интерфейса геологической системы на ExtJS.',
      'Создал библиотеку компонентов на Storybook, сократив время разработки модулей на 25%.',
      'Освоил и внедрил Vue в часть проектов.',
    ],
    stack: ['javascript', 'extjs', 'vue', 'storybook'],
    metrics: [{ label: 'Время разработки модулей', value: '−25%' }],
  },
  {
    id: 'mplat',
    company: 'Мобильная платформа',
    url: 'https://mplat.io/',
    city: 'Казань',
    start: '2018-06',
    end: '2025-04',
    role: 'Frontend разработчик',
    summary:
      'Высоконагруженная телеком-платформа и внутренние интерфейсы для предбиллинга.',
    bullets: [
      'Разработал low-code систему для интеграции множества источников данных.',
      'Снизил количество багов на продакшене примерно на 30% за счёт внедрения Jest и Cypress.',
      'Ускорил загрузку приложения примерно на 40% через оптимизацию Core Web Vitals.',
      'Создал библиотеку UI-компонентов и внутреннюю документацию.',
      'Руководил frontend-командой: планирование, code review, развитие инженеров.',
      'Участвовал в миграции с AngularJS на Angular 16 и React 18.',
    ],
    stack: [
      'typescript',
      'javascript',
      'react',
      'angular',
      'angularjs',
      'rxjs',
      'redux',
      'effector',
      'webpack',
      'jest',
      'cypress',
      'nodejs',
      'graphql',
      'websocket',
      'postgres',
      'mongodb',
      'laravel',
      'php',
    ],
    metrics: [
      { label: 'Баги на продакшене', value: '−30%' },
      { label: 'Скорость загрузки', value: '+40%' },
    ],
  },
  {
    id: 'gisgis',
    company: 'ГИСГИС',
    city: 'Казань',
    start: '2025-08',
    end: null,
    role: 'Frontend-разработчик',
    summary: 'Корпоративная GIS-система с highload-нагрузкой.',
    bullets: [
      'Развиваю SPA на React и TypeScript для корпоративного GIS-продукта.',
      'Внедрил Feature-Sliced Design, что упростило масштабирование кодовой базы.',
      'Реализую data-heavy интерфейсы: таблицы, фильтрация, сортировка, inline CRUD.',
      'Интегрировал картографические решения на базе MapLibre, Mapbox и OpenLayers.',
      'Оптимизировал загрузку и отзывчивость интерфейса.',
      'Развиваю UI-kit на базе Chakra UI.',
    ],
    stack: [
      'react',
      'typescript',
      'vite',
      'vitest',
      'zustand',
      'chakra',
      'maplibre',
      'mapbox',
      'openlayers',
    ],
  },
] as const satisfies readonly Job[];

export type JobId = (typeof jobs)[number]['id'];
EOF
cat > src/content/index.ts <<'EOF'
export { skills } from './skills';
export type { Skill, SkillId, SkillCategory } from './skills';
export { jobs } from './jobs';
export type { Job, JobId } from './jobs';
EOF
```

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run src/content/content.test.ts && npx tsc -b`
Expected: все тесты PASS, типы проверяются без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat: контент-модель резюме как источник правды"
```

---

### Task 3: Подсчёт длительностей и стажа

Значения в тестах взяты из резюме и подтверждают две неочевидные вещи: длительность работы считается включительно по месяцам (2018-06 … 2025-04 = 83 месяца = «6 лет 11 месяцев»), а общий стаж — это объединение перекрывающихся интервалов, а не сумма (120 − 3 месяца перекрытий = 117 = «9 лет 9 месяцев»).

**Files:**
- Create: `src/entities/job/duration.ts`
- Test: `src/entities/job/duration.test.ts`

**Interfaces:**
- Consumes: ничего — модуль сознательно не знает про `Job`, чтобы его можно было
  тестировать на простых объектах.
- Produces:
  - `type Period = { start: string; end: string | null }`
  - `inclusiveMonths(start: string, end: string): number`
  - `jobMonths(period: Period, now: string): number`
  - `formatMonths(total: number): string`
  - `totalExperienceMonths(periods: readonly Period[], now: string): number`
  - Формат `now` — `'YYYY-MM'`. `Job` структурно совместим с `Period`, поэтому
    `jobs` передаётся в `totalExperienceMonths` напрямую.

- [ ] **Step 1: Написать падающий тест**

```bash
mkdir -p src/entities/job
cat > src/entities/job/duration.test.ts <<'EOF'
import { jobs } from '@/content';
import {
  formatMonths,
  inclusiveMonths,
  jobMonths,
  totalExperienceMonths,
} from './duration';

const NOW = '2026-08';

describe('inclusiveMonths', () => {
  it('считает один месяц, когда начало и конец совпадают', () => {
    expect(inclusiveMonths('2020-03', '2020-03')).toBe(1);
  });

  it('считает месяцы включительно с обоих концов', () => {
    expect(inclusiveMonths('2018-06', '2025-04')).toBe(83);
    expect(inclusiveMonths('2017-11', '2018-07')).toBe(9);
    expect(inclusiveMonths('2016-09', '2017-11')).toBe(15);
  });

  it('работает через границу года', () => {
    expect(inclusiveMonths('2019-12', '2020-01')).toBe(2);
  });
});

describe('jobMonths', () => {
  it('для текущей работы считает до now включительно', () => {
    expect(jobMonths({ start: '2025-08', end: null }, NOW)).toBe(13);
  });

  it('для завершённой работы игнорирует now', () => {
    expect(jobMonths({ start: '2017-11', end: '2018-07' }, NOW)).toBe(9);
  });
});

describe('formatMonths', () => {
  it('склоняет месяцы по-русски', () => {
    expect(formatMonths(1)).toBe('1 месяц');
    expect(formatMonths(2)).toBe('2 месяца');
    expect(formatMonths(5)).toBe('5 месяцев');
    expect(formatMonths(9)).toBe('9 месяцев');
    expect(formatMonths(11)).toBe('11 месяцев');
  });

  it('склоняет годы по-русски', () => {
    expect(formatMonths(12)).toBe('1 год');
    expect(formatMonths(24)).toBe('2 года');
    expect(formatMonths(60)).toBe('5 лет');
  });

  it('соединяет годы и месяцы', () => {
    expect(formatMonths(13)).toBe('1 год 1 месяц');
    expect(formatMonths(15)).toBe('1 год 3 месяца');
    expect(formatMonths(83)).toBe('6 лет 11 месяцев');
    expect(formatMonths(117)).toBe('9 лет 9 месяцев');
  });

  it('нулевой срок отдаёт нулевые месяцы', () => {
    expect(formatMonths(0)).toBe('0 месяцев');
  });
});

describe('totalExperienceMonths', () => {
  it('объединяет перекрывающиеся периоды вместо их суммирования', () => {
    const overlapping = [
      { start: '2020-01', end: '2020-06' },
      { start: '2020-05', end: '2020-08' },
    ];
    expect(totalExperienceMonths(overlapping, NOW)).toBe(8);
  });

  it('складывает непересекающиеся периоды и не заполняет разрывы', () => {
    const gapped = [
      { start: '2020-01', end: '2020-03' },
      { start: '2021-01', end: '2021-02' },
    ];
    expect(totalExperienceMonths(gapped, NOW)).toBe(5);
  });

  it('на реальных данных резюме даёт 9 лет 9 месяцев', () => {
    expect(totalExperienceMonths(jobs, NOW)).toBe(117);
    expect(formatMonths(totalExperienceMonths(jobs, NOW))).toBe('9 лет 9 месяцев');
  });
});
EOF
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/entities/job/duration.test.ts`
Expected: FAIL — `Failed to resolve import "./duration"`.

- [ ] **Step 3: Минимальная реализация**

```bash
cat > src/entities/job/duration.ts <<'EOF'
export type Period = { start: string; end: string | null };

/** Абсолютный номер месяца, чтобы арифметика не зависела от таймзон и Date. */
function monthIndex(iso: string): number {
  const [year, month] = iso.split('-');
  return Number(year) * 12 + (Number(month) - 1);
}

/** Месяцы между двумя датами, включая оба крайних месяца. */
export function inclusiveMonths(start: string, end: string): number {
  return monthIndex(end) - monthIndex(start) + 1;
}

export function jobMonths(period: Period, now: string): number {
  return inclusiveMonths(period.start, period.end ?? now);
}

function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = n % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function formatMonths(total: number): string {
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${plural(years, ['год', 'года', 'лет'])}`);
  if (months > 0 || years === 0) {
    parts.push(`${months} ${plural(months, ['месяц', 'месяца', 'месяцев'])}`);
  }
  return parts.join(' ');
}

/**
 * Суммарный стаж. Перекрывающиеся периоды объединяются: два места работы
 * в одном месяце — это один месяц стажа, а не два.
 */
export function totalExperienceMonths(periods: readonly Period[], now: string): number {
  const ranges = periods
    .map((p) => [monthIndex(p.start), monthIndex(p.end ?? now)] as const)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let cursor: number | null = null;
  let cursorEnd = 0;

  for (const [start, end] of ranges) {
    if (cursor === null) {
      cursor = start;
      cursorEnd = end;
      continue;
    }
    if (start <= cursorEnd + 1) {
      cursorEnd = Math.max(cursorEnd, end);
    } else {
      total += cursorEnd - cursor + 1;
      cursor = start;
      cursorEnd = end;
    }
  }
  if (cursor !== null) total += cursorEnd - cursor + 1;
  return total;
}
EOF
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run src/entities/job/duration.test.ts`
Expected: PASS, 14 тестов.

Если тест на 117 месяцев падает — проверять надо реализацию объединения, а не подгонять ожидание: значение сверено с резюме.

- [ ] **Step 5: Коммит**

```bash
git add -A
git commit -m "feat: подсчёт длительностей работ и суммарного стажа"
```

---

### Task 4: HTML-проекция резюме

**Files:**
- Create: `src/shared/lib/now.ts`, `src/entities/skill/categories.ts`
- Create: `src/features/resume-document/ResumeDocument.tsx`, `src/features/resume-document/JobEntry.tsx`, `src/features/resume-document/SkillList.tsx`
- Create: `src/app/styles.css`
- Modify: `src/app/App.tsx`, `src/main.tsx`
- Test: `src/features/resume-document/ResumeDocument.test.tsx`

**Interfaces:**
- Consumes: `jobs`, `skills` из `@/content`; `formatMonths`, `jobMonths`, `totalExperienceMonths` из `@/entities/job/duration`.
- Produces:
  - `currentMonthIso(): string` из `@/shared/lib/now` — текущий месяц в формате `'YYYY-MM'`.
  - `CATEGORY_LABELS: Record<SkillCategory, string>` из `@/entities/skill/categories`.
  - `<ResumeDocument />` — без пропсов, семантический документ резюме.
  - `<JobEntry job={job} now={now} />`, `<SkillList />`.

- [ ] **Step 1: Написать падающий тест**

```bash
mkdir -p src/features/resume-document src/entities/skill src/shared/lib
cat > src/features/resume-document/ResumeDocument.test.tsx <<'EOF'
import { render, screen } from '@testing-library/react';
import { jobs } from '@/content';
import { ResumeDocument } from './ResumeDocument';

describe('ResumeDocument', () => {
  it('показывает все места работы из контента', () => {
    render(<ResumeDocument />);
    for (const job of jobs) {
      expect(screen.getByText(job.company)).toBeInTheDocument();
    }
  });

  it('содержит единственный заголовок первого уровня с именем', () => {
    render(<ResumeDocument />);
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent('Альберт Аллагулов');
  });

  it('показывает суммарный стаж', () => {
    render(<ResumeDocument />);
    expect(screen.getByText(/9 лет 9 месяцев/)).toBeInTheDocument();
  });

  it('у каждой работы выводится её длительность', () => {
    render(<ResumeDocument />);
    expect(screen.getByText(/6 лет 11 месяцев/)).toBeInTheDocument();
    expect(screen.getByText(/1 год 3 месяца/)).toBeInTheDocument();
  });

  it('внешние ссылки открываются безопасно', () => {
    render(<ResumeDocument />);
    const link = screen.getByRole('link', { name: /mplat\.io/ });
    expect(link).toHaveAttribute('href', 'https://mplat.io/');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('каждая работа — это отдельная секция с доступным именем', () => {
    render(<ResumeDocument />);
    for (const job of jobs) {
      expect(
        screen.getByRole('region', { name: new RegExp(job.company) }),
      ).toBeInTheDocument();
    }
  });

  it('группирует навыки по категориям', () => {
    render(<ResumeDocument />);
    expect(screen.getByRole('heading', { name: 'Картография' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Тестирование' })).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/resume-document`
Expected: FAIL — `Failed to resolve import "./ResumeDocument"`.

- [ ] **Step 3: Создать вспомогательные модули**

```bash
cat > src/shared/lib/now.ts <<'EOF'
/**
 * Текущий месяц в формате YYYY-MM. Единая точка получения «сейчас»:
 * и предрендер, и гидрация считают стаж от одного значения.
 */
export function currentMonthIso(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}
EOF
cat > src/entities/skill/categories.ts <<'EOF'
import type { SkillCategory } from '@/content';

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'Языки',
  framework: 'Фреймворки и UI',
  state: 'Состояние',
  build: 'Сборка',
  testing: 'Тестирование',
  backend: 'Бэкенд',
  database: 'Базы данных',
  geo: 'Картография',
  infra: 'Инфраструктура',
};

export const CATEGORY_ORDER: readonly SkillCategory[] = [
  'language',
  'framework',
  'state',
  'build',
  'testing',
  'backend',
  'database',
  'geo',
  'infra',
];
EOF
```

- [ ] **Step 4: Создать компоненты**

```bash
cat > src/features/resume-document/JobEntry.tsx <<'EOF'
import type { Job } from '@/content';
import { formatMonths, jobMonths } from '@/entities/job/duration';

const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

function formatIsoMonth(iso: string): string {
  const [year, month] = iso.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function JobEntry({ job, now }: { job: Job; now: string }) {
  const period = `${formatIsoMonth(job.start)} — ${
    job.end === null ? 'настоящее время' : formatIsoMonth(job.end)
  }`;

  return (
    <section className="job" aria-labelledby={`job-${job.id}`} id={job.id}>
      <h3 id={`job-${job.id}`}>
        <span className="job__company">{job.company}</span>{' '}
        <span className="job__role">— {job.role}</span>
      </h3>
      <p className="job__meta">
        <span>{period}</span>
        <span className="job__duration">{formatMonths(jobMonths(job, now))}</span>
        <span>{job.city}</span>
        {job.url !== undefined && (
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            {job.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
      </p>
      <p className="job__summary">{job.summary}</p>
      <ul className="job__bullets">
        {job.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {job.metrics !== undefined && (
        <dl className="job__metrics">
          {job.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
EOF
cat > src/features/resume-document/SkillList.tsx <<'EOF'
import { skills } from '@/content';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/entities/skill/categories';

export function SkillList() {
  return (
    <div className="skills">
      {CATEGORY_ORDER.map((category) => {
        const group = skills.filter((skill) => skill.category === category);
        if (group.length === 0) return null;
        return (
          <div className="skills__group" key={category}>
            <h3>{CATEGORY_LABELS[category]}</h3>
            <ul>
              {group.map((skill) => (
                <li key={skill.id}>{skill.label}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
EOF
cat > src/features/resume-document/ResumeDocument.tsx <<'EOF'
import { jobs } from '@/content';
import { formatMonths, totalExperienceMonths } from '@/entities/job/duration';
import { currentMonthIso } from '@/shared/lib/now';
import { JobEntry } from './JobEntry';
import { SkillList } from './SkillList';

export function ResumeDocument() {
  const now = currentMonthIso();
  const experience = formatMonths(totalExperienceMonths(jobs, now));
  const ordered = [...jobs].reverse();

  return (
    <article className="resume">
      <header className="resume__header">
        <h1>Альберт Аллагулов</h1>
        <p className="resume__role">Senior Frontend Developer</p>
        <p className="resume__lead">
          React, TypeScript, highload, UI-архитектура. Опыт — {experience}.
          Казань, удалённая работа.
        </p>
        <ul className="resume__contacts">
          <li>
            <a href="mailto:goonnors@gmail.com">goonnors@gmail.com</a>
          </li>
          <li>
            <a href="https://t.me/albert_allagulov" target="_blank" rel="noopener noreferrer">
              telegram
            </a>
          </li>
        </ul>
      </header>

      <h2>Опыт работы</h2>
      {ordered.map((job) => (
        <JobEntry job={job} now={now} key={job.id} />
      ))}

      <h2>Навыки</h2>
      <SkillList />

      <h2>Образование</h2>
      <p>
        Омский государственный университет им. Ф. М. Достоевского, физический
        факультет, радиофизика, 2015.
      </p>
    </article>
  );
}
EOF
```

- [ ] **Step 5: Подключить документ и стили**

Стили сознательно минимальны: эстетика вырабатывается на фазе 2, и спека (§9, Р-4) запрещает её полировку раньше.

```bash
cat > src/app/styles.css <<'EOF'
:root {
  color-scheme: dark;
  --bg: #0d0f14;
  --fg: #e8e6e1;
  --muted: #8d8a84;
  --accent: #7dd3c0;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.resume { max-width: 46rem; margin: 0 auto; padding: 4rem 1.25rem; }
h1 { font-size: clamp(2rem, 6vw, 3.25rem); line-height: 1.1; margin: 0; }
h2 { margin: 3.5rem 0 1rem; font-size: 1.125rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
h3 { margin: 0 0 .25rem; font-size: 1.0625rem; }
a { color: var(--accent); }
.resume__role { margin: .5rem 0 0; color: var(--accent); }
.resume__lead { color: var(--muted); }
.resume__contacts, .job__meta { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0; list-style: none; }
.job { margin-bottom: 2.5rem; }
.job__role { color: var(--muted); font-weight: 400; }
.job__meta { font-size: .875rem; color: var(--muted); margin: .25rem 0 .75rem; }
.job__duration::before { content: '· '; }
.job__bullets { margin: 0; padding-left: 1.25rem; }
.job__metrics { display: flex; flex-wrap: wrap; gap: 1.5rem; margin: 1rem 0 0; }
.job__metrics dt { font-size: .8125rem; color: var(--muted); }
.job__metrics dd { margin: 0; font-size: 1.25rem; color: var(--accent); }
.skills { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
.skills__group h3 { font-size: .8125rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.skills__group ul { margin: 0; padding-left: 1.25rem; }
EOF
cat > src/app/App.tsx <<'EOF'
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import './styles.css';

export default function App() {
  return (
    <main>
      <ResumeDocument />
    </main>
  );
}
EOF
```

- [ ] **Step 6: Запустить тесты**

Run: `npx vitest run && npx tsc -b`
Expected: все тесты PASS (включая App.test.tsx из Task 1 — заголовок остался единственным).

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "feat: HTML-проекция резюме"
```

---

### Task 5: Предрендер в статический HTML

Без этого шага требование спеки «контент читается при отключённом JavaScript» невыполнимо: обычный Vite-SPA отдаёт пустой `<div id="root">`. Предрендер также переносит LCP на HTML-проекцию, как требуют Global Constraints.

**Files:**
- Create: `src/entry-server.tsx`, `scripts/prerender.mjs`, `src/shared/lib/injectAppHtml.ts`
- Modify: `src/main.tsx`, `package.json`, `tsconfig.json`
- Test: `src/shared/lib/injectAppHtml.test.ts`

**Interfaces:**
- Consumes: `App` из `@/app/App`.
- Produces:
  - `injectAppHtml(template: string, appHtml: string): string` — вставляет разметку внутрь `<div id="root">`; бросает `Error`, если точка монтирования не найдена.
  - `render(): string` из `src/entry-server.tsx`.
  - `npm run build` выдаёт `dist/index.html` с полной разметкой резюме.

- [ ] **Step 1: Написать падающий тест**

```bash
cat > src/shared/lib/injectAppHtml.test.ts <<'EOF'
import { injectAppHtml } from './injectAppHtml';

const TEMPLATE = '<html><body><div id="root"></div></body></html>';

describe('injectAppHtml', () => {
  it('вставляет разметку внутрь точки монтирования', () => {
    const result = injectAppHtml(TEMPLATE, '<h1>Привет</h1>');
    expect(result).toBe(
      '<html><body><div id="root"><h1>Привет</h1></div></body></html>',
    );
  });

  it('терпит атрибуты и пробелы в точке монтирования', () => {
    const template = '<div id="root" class="app">   </div>';
    expect(injectAppHtml(template, '<p>x</p>')).toBe(
      '<div id="root" class="app"><p>x</p></div>',
    );
  });

  it('падает, если точки монтирования нет — молчаливо пустая страница хуже ошибки сборки', () => {
    expect(() => injectAppHtml('<body></body>', '<h1>x</h1>')).toThrow(
      /root/,
    );
  });
});
EOF
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/shared/lib/injectAppHtml.test.ts`
Expected: FAIL — `Failed to resolve import "./injectAppHtml"`.

- [ ] **Step 3: Реализовать инъекцию**

```bash
cat > src/shared/lib/injectAppHtml.ts <<'EOF'
const MOUNT_POINT = /(<div id="root"[^>]*>)\s*(<\/div>)/;

export function injectAppHtml(template: string, appHtml: string): string {
  if (!MOUNT_POINT.test(template)) {
    throw new Error('injectAppHtml: в шаблоне не найден <div id="root"></div>');
  }
  return template.replace(MOUNT_POINT, `$1${appHtml}$2`);
}
EOF
```

- [ ] **Step 4: Запустить тест — он должен пройти**

Run: `npx vitest run src/shared/lib/injectAppHtml.test.ts`
Expected: PASS, 3 теста.

- [ ] **Step 5: Собрать серверную точку входа и скрипт предрендера**

```bash
cd /home/albert/projects/portfolio
mkdir -p scripts
cat > src/entry-server.tsx <<'EOF'
import { renderToString } from 'react-dom/server';
import App from '@/app/App';

export function render(): string {
  return renderToString(<App />);
}
EOF
cat > scripts/prerender.mjs <<'EOF'
import { readFile, writeFile } from 'node:fs/promises';
import { injectAppHtml } from '../dist-ssr/injectAppHtml.js';
import { render } from '../dist-ssr/entry-server.js';

const template = await readFile('dist/index.html', 'utf8');
await writeFile('dist/index.html', injectAppHtml(template, render()), 'utf8');
console.log('prerender: dist/index.html содержит разметку резюме');
EOF
```

`scripts/prerender.mjs` импортирует `injectAppHtml` из SSR-бандла, а не из `src/`, чтобы не тянуть в Node алиасы и TypeScript. Чтобы модуль там оказался, он объявляется вторым входом SSR-сборки.

- [ ] **Step 6: Настроить сборку**

Конфиг Vite переписывается целиком и становится функцией от `ConfigEnv`. Это
принципиально: задать `build.rollupOptions.input` на верхнем уровне нельзя — он
переопределил бы вход клиентской сборки, которая обязана брать его из
`index.html`. Ветка по `isSsrBuild` разделяет две сборки.

```bash
cd /home/albert/projects/portfolio
python3 -c "
import json, pathlib
p = pathlib.Path('package.json')
pkg = json.loads(p.read_text())
pkg['scripts']['build'] = 'tsc -b && vite build && npm run build:ssr && node scripts/prerender.mjs'
pkg['scripts']['build:ssr'] = 'vite build --ssr --outDir dist-ssr'
p.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + chr(10))
"
cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  base: '/portfolio/',
  plugins: [react()],
  resolve: {
    alias: { '@': resolvePath('./src') },
  },
  build: isSsrBuild
    ? {
        // Два входа только для SSR-сборки: разметка и утилита инъекции,
        // которую импортирует scripts/prerender.mjs.
        rollupOptions: {
          input: {
            'entry-server': resolvePath('./src/entry-server.tsx'),
            injectAppHtml: resolvePath('./src/shared/lib/injectAppHtml.ts'),
          },
          output: { entryFileNames: '[name].js', format: 'esm' },
        },
      }
    : {},
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
}));
EOF
```

- [ ] **Step 7: Перейти на гидрацию**

```bash
cat > src/main.tsx <<'EOF'
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from '@/app/App';

const container = document.getElementById('root')!;
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Предрендеренная разметка гидрируется; при пустом контейнере (dev-сервер) —
// обычный рендер.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
EOF
```

- [ ] **Step 8: Проверить, что сборка действительно содержит контент**

```bash
cd /home/albert/projects/portfolio
npm run build
grep -c 'ГИСГИС' dist/index.html
grep -c '9 лет 9 месяцев' dist/index.html
```

Expected: обе команды печатают число ≥ 1. Если `0` — предрендер не сработал, разбираться до продолжения: без этого сайт не выполняет требование спеки.

- [ ] **Step 9: Коммит**

```bash
git add -A
git commit -m "feat: предрендер резюме в статический HTML"
```

---

### Task 6: Деплой на GitHub Pages — завершение фазы 0

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` (создать)

**Interfaces:**
- Consumes: `npm run build` из Task 5.
- Produces: публичный URL `https://<username>.github.io/portfolio/`, автодеплой при пуше в `main`.

- [ ] **Step 1: Проверить готовность окружения**

```bash
gh auth status
```

Expected: авторизация подтверждена. Если нет — выполнение останавливается здесь, и автор логинится сам: в интерактивной сессии `! gh auth login`. Не пытаться обойти это.

- [ ] **Step 2: Создать workflow**

```bash
cd /home/albert/projects/portfolio
mkdir -p .github/workflows
cat > .github/workflows/deploy.yml <<'EOF'
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
EOF
cat > README.md <<'EOF'
# Портфолио

Персональный сайт-портфолио. Контент резюме живёт в `src/content/` и служит
источником правды для двух проекций: статического HTML-документа и 3D-сцены.

- Дизайн: `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md`
- План фаз 0-1: `docs/superpowers/plans/2026-09-13-portfolio-phases-0-1.md`

```bash
npm install
npm run dev     # разработка
npm test        # тесты
npm run build   # сборка + предрендер в dist/
```
EOF
git add -A
git commit -m "ci: деплой на GitHub Pages"
```

- [ ] **Step 3: Создать репозиторий и отправить код**

```bash
cd /home/albert/projects/portfolio
git branch -M main
gh repo create portfolio --public --source=. --push
```

- [ ] **Step 4: Включить Pages через Actions**

```bash
cd /home/albert/projects/portfolio
gh api -X POST "repos/{owner}/{repo}/pages" -f 'build_type=workflow' \
  || gh api -X PUT "repos/{owner}/{repo}/pages" -f 'build_type=workflow'
gh workflow run Deploy || true
```

Первая команда создаёт конфигурацию Pages, вторая ветка `||` — обновляет, если она уже есть.

- [ ] **Step 5: Дождаться деплоя и проверить живой сайт**

```bash
cd /home/albert/projects/portfolio
gh run watch --exit-status
URL=$(gh api "repos/{owner}/{repo}/pages" --jq .html_url)
echo "$URL"
curl -sS "$URL" | grep -c 'ГИСГИС'
```

Expected: workflow зелёный, `curl` находит контент в отданном HTML. Это подтверждает, что сайт работает и без JavaScript.

- [ ] **Step 6: Зафиксировать URL в README**

```bash
cd /home/albert/projects/portfolio
URL=$(gh api "repos/{owner}/{repo}/pages" --jq .html_url)
python3 - "$URL" <<'PY'
import pathlib, sys
p = pathlib.Path('README.md')
p.write_text(p.read_text().replace(
    '# Портфолио\n',
    f'# Портфолио\n\n{sys.argv[1]}\n', 1))
PY
git add README.md
git commit -m "docs: ссылка на задеплоенный сайт"
git push
```

**Фаза 0 завершена: работающий задеплоенный сайт-резюме, читаемый без JavaScript.**

---

## Фаза 1

**Решение о композиции слоёв, принятое здесь и действующее до конца фазы:** канвас — это `position: fixed; inset: 0` фоновый слой с `z-index: 0`, а HTML-документ скроллится поверх него в обычном потоке. Отсюда следствие: **прогресс камеры берётся из скролла настоящего документа**, никаких spacer-элементов и виртуальной высоты не вводится. Один скролл управляет и текстом, и камерой, а страница остаётся доступной и неломаной.

---

### Task 7: Стор прогресса скролла

**Files:**
- Create: `src/shared/lib/math.ts`, `src/features/scroll-bridge/progressStore.ts`
- Test: `src/shared/lib/math.test.ts`, `src/features/scroll-bridge/progressStore.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `clamp01(value: number): number` из `@/shared/lib/math` — NaN даёт `0`.
  - `type SceneMode = 'travelling' | 'docked'`
  - `progressStore` — vanilla-стор zustand со `getState`, `setState`, `subscribe`.
  - `setProgress(value: number): void`, `setSceneMode(mode: SceneMode): void`
  - `type ProgressState = { progress: number; mode: SceneMode }`

Прогресс намеренно живёт в vanilla-сторе, а не в React-состоянии: его читают в `useFrame` 60 раз в секунду, и ре-рендер на каждом кадре недопустим (Global Constraints).

- [ ] **Step 1: Установить zustand**

```bash
cd /home/albert/projects/portfolio && npm install zustand
```

- [ ] **Step 2: Написать падающие тесты**

```bash
mkdir -p src/features/scroll-bridge
cat > src/shared/lib/math.test.ts <<'EOF'
import { clamp01 } from './math';

describe('clamp01', () => {
  it('оставляет значения внутри диапазона', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
  });

  it('обрезает выходы за границы', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(1.7)).toBe(1);
  });

  it('NaN превращает в 0, чтобы кадр не ломался', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});
EOF
cat > src/features/scroll-bridge/progressStore.test.ts <<'EOF'
import { progressStore, setProgress, setSceneMode } from './progressStore';

describe('progressStore', () => {
  beforeEach(() => {
    progressStore.setState({ progress: 0, mode: 'travelling' });
  });

  it('стартует в начале маршрута в режиме путешествия', () => {
    expect(progressStore.getState()).toEqual({ progress: 0, mode: 'travelling' });
  });

  it('клампит прогресс в 0..1', () => {
    setProgress(2);
    expect(progressStore.getState().progress).toBe(1);
    setProgress(-1);
    expect(progressStore.getState().progress).toBe(0);
  });

  it('уведомляет подписчиков об изменении прогресса', () => {
    const seen: number[] = [];
    const unsubscribe = progressStore.subscribe((state) => seen.push(state.progress));
    setProgress(0.25);
    setProgress(0.5);
    unsubscribe();
    setProgress(0.75);
    expect(seen).toEqual([0.25, 0.5]);
  });

  it('переключает режим сцены', () => {
    setSceneMode('docked');
    expect(progressStore.getState().mode).toBe('docked');
  });
});
EOF
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/shared/lib/math.test.ts src/features/scroll-bridge`
Expected: FAIL — модули не найдены.

- [ ] **Step 4: Реализация**

```bash
cat > src/shared/lib/math.ts <<'EOF'
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
EOF
cat > src/features/scroll-bridge/progressStore.ts <<'EOF'
import { createStore } from 'zustand/vanilla';
import { clamp01 } from '@/shared/lib/math';

export type SceneMode = 'travelling' | 'docked';

export type ProgressState = {
  /** Позиция на маршруте, 0..1. Читается в useFrame, не через React. */
  progress: number;
  mode: SceneMode;
};

export const progressStore = createStore<ProgressState>(() => ({
  progress: 0,
  mode: 'travelling',
}));

export function setProgress(value: number): void {
  progressStore.setState({ progress: clamp01(value) });
}

export function setSceneMode(mode: SceneMode): void {
  progressStore.setState({ mode });
}
EOF
```

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run src/shared/lib/math.test.ts src/features/scroll-bridge`
Expected: PASS, 7 тестов.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat: транзиентный стор прогресса скролла"
```

---

### Task 8: Маршрут камеры и его чистая математика

Ядро фазы 1. Всё, что определяет движение камеры, живёт здесь и тестируется без WebGL и без браузера.

**Files:**
- Create: `src/features/career-flight/route.ts`
- Test: `src/features/career-flight/route.test.ts`

**Interfaces:**
- Consumes: `clamp01` из `@/shared/lib/math`; `jobs` из `@/content`.
- Produces:
  - `LOOK_AHEAD: number` — константа, на сколько единиц вперёд смотрит камера.
  - `cameraWaypoint(index: number): Vector3` — точка маршрута напротив станции.
  - `stationPosition(index: number): Vector3` — где стоит сама станция (в стороне от маршрута).
  - `buildRoute(stationCount: number): CatmullRomCurve3`
  - `route: CatmullRomCurve3` — маршрут для `jobs.length` станций.
  - `stationProgress(index: number, count: number): number`
  - `activeStationIndex(t: number, count: number): number`
  - `progressToCamera(t: number): { position: Vector3; target: Vector3 }`

- [ ] **Step 1: Установить three**

```bash
cd /home/albert/projects/portfolio && npm install three && npm install -D @types/three
```

- [ ] **Step 2: Написать падающий тест**

```bash
mkdir -p src/features/career-flight
cat > src/features/career-flight/route.test.ts <<'EOF'
import { jobs } from '@/content';
import {
  activeStationIndex,
  cameraWaypoint,
  progressToCamera,
  route,
  stationPosition,
  stationProgress,
} from './route';

const COUNT = jobs.length;

describe('геометрия маршрута', () => {
  it('станции расставлены вдоль уходящей вдаль оси Z', () => {
    const zs = Array.from({ length: COUNT }, (_, i) => cameraWaypoint(i).z);
    expect([...zs].sort((a, b) => b - a)).toEqual(zs);
  });

  it('станции стоят в стороне от маршрута, а не на нём', () => {
    for (let i = 0; i < COUNT; i += 1) {
      expect(stationPosition(i).distanceTo(cameraWaypoint(i))).toBeGreaterThan(1);
    }
  });

  it('станции чередуют сторону маршрута', () => {
    const sides = Array.from({ length: COUNT }, (_, i) =>
      Math.sign(stationPosition(i).x - cameraWaypoint(i).x),
    );
    for (let i = 1; i < sides.length; i += 1) {
      expect(sides[i]).not.toBe(sides[i - 1]);
    }
  });
});

describe('stationProgress', () => {
  it('первая станция в начале, последняя в конце маршрута', () => {
    expect(stationProgress(0, COUNT)).toBe(0);
    expect(stationProgress(COUNT - 1, COUNT)).toBe(1);
  });

  it('распределяет станции равномерно', () => {
    expect(stationProgress(1, 4)).toBeCloseTo(1 / 3, 5);
    expect(stationProgress(2, 4)).toBeCloseTo(2 / 3, 5);
  });

  it('не делится на ноль при единственной станции', () => {
    expect(stationProgress(0, 1)).toBe(0);
  });
});

describe('activeStationIndex', () => {
  it('выбирает ближайшую станцию', () => {
    expect(activeStationIndex(0, 4)).toBe(0);
    expect(activeStationIndex(1, 4)).toBe(3);
    expect(activeStationIndex(0.34, 4)).toBe(1);
    expect(activeStationIndex(0.6, 4)).toBe(2);
  });

  it('клампит прогресс за границами', () => {
    expect(activeStationIndex(-5, 4)).toBe(0);
    expect(activeStationIndex(9, 4)).toBe(3);
  });
});

describe('progressToCamera', () => {
  it('в начале маршрута стоит у первой путевой точки', () => {
    const { position } = progressToCamera(0);
    expect(position.distanceTo(route.getPointAt(0))).toBeLessThan(1e-6);
  });

  it('в конце маршрута стоит у последней путевой точки', () => {
    const { position } = progressToCamera(1);
    expect(position.distanceTo(route.getPointAt(1))).toBeLessThan(1e-6);
  });

  it('движется монотонно вперёд по маршруту', () => {
    const start = progressToCamera(0).position;
    const middle = progressToCamera(0.5).position;
    const end = progressToCamera(1).position;
    expect(start.distanceTo(middle)).toBeGreaterThan(0);
    expect(start.distanceTo(end)).toBeGreaterThan(start.distanceTo(middle));
  });

  it('смотрит вперёд по ходу движения, в том числе в самом конце', () => {
    for (const t of [0, 0.5, 1]) {
      const { position, target } = progressToCamera(t);
      const toTarget = target.clone().sub(position);
      expect(toTarget.length()).toBeGreaterThan(0.5);
      expect(toTarget.normalize().dot(route.getTangentAt(t === 1 ? 1 : t))).toBeGreaterThan(0.5);
    }
  });

  it('клампит прогресс за границами диапазона', () => {
    expect(progressToCamera(-2).position.distanceTo(progressToCamera(0).position)).toBe(0);
    expect(progressToCamera(4).position.distanceTo(progressToCamera(1).position)).toBe(0);
  });
});
EOF
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/career-flight/route.test.ts`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 4: Реализация**

```bash
cat > src/features/career-flight/route.ts <<'EOF'
import { CatmullRomCurve3, Vector3 } from 'three';
import { jobs } from '@/content';
import { clamp01 } from '@/shared/lib/math';

/** Насколько далеко вперёд по маршруту смотрит камера. */
export const LOOK_AHEAD = 8;

const STATION_SPACING = 22;
const STATION_RISE = 2.5;
const STATION_SIDE_OFFSET = 6;

/** Точка маршрута, с которой видна станция с этим индексом. */
export function cameraWaypoint(index: number): Vector3 {
  return new Vector3(
    Math.sin(index * 0.9) * 3,
    index * STATION_RISE,
    -index * STATION_SPACING,
  );
}

/** Сама станция стоит сбоку от маршрута, чтобы камера пролетала мимо, а не сквозь. */
export function stationPosition(index: number): Vector3 {
  const side = index % 2 === 0 ? 1 : -1;
  return cameraWaypoint(index).add(new Vector3(side * STATION_SIDE_OFFSET, 0, 0));
}

export function buildRoute(stationCount: number): CatmullRomCurve3 {
  const points = Array.from({ length: stationCount }, (_, i) => cameraWaypoint(i));
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

export const route = buildRoute(jobs.length);

export function stationProgress(index: number, count: number): number {
  if (count <= 1) return 0;
  return index / (count - 1);
}

export function activeStationIndex(t: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round(clamp01(t) * (count - 1));
}

export function progressToCamera(t: number): { position: Vector3; target: Vector3 } {
  const clamped = clamp01(t);
  const position = route.getPointAt(clamped);
  // Цель задаётся касательной, а не точкой «t + шаг»: так конец маршрута
  // не становится краевым случаем с нулевым направлением взгляда.
  const tangent = route.getTangentAt(clamped).multiplyScalar(LOOK_AHEAD);
  return { position, target: position.clone().add(tangent) };
}
EOF
```

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run src/features/career-flight/route.test.ts`
Expected: PASS, 13 тестов.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat: маршрут камеры и его чистая математика"
```

---

### Task 9: Определение пригодности окружения для 3D

**Files:**
- Create: `src/shared/lib/sceneSupport.ts`, `src/shared/hooks/useSceneEnabled.ts`
- Test: `src/shared/lib/sceneSupport.test.ts`, `src/shared/hooks/useSceneEnabled.test.tsx`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `type SceneSupport = { prefersReducedMotion: boolean; hasWebGL: boolean; gpuTier: number | null }`
  - `shouldEnableScene(support: SceneSupport): boolean` — `gpuTier: null` означает «ещё не выяснено» и даёт `false`.
  - `detectWebGL(): boolean`
  - `useSceneEnabled(): boolean`

- [ ] **Step 1: Установить detect-gpu**

```bash
cd /home/albert/projects/portfolio && npm install detect-gpu
```

- [ ] **Step 2: Написать падающие тесты**

```bash
mkdir -p src/shared/hooks
cat > src/shared/lib/sceneSupport.test.ts <<'EOF'
import { shouldEnableScene } from './sceneSupport';

const capable = { prefersReducedMotion: false, hasWebGL: true, gpuTier: 3 };

describe('shouldEnableScene', () => {
  it('разрешает сцену на способном окружении', () => {
    expect(shouldEnableScene(capable)).toBe(true);
  });

  it('запрещает сцену при просьбе уменьшить движение', () => {
    expect(shouldEnableScene({ ...capable, prefersReducedMotion: true })).toBe(false);
  });

  it('запрещает сцену без WebGL', () => {
    expect(shouldEnableScene({ ...capable, hasWebGL: false })).toBe(false);
  });

  it('запрещает сцену на GPU tier 0 и 1', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: 0 })).toBe(false);
    expect(shouldEnableScene({ ...capable, gpuTier: 1 })).toBe(false);
  });

  it('разрешает сцену начиная с tier 2', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: 2 })).toBe(true);
  });

  it('пока класс GPU не выяснен, сцена не монтируется', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: null })).toBe(false);
  });
});
EOF
cat > src/shared/hooks/useSceneEnabled.test.tsx <<'EOF'
import { renderHook, waitFor } from '@testing-library/react';
import { useSceneEnabled } from './useSceneEnabled';

const getGPUTier = vi.hoisted(() => vi.fn());
vi.mock('detect-gpu', () => ({ getGPUTier }));

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

describe('useSceneEnabled', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getGPUTier.mockResolvedValue({ tier: 3 });
    mockMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
  });

  it('сначала выключено, затем включается после определения GPU', async () => {
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('остаётся выключенным при prefers-reduced-motion и не трогает GPU', async () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSceneEnabled());
    await waitFor(() => expect(getGPUTier).not.toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным на слабом GPU', async () => {
    getGPUTier.mockResolvedValue({ tier: 1 });
    const { result } = renderHook(() => useSceneEnabled());
    await waitFor(() => expect(getGPUTier).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным без WebGL', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { result } = renderHook(() => useSceneEnabled());
    await waitFor(() => expect(getGPUTier).not.toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
EOF
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/shared/lib/sceneSupport.test.ts src/shared/hooks`
Expected: FAIL — модули не найдены.

- [ ] **Step 4: Реализация**

```bash
cat > src/shared/lib/sceneSupport.ts <<'EOF'
export type SceneSupport = {
  prefersReducedMotion: boolean;
  hasWebGL: boolean;
  /** null — класс GPU ещё не определён. */
  gpuTier: number | null;
};

/** Минимальный класс GPU, на котором сцена допускается. */
const MIN_GPU_TIER = 2;

export function shouldEnableScene(support: SceneSupport): boolean {
  if (support.prefersReducedMotion) return false;
  if (!support.hasWebGL) return false;
  if (support.gpuTier === null) return false;
  return support.gpuTier >= MIN_GPU_TIER;
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}
EOF
cat > src/shared/hooks/useSceneEnabled.ts <<'EOF'
import { useEffect, useState } from 'react';
import { detectWebGL, shouldEnableScene } from '@/shared/lib/sceneSupport';

/**
 * Решает, монтировать ли 3D-слой. Возвращает false до окончания проверки:
 * страница обязана быть полезной без сцены, поэтому «ещё не знаю» — это «нет».
 */
export function useSceneEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const hasWebGL = detectWebGL();

    if (!shouldEnableScene({ prefersReducedMotion, hasWebGL, gpuTier: 2 })) return;

    let cancelled = false;
    void (async () => {
      const { getGPUTier } = await import('detect-gpu');
      const { tier } = await getGPUTier();
      if (cancelled) return;
      setEnabled(shouldEnableScene({ prefersReducedMotion, hasWebGL, gpuTier: tier }));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
EOF
```

Проверка `shouldEnableScene` с подставленным `gpuTier: 2` перед асинхронной частью — это ранний выход: если движение не нужно или WebGL нет, `detect-gpu` не загружается вовсе, и его вес не тратится впустую.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run src/shared/lib/sceneSupport.test.ts src/shared/hooks`
Expected: PASS, 10 тестов.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat: определение пригодности окружения для 3D-слоя"
```

---

### Task 10: Канвас и движение камеры

**Files:**
- Create: `src/features/career-flight/stepCamera.ts`, `src/features/career-flight/CameraRig.tsx`, `src/features/career-flight/CareerScene.tsx`, `src/features/career-flight/SceneLayer.tsx`
- Modify: `src/app/App.tsx`, `src/app/styles.css`
- Test: `src/features/career-flight/stepCamera.test.ts`, `src/features/career-flight/CameraRig.test.tsx`

**Interfaces:**
- Consumes: `progressToCamera`, `route` из `./route`; `progressStore` из `@/features/scroll-bridge/progressStore`; `useSceneEnabled` из `@/shared/hooks/useSceneEnabled`.
- Produces:
  - `smoothingFactor(delta: number, smoothing?: number): number`
  - `stepCamera(current: Vector3, desired: Vector3, delta: number, smoothing?: number): Vector3` — возвращает **новый** `Vector3`, не мутирует аргументы.
  - `<CameraRig />` — без пропсов, владеет камерой.
  - `<CareerScene />` — содержимое сцены.
  - `SceneLayer` — **дефолтный** экспорт (нужен для `React.lazy`).

- [ ] **Step 1: Установить R3F**

```bash
cd /home/albert/projects/portfolio
npm install @react-three/fiber @react-three/drei
npm install -D @react-three/test-renderer
```

- [ ] **Step 2: Написать падающий тест на сглаживание**

```bash
cat > src/features/career-flight/stepCamera.test.ts <<'EOF'
import { Vector3 } from 'three';
import { smoothingFactor, stepCamera } from './stepCamera';

describe('smoothingFactor', () => {
  it('при нулевом кадре не двигается вовсе', () => {
    expect(smoothingFactor(0)).toBe(0);
  });

  it('растёт с длительностью кадра, не превышая единицу', () => {
    expect(smoothingFactor(0.016)).toBeGreaterThan(0);
    expect(smoothingFactor(0.016)).toBeLessThan(smoothingFactor(0.1));
    expect(smoothingFactor(100)).toBeLessThanOrEqual(1);
  });
});

describe('stepCamera', () => {
  const from = () => new Vector3(0, 0, 0);
  const to = new Vector3(10, 0, 0);

  it('приближается к цели, но не достигает её за один короткий кадр', () => {
    const next = stepCamera(from(), to, 0.016);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(10);
  });

  it('не перелетает цель даже при огромном кадре', () => {
    const next = stepCamera(from(), to, 10);
    expect(next.x).toBeLessThanOrEqual(10);
    expect(next.x).toBeCloseTo(10, 3);
  });

  it('за много кадров сходится к цели', () => {
    let current = from();
    for (let i = 0; i < 240; i += 1) current = stepCamera(current, to, 0.016);
    expect(current.distanceTo(to)).toBeLessThan(0.01);
  });

  it('не мутирует переданные векторы', () => {
    const current = from();
    const desired = to.clone();
    stepCamera(current, desired, 0.5);
    expect(current.toArray()).toEqual([0, 0, 0]);
    expect(desired.toArray()).toEqual([10, 0, 0]);
  });
});
EOF
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/career-flight/stepCamera.test.ts`
Expected: FAIL — `Failed to resolve import "./stepCamera"`.

- [ ] **Step 4: Реализовать сглаживание**

```bash
cat > src/features/career-flight/stepCamera.ts <<'EOF'
import type { Vector3 } from 'three';

const DEFAULT_SMOOTHING = 4;

/**
 * Доля пути до цели, проходимая за кадр. Экспоненциальная форма делает
 * сглаживание независимым от частоты кадров: на 30 и 144 fps движение
 * выглядит одинаково.
 */
export function smoothingFactor(delta: number, smoothing = DEFAULT_SMOOTHING): number {
  return 1 - Math.exp(-smoothing * delta);
}

export function stepCamera(
  current: Vector3,
  desired: Vector3,
  delta: number,
  smoothing = DEFAULT_SMOOTHING,
): Vector3 {
  return current.clone().lerp(desired, smoothingFactor(delta, smoothing));
}
EOF
```

- [ ] **Step 5: Запустить тест — он должен пройти**

Run: `npx vitest run src/features/career-flight/stepCamera.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Step 6: Написать падающий тест на CameraRig**

Камера читается через собственный тестовый компонент-шпион, а не через приватное API тест-рендерера — так тест не зависит от версии библиотеки.

```bash
cat > src/features/career-flight/CameraRig.test.tsx <<'EOF'
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';
import { CameraRig } from './CameraRig';
import { progressToCamera } from './route';

function CameraSpy({ onCamera }: { onCamera: (camera: Camera) => void }) {
  const camera = useThree((state) => state.camera);
  onCamera(camera);
  return null;
}

async function mount() {
  let camera: Camera | undefined;
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <CameraRig />
      <CameraSpy onCamera={(value) => (camera = value)} />
    </>,
  );
  return { renderer, getCamera: () => camera! };
}

describe('CameraRig', () => {
  beforeEach(() => {
    progressStore.setState({ progress: 0, mode: 'travelling' });
  });

  it('ставит камеру в начало маршрута на первом кадре', async () => {
    const { renderer, getCamera } = await mount();
    await renderer.advanceFrames(1, 0.016);
    const expected = progressToCamera(0).position;
    expect(getCamera().position.distanceTo(expected)).toBeLessThan(0.01);
  });

  it('доводит камеру до конца маршрута при прогрессе 1', async () => {
    const { renderer, getCamera } = await mount();
    setProgress(1);
    await renderer.advanceFrames(240, 0.016);
    const expected = progressToCamera(1).position;
    expect(getCamera().position.distanceTo(expected)).toBeLessThan(0.5);
  });

  it('на середине маршрута находится между концами', async () => {
    const { renderer, getCamera } = await mount();
    setProgress(0.5);
    await renderer.advanceFrames(240, 0.016);
    const middle = progressToCamera(0.5).position;
    expect(getCamera().position.distanceTo(middle)).toBeLessThan(0.5);
  });

  it('не вызывает ре-рендер React на изменение прогресса', async () => {
    let renders = 0;
    function CountingRig() {
      renders += 1;
      return <CameraRig />;
    }
    const renderer = await ReactThreeTestRenderer.create(<CountingRig />);
    const before = renders;
    setProgress(0.3);
    setProgress(0.6);
    await renderer.advanceFrames(10, 0.016);
    expect(renders).toBe(before);
  });
});
EOF
```

- [ ] **Step 7: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/career-flight/CameraRig.test.tsx`
Expected: FAIL — `Failed to resolve import "./CameraRig"`.

- [ ] **Step 8: Реализовать CameraRig и сцену**

```bash
cat > src/features/career-flight/CameraRig.tsx <<'EOF'
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { progressStore } from '@/features/scroll-bridge/progressStore';
import { progressToCamera } from './route';
import { stepCamera } from './stepCamera';

/**
 * Единственный владелец камеры. Прогресс читается напрямую из vanilla-стора:
 * React в этом цикле не участвует и не ре-рендерится.
 */
export function CameraRig() {
  const lookAt = useRef(new Vector3());
  const initialized = useRef(false);

  useFrame(({ camera }, delta) => {
    const { progress } = progressStore.getState();
    const { position, target } = progressToCamera(progress);

    if (!initialized.current) {
      // Первый кадр — постановка без сглаживания, иначе камера летит из нуля.
      camera.position.copy(position);
      lookAt.current.copy(target);
      initialized.current = true;
    } else {
      camera.position.copy(stepCamera(camera.position, position, delta));
      lookAt.current.copy(stepCamera(lookAt.current, target, delta));
    }

    camera.lookAt(lookAt.current);
  });

  return null;
}
EOF
cat > src/features/career-flight/CareerScene.tsx <<'EOF'
import { CameraRig } from './CameraRig';
import { route } from './route';

export function CareerScene() {
  const end = route.getPointAt(1);

  return (
    <>
      <color attach="background" args={['#0d0f14']} />
      <fog attach="fog" args={['#0d0f14', 30, 160]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[12, 20, 8]} intensity={1.2} />
      <CameraRig />
      {/* Опорная сетка: на фазе 1 она делает движение камеры читаемым.
          Заменяется настоящим окружением на фазе 2. */}
      <gridHelper
        args={[400, 80, '#1d2430', '#141920']}
        position={[0, -2, end.z / 2]}
      />
    </>
  );
}
EOF
cat > src/features/career-flight/SceneLayer.tsx <<'EOF'
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { Suspense } from 'react';
import { CareerScene } from './CareerScene';

/** Дефолтный экспорт: слой подгружается через React.lazy, вместе с ним — three. */
export default function SceneLayer() {
  return (
    <div className="scene-layer" aria-hidden="true">
      <Canvas dpr={[1, 1.75]} camera={{ fov: 60, near: 0.1, far: 400 }}>
        <Suspense fallback={null}>
          <CareerScene />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
EOF
```

- [ ] **Step 9: Подключить слой к приложению**

```bash
cat > src/app/App.tsx <<'EOF'
import { Suspense, lazy } from 'react';
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';
import './styles.css';

const SceneLayer = lazy(() => import('@/features/career-flight/SceneLayer'));

export default function App() {
  const sceneEnabled = useSceneEnabled();

  return (
    <>
      {sceneEnabled && (
        <Suspense fallback={null}>
          <SceneLayer />
        </Suspense>
      )}
      <main>
        <ResumeDocument />
      </main>
    </>
  );
}
EOF
cat >> src/app/styles.css <<'EOF'

/* 3D-слой — фон под документом. pointer-events выключены: текст остаётся
   кликабельным. Включатся на фазе 3, когда появится picking по узлам графа. */
.scene-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
main { position: relative; z-index: 1; }
EOF
```

- [ ] **Step 10: Запустить все тесты и сборку**

Run: `npx vitest run && npx tsc -b && npm run build`
Expected: все тесты PASS. `App.test.tsx` из Task 1 продолжает проходить: в jsdom сцена не монтируется, потому что WebGL недоступен.

- [ ] **Step 11: Проверить глазами**

```bash
cd /home/albert/projects/portfolio && npm run dev
```

Открыть в браузере, проскроллить. Камера пока никуда не едет — прогресс всегда 0, скролл подключается в Task 12. Проверяется одно: сцена появилась, сетка видна, текст читается поверх неё, консоль чистая.

- [ ] **Step 12: Коммит**

```bash
git add -A
git commit -m "feat: ленивый 3D-слой и движение камеры по маршруту"
```

---

### Task 11: Станции и синхронизация с URL

**Files:**
- Create: `src/features/career-flight/stationHash.ts`, `src/features/career-flight/StationMarker.tsx`, `src/features/career-flight/useStationHash.ts`
- Modify: `src/features/career-flight/CareerScene.tsx`, `src/app/App.tsx`
- Test: `src/features/career-flight/stationHash.test.ts`

**Interfaces:**
- Consumes: `jobs` из `@/content`; `stationPosition`, `stationProgress`, `activeStationIndex` из `./route`; `setProgress`, `progressStore` из `@/features/scroll-bridge/progressStore`.
- Produces:
  - `hashToStationIndex(hash: string, ids: readonly string[]): number | null`
  - `stationIndexToHash(index: number, ids: readonly string[]): string`
  - `<StationMarker job={job} index={index} />`
  - `useStationHash(): void` — двусторонняя синхронизация активной станции и `location.hash`.

- [ ] **Step 1: Написать падающий тест**

```bash
cat > src/features/career-flight/stationHash.test.ts <<'EOF'
import { hashToStationIndex, stationIndexToHash } from './stationHash';

const IDS = ['amazingcat', 'polykod', 'mplat', 'gisgis'];

describe('hashToStationIndex', () => {
  it('находит станцию по хэшу', () => {
    expect(hashToStationIndex('#mplat', IDS)).toBe(2);
    expect(hashToStationIndex('#amazingcat', IDS)).toBe(0);
  });

  it('принимает хэш и без решётки', () => {
    expect(hashToStationIndex('gisgis', IDS)).toBe(3);
  });

  it('на пустой и неизвестный хэш отвечает null', () => {
    expect(hashToStationIndex('', IDS)).toBeNull();
    expect(hashToStationIndex('#', IDS)).toBeNull();
    expect(hashToStationIndex('#unknown', IDS)).toBeNull();
  });
});

describe('stationIndexToHash', () => {
  it('строит хэш по индексу', () => {
    expect(stationIndexToHash(2, IDS)).toBe('#mplat');
  });

  it('на индекс за границами отвечает пустой строкой', () => {
    expect(stationIndexToHash(9, IDS)).toBe('');
    expect(stationIndexToHash(-1, IDS)).toBe('');
  });
});
EOF
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/career-flight/stationHash.test.ts`
Expected: FAIL — `Failed to resolve import "./stationHash"`.

- [ ] **Step 3: Реализация хэша**

```bash
cat > src/features/career-flight/stationHash.ts <<'EOF'
export function hashToStationIndex(
  hash: string,
  ids: readonly string[],
): number | null {
  const id = hash.replace(/^#/, '');
  if (id === '') return null;
  const index = ids.indexOf(id);
  return index === -1 ? null : index;
}

export function stationIndexToHash(index: number, ids: readonly string[]): string {
  const id = ids[index];
  return id === undefined ? '' : `#${id}`;
}
EOF
```

- [ ] **Step 4: Запустить тест — он должен пройти**

Run: `npx vitest run src/features/career-flight/stationHash.test.ts`
Expected: PASS, 5 тестов.

- [ ] **Step 5: Реализовать станции и синхронизацию**

```bash
cat > src/features/career-flight/StationMarker.tsx <<'EOF'
import { Html } from '@react-three/drei';
import type { Job } from '@/content';
import { stationPosition } from './route';

export function StationMarker({ job, index }: { job: Job; index: number }) {
  const position = stationPosition(index);

  return (
    <group position={position}>
      {/* Примитив-заглушка: на фазе 2 заменяется настоящей геометрией. */}
      <mesh>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#7dd3c0" roughness={0.35} metalness={0.1} />
      </mesh>
      <Html center distanceFactor={18} position={[0, 2.6, 0]}>
        <span className="station-label">{job.company}</span>
      </Html>
    </group>
  );
}
EOF
cat > src/features/career-flight/useStationHash.ts <<'EOF'
import { useEffect } from 'react';
import { jobs } from '@/content';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';
import { activeStationIndex, stationProgress } from './route';
import { hashToStationIndex, stationIndexToHash } from './stationHash';

const IDS = jobs.map((job) => job.id);

/**
 * Двусторонняя связь маршрута и URL. Хэш пишется только при смене станции,
 * а не на каждом изменении прогресса.
 */
export function useStationHash(): void {
  useEffect(() => {
    const fromHash = hashToStationIndex(window.location.hash, IDS);
    if (fromHash !== null) {
      setProgress(stationProgress(fromHash, IDS.length));
    }

    let lastIndex = activeStationIndex(progressStore.getState().progress, IDS.length);

    const unsubscribe = progressStore.subscribe((state) => {
      const index = activeStationIndex(state.progress, IDS.length);
      if (index === lastIndex) return;
      lastIndex = index;
      const hash = stationIndexToHash(index, IDS);
      if (hash !== '' && hash !== window.location.hash) {
        window.history.replaceState(null, '', hash);
      }
    });

    return unsubscribe;
  }, []);
}
EOF
python3 - <<'PY'
import pathlib
p = pathlib.Path('src/features/career-flight/CareerScene.tsx')
s = p.read_text()
s = s.replace(
  "import { CameraRig } from './CameraRig';",
  "import { jobs } from '@/content';\nimport { CameraRig } from './CameraRig';\nimport { StationMarker } from './StationMarker';",
)
s = s.replace(
  "      <CameraRig />\n",
  "      <CameraRig />\n      {jobs.map((job, index) => (\n        <StationMarker job={job} index={index} key={job.id} />\n      ))}\n",
)
p.write_text(s)

p = pathlib.Path('src/app/App.tsx')
s = p.read_text()
s = s.replace(
  "import { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';",
  "import { useStationHash } from '@/features/career-flight/useStationHash';\nimport { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';",
)
s = s.replace(
  "  const sceneEnabled = useSceneEnabled();",
  "  const sceneEnabled = useSceneEnabled();\n  useStationHash();",
)
p.write_text(s)
PY
cat >> src/app/styles.css <<'EOF'

.station-label {
  font: 600 14px/1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .04em;
  color: var(--fg);
  white-space: nowrap;
  text-shadow: 0 1px 6px rgba(0, 0, 0, .8);
}
EOF
```

`useStationHash` вызывается в `App` независимо от того, смонтирована ли сцена: deep links должны работать и на окружении без WebGL, где хэш ведёт к якорю секции в HTML-документе (`id` у секций задан в Task 4).

- [ ] **Step 6: Запустить тесты и сборку**

Run: `npx vitest run && npx tsc -b && npm run build`
Expected: всё PASS.

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "feat: станции маршрута и синхронизация активной станции с URL"
```

---

### Task 12: Мост скролла

**Files:**
- Create: `src/features/scroll-bridge/scrollProgress.ts`, `src/features/scroll-bridge/useScrollProgress.ts`
- Modify: `src/app/App.tsx`
- Test: `src/features/scroll-bridge/scrollProgress.test.ts`

**Interfaces:**
- Consumes: `clamp01` из `@/shared/lib/math`; `setProgress` из `./progressStore`.
- Produces:
  - `type ScrollMetrics = { scrollTop: number; scrollHeight: number; viewportHeight: number }`
  - `scrollMetricsToProgress(metrics: ScrollMetrics): number`
  - `useScrollProgress(): void`

- [ ] **Step 1: Установить Lenis**

```bash
cd /home/albert/projects/portfolio && npm install lenis
```

- [ ] **Step 2: Написать падающий тест**

```bash
cat > src/features/scroll-bridge/scrollProgress.test.ts <<'EOF'
import { scrollMetricsToProgress } from './scrollProgress';

describe('scrollMetricsToProgress', () => {
  it('в начале документа даёт 0', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 0, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(0);
  });

  it('в конце документа даёт 1', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 3200, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(1);
  });

  it('на середине даёт 0.5', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 1600, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(0.5);
  });

  it('на нескроллируемом документе даёт 0, а не NaN', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 0, scrollHeight: 600, viewportHeight: 800 }),
    ).toBe(0);
    expect(
      scrollMetricsToProgress({ scrollTop: 0, scrollHeight: 800, viewportHeight: 800 }),
    ).toBe(0);
  });

  it('клампит инерционный перескролл за границы', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: -120, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(0);
    expect(
      scrollMetricsToProgress({ scrollTop: 5000, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(1);
  });
});
EOF
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/scroll-bridge/scrollProgress.test.ts`
Expected: FAIL — `Failed to resolve import "./scrollProgress"`.

- [ ] **Step 4: Реализация**

```bash
cat > src/features/scroll-bridge/scrollProgress.ts <<'EOF'
import { clamp01 } from '@/shared/lib/math';

export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
};

export function scrollMetricsToProgress(metrics: ScrollMetrics): number {
  const scrollable = metrics.scrollHeight - metrics.viewportHeight;
  if (scrollable <= 0) return 0;
  return clamp01(metrics.scrollTop / scrollable);
}
EOF
cat > src/features/scroll-bridge/useScrollProgress.ts <<'EOF'
import { useEffect } from 'react';
import { setProgress } from './progressStore';
import { scrollMetricsToProgress } from './scrollProgress';

function readProgress(scrollTop: number): number {
  const root = document.documentElement;
  return scrollMetricsToProgress({
    scrollTop,
    scrollHeight: root.scrollHeight,
    viewportHeight: window.innerHeight,
  });
}

/**
 * Прогресс маршрута берётся из скролла настоящего документа.
 * На тач-устройствах инерция не перехватывается: подменять нативный скролл
 * на телефоне — значит ломать привычные жесты (см. спеку §7).
 */
export function useScrollProgress(): void {
  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    setProgress(readProgress(window.scrollY));

    if (coarsePointer) {
      const onScroll = () => setProgress(readProgress(window.scrollY));
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }

    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    let cancelled = false;

    void (async () => {
      const { default: Lenis } = await import('lenis');
      if (cancelled) return;
      const instance = new Lenis({ smoothWheel: true });
      instance.on('scroll', ({ scroll }: { scroll: number }) => {
        setProgress(readProgress(scroll));
      });
      const raf = (time: number) => {
        instance.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      lenis = instance;
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);
}
EOF
python3 - <<'PY'
import pathlib
p = pathlib.Path('src/app/App.tsx')
s = p.read_text()
s = s.replace(
  "import { useStationHash } from '@/features/career-flight/useStationHash';",
  "import { useStationHash } from '@/features/career-flight/useStationHash';\nimport { useScrollProgress } from '@/features/scroll-bridge/useScrollProgress';",
)
s = s.replace(
  "  useStationHash();",
  "  useScrollProgress();\n  useStationHash();",
)
p.write_text(s)
PY
```

Порядок вызовов в `App` важен: `useScrollProgress` ставит прогресс по текущему скроллу, затем `useStationHash` может переопределить его, если в URL пришёл хэш станции.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Проверить глазами — это момент, ради которого делалась фаза 1**

```bash
cd /home/albert/projects/portfolio && npm run dev
```

Проверить: скролл ведёт камеру вдоль маршрута; подписи станций держатся у своих объектов; хэш в адресной строке меняется при проходе станций; открытие `#mplat` в новой вкладке ставит камеру к третьей станции; на узком окне (эмуляция тача) скролл остаётся нативным.

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "feat: мост скролла — скролл документа ведёт камеру"
```

---

### Task 13: Smoke-тесты, бюджет бандла и деплой фазы 1

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `scripts/check-bundle-size.mjs`
- Modify: `package.json`, `.github/workflows/deploy.yml`, `.gitignore`

**Interfaces:**
- Consumes: `npm run build`.
- Produces: `npm run e2e`, `npm run check:size`; оба в CI.

- [ ] **Step 1: Установить Playwright**

```bash
cd /home/albert/projects/portfolio
npm install -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Написать бюджетный контроль и убедиться, что он выполняется**

Проверяется не только размер: отдельно утверждается, что `three` не попал в главный чанк. Маркер — `WebGLRenderer`, строка, которая обязана быть только в ленивом чанке.

```bash
cat > scripts/check-bundle-size.mjs <<'EOF'
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 100;
const THREE_MARKER = 'WebGLRenderer';

const html = await readFile('dist/index.html', 'utf8');
const entryMatch = html.match(/<script[^>]+src="[^"]*\/(assets\/[^"]+\.js)"/);
if (entryMatch === null) {
  throw new Error('check:size — не найден входной скрипт в dist/index.html');
}
const entryPath = `dist/${entryMatch[1]}`;
const entryCode = await readFile(entryPath, 'utf8');
const entryKb = gzipSync(entryCode).length / 1024;

const failures = [];
if (entryKb > LIMIT_KB) {
  failures.push(`главный чанк ${entryKb.toFixed(1)} КБ gzip > ${LIMIT_KB} КБ`);
}
if (entryCode.includes(THREE_MARKER)) {
  failures.push(`three попал в главный чанк (${entryPath})`);
}

const assets = await readdir('dist/assets');
const lazyWithThree = [];
for (const file of assets.filter((f) => f.endsWith('.js') && !entryPath.endsWith(f))) {
  const code = await readFile(`dist/assets/${file}`, 'utf8');
  if (code.includes(THREE_MARKER)) lazyWithThree.push(file);
}
if (lazyWithThree.length === 0) {
  failures.push('three не найден ни в одном ленивом чанке — сцена не собралась?');
}

console.log(`главный чанк: ${entryKb.toFixed(1)} КБ gzip (лимит ${LIMIT_KB})`);
console.log(`three в ленивых чанках: ${lazyWithThree.join(', ') || '—'}`);

if (failures.length > 0) {
  console.error(`\ncheck:size провален:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
EOF
cd /home/albert/projects/portfolio
python3 - <<'PY'
import json, pathlib
p = pathlib.Path('package.json')
pkg = json.loads(p.read_text())
pkg['scripts']['check:size'] = 'node scripts/check-bundle-size.mjs'
pkg['scripts']['e2e'] = 'playwright test'
p.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
PY
npm run build && npm run check:size
```

Expected: скрипт печатает размер главного чанка и имя ленивого чанка с `three`, код выхода 0. Если лимит превышен — это стоп-сигнал, разбираться до продолжения.

- [ ] **Step 3: Написать smoke-тесты**

```bash
cd /home/albert/projects/portfolio
mkdir -p e2e
cat > playwright.config.ts <<'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:4173/portfolio/' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/portfolio/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
EOF
cat > e2e/smoke.spec.ts <<'EOF'
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('резюме читается при отключённом JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Аллагулов/);
  await expect(page.getByText('ГИСГИС')).toBeVisible();
  await expect(page.getByText('9 лет 9 месяцев')).toBeVisible();
  await context.close();
});

test('deep link ведёт к секции работы', async ({ page }) => {
  await page.goto('#mplat');
  await expect(page.locator('#mplat')).toBeInViewport();
});

test('горизонтального скролла нет на узком экране', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('при prefers-reduced-motion канвас не монтируется', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('canvas')).toHaveCount(0);
  await context.close();
});

test('нарушений доступности нет', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});
EOF
printf '%s\n' '.playwright-cache' >> .gitignore
npm run e2e
```

Expected: все тесты PASS на обоих проектах. Тест про отсутствие канваса при `reducedMotion` — прямая проверка Global Constraint из спеки.

Если axe сообщит о недостаточном контрасте (вероятный кандидат — `--muted` на тёмном фоне в `.job__meta`), правится палитра в `src/app/styles.css`, а не список игнорируемых правил. Ослаблять проверку нельзя: доступность заявлена в спеке как свойство HTML-проекции.

- [ ] **Step 4: Добавить проверки в CI**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('.github/workflows/deploy.yml')
s = p.read_text()
old = """      - run: npm run build
      - uses: actions/upload-pages-artifact@v3"""
new = """      - run: npm run build
      - run: npm run check:size
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
      - uses: actions/upload-pages-artifact@v3"""
assert s.count(old) == 1
p.write_text(s.replace(old, new))
PY
git add -A
git commit -m "test: smoke-тесты, контроль бюджета бандла и проверки в CI"
```

- [ ] **Step 5: Задеплоить и проверить живой сайт**

```bash
cd /home/albert/projects/portfolio
git push
gh run watch --exit-status
URL=$(gh api "repos/{owner}/{repo}/pages" --jq .html_url)
curl -sS "$URL" | grep -c 'ГИСГИС'
echo "$URL"
```

Expected: workflow зелёный, контент по-прежнему в отданном HTML. Открыть URL в браузере и проскроллить: камера едет, станции подписаны, хэш меняется.

- [ ] **Step 6: Отметить фазу в README**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('README.md')
p.write_text(p.read_text() + """
## Состояние

- Фаза 0 — сайт-резюме, предрендер, деплой: готово.
- Фаза 1 — скролл ведёт камеру по маршруту мимо четырёх станций: готово.
- Дальше по спеке: фаза 2 (среда сцены), фаза 3 (граф навыков),
  фаза 4 (GLSL), фаза 5 (постпроцессинг).
""")
PY
git add README.md
git commit -m "docs: состояние фаз"
git push
```

**Фаза 1 завершена.** Следующий шаг — отдельный план на фазу 2 по спеке §10.
