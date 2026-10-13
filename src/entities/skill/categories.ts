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
  'ml-data': 'Python и данные',
  'ml-classic': 'Классический ML',
  'ml-deep': 'Deep Learning',
  llm: 'LLM',
  mlops: 'MLOps и сервинг',
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
  'ml-data',
  'ml-classic',
  'ml-deep',
  'llm',
  'mlops',
];

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
