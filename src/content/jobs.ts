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
    city: 'Omsk',
    start: '2016-09',
    end: '2017-11',
    role: 'PHP Developer (full-stack)',
    summary: 'Themes and plugins for e-commerce.',
    bullets: [
      'Built themes and plugins for e-commerce (WordPress, Magento).',
      'Optimized SQL queries, making stores 15–20% faster.',
      'Set up CI/CD and Docker to automate releases.',
    ],
    stack: ['php', 'javascript', 'wordpress', 'magento', 'mysql', 'docker', 'ci'],
    metrics: [{ label: 'Store speed', value: '+15–20%' }],
  },
  {
    id: 'polykod',
    company: 'Polykod',
    url: 'https://polykod.ru/polygon/',
    city: 'Kazan',
    start: '2017-11',
    end: '2018-07',
    role: 'Frontend Developer',
    summary: 'UI for a geological information system.',
    bullets: [
      'Developed the UI of a geological information system in ExtJS.',
      'Built a Storybook component library, cutting module development time by 25%.',
      'Learned Vue and introduced it into several projects.',
    ],
    stack: ['javascript', 'extjs', 'vue', 'storybook'],
    metrics: [{ label: 'Module development time', value: '−25%' }],
  },
  {
    id: 'mplat',
    company: 'Mobile Platform',
    url: 'https://mplat.io/',
    city: 'Kazan',
    start: '2018-06',
    end: '2025-04',
    role: 'Frontend Developer',
    summary:
      'High-load telecom platform and internal pre-billing interfaces.',
    bullets: [
      'Built a low-code system for integrating many data sources.',
      'Reduced production bugs by about 30% by introducing Jest and Cypress.',
      'Sped up app loading by about 40% by optimizing Core Web Vitals.',
      'Created a UI component library and internal documentation.',
      'Led the frontend team: planning, code review, engineer growth.',
      'Took part in the migration from AngularJS to Angular 16 and React 18.',
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
      { label: 'Production bugs', value: '−30%' },
      { label: 'Load speed', value: '+40%' },
    ],
  },
  {
    id: 'gisgis',
    company: 'GISGIS',
    city: 'Kazan',
    start: '2025-08',
    end: null,
    role: 'Frontend Developer',
    summary: 'Enterprise high-load GIS system.',
    bullets: [
      'Developing a React and TypeScript SPA for an enterprise GIS product.',
      'Introduced Feature-Sliced Design, making the codebase easier to scale.',
      'Building data-heavy interfaces: tables, filtering, sorting, inline CRUD.',
      'Integrated mapping solutions based on MapLibre, Mapbox and OpenLayers.',
      'Optimized UI loading and responsiveness.',
      'Developing a UI kit based on Chakra UI.',
    ],
    stack: [
      'react',
      'typescript',
      'vite',
      'chakra',
      'maplibre',
      'mapbox',
      'openlayers',
    ],
  },
] as const satisfies readonly Job[];

export type JobId = (typeof jobs)[number]['id'];

/**
 * Работы в порядке отображения — новейшая первой. Это **единственный**
 * источник порядка для всех трёх проекций контента: HTML-документа, станций
 * сцены и синхронизации с хэшем URL. Инвариант: станция с индексом N — это N-я
 * секция работы в документе сверху, поэтому разворачивать порядок где-либо ещё
 * нельзя (закреплено тестом `src/app/displayOrder.test.tsx`).
 *
 * Хронологический `jobs` остаётся для расчётов, которым порядок безразличен
 * (суммарный стаж) и для проверок самого контента.
 */
export const displayJobs: readonly Job[] = [...jobs].reverse();
