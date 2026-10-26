import type { SkillId } from './skills';

/** Что переносится из веба в ML и почему (спека зала, З3). */
export type Bridge = { from: SkillId; to: SkillId; why: string };

/** Черновики формулировок (спека зала, §2.6); финальные тексты — за владельцем. */
export const bridges: readonly Bridge[] = [
  {
    from: 'postgres',
    to: 'pandas',
    why: 'Aggregations and joins over large pre-billing tables are the same operations as in pandas.',
  },
  {
    from: 'docker',
    to: 'fastapi',
    why: 'I packaged and shipped services in containers — a model behind an API ships the same way.',
  },
  {
    from: 'ci',
    to: 'mlflow',
    why: 'I built release pipelines; reproducible experiments take the same discipline.',
  },
  {
    from: 'nodejs',
    to: 'vllm',
    why: 'Services under load — latency, queues, batching — are the core of LLM serving.',
  },
  {
    from: 'typescript',
    to: 'python',
    why: 'Strict typing in a large codebase carries over to type hints and mypy.',
  },
  {
    from: 'jest',
    to: 'evals',
    why: 'I introduced tests that cut production bugs by 30%; evals are tests for models.',
  },
];
