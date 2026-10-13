import type { SkillId } from './skills';

/** Что переносится из веба в ML и почему (спека зала, З3). */
export type Bridge = { from: SkillId; to: SkillId; why: string };

/** Черновики формулировок (спека зала, §2.6); финальные тексты — за владельцем. */
export const bridges: readonly Bridge[] = [
  {
    from: 'postgres',
    to: 'pandas',
    why: 'Агрегации и джойны над большими таблицами предбиллинга — те же операции, что в pandas.',
  },
  {
    from: 'docker',
    to: 'fastapi',
    why: 'Упаковывал и выкатывал сервисы в контейнерах — модель за API выкатывается так же.',
  },
  {
    from: 'ci',
    to: 'mlflow',
    why: 'Строил пайплайны релизов; воспроизводимость экспериментов — та же дисциплина.',
  },
  {
    from: 'nodejs',
    to: 'vllm',
    why: 'Сервисы под нагрузкой: задержка, очереди, батчинг — ядро сервинга LLM.',
  },
  {
    from: 'typescript',
    to: 'python',
    why: 'Строгая типизация в большом коде переносится в type hints и mypy.',
  },
  {
    from: 'jest',
    to: 'evals',
    why: 'Внедрял тесты, снизившие баги на продакшене на 30%; evals — тесты для моделей.',
  },
];
