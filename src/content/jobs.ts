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
      'chakra',
      'maplibre',
      'mapbox',
      'openlayers',
    ],
  },
] as const satisfies readonly Job[];

export type JobId = (typeof jobs)[number]['id'];
