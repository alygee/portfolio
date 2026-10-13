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
