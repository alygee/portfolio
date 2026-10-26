import type { Skill } from '@/content';

export type SkillStatus = 'applied' | 'learning' | 'planned';

export const STATUS_LABELS: Record<SkillStatus, string> = {
  applied: 'applied',
  learning: 'learning',
  planned: 'planned',
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
