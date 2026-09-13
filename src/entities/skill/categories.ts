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
