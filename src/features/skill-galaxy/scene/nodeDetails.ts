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
      linksTitle: 'Applied in',
      links: hubs.map((hub) => ({ id: hub.id, label: hub.label, kind: hub.kind, href: hub.href })),
      bridges: bridges
        .filter((bridge) => bridge.from === id || bridge.to === id)
        .map((bridge) => ({ pair: `${labelOf(bridge.from)} → ${labelOf(bridge.to)}`, why: bridge.why })),
    };
  }

  return {
    title: node.label,
    meta: node.kind === 'job' ? 'Job' : 'ML project',
    linksTitle: 'Skills',
    links: graph.edges
      .filter((edge) => edge.kind === 'applied' && edge.from === id)
      .map((edge) => ({ id: edge.to, label: labelOf(edge.to), kind: 'skill' as const, href: null })),
    bridges: [],
  };
}
