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
