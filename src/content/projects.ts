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
