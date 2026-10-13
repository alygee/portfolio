import { bridges, jobs, projects, skills } from '@/content';
import { CATEGORY_DOMAIN } from './categories';

/**
 * Инварианты контента, которым нужен домен навыка (entities), а не только
 * данные (content). К3 спеки зала: мост ведёт из доказанного веб-навыка в
 * ML-навык — иначе «что я переношу» переносится из ниоткуда.
 */
const byId = new Map(skills.map((skill) => [skill.id as string, skill]));
const evidence = new Set([...jobs, ...projects].flatMap((source) => [...source.stack] as string[]));

describe('К3: мосты', () => {
  it('ведут из применённого веб-навыка', () => {
    for (const bridge of bridges) {
      const from = byId.get(bridge.from)!;
      expect(CATEGORY_DOMAIN[from.category], bridge.from).toBe('web');
      expect(evidence.has(bridge.from), bridge.from).toBe(true);
    }
  });

  it('ведут в ML-навык', () => {
    for (const bridge of bridges) {
      expect(CATEGORY_DOMAIN[byId.get(bridge.to)!.category], bridge.to).toBe('ml');
    }
  });

  it('уникальны и обоснованы', () => {
    const pairs = bridges.map((bridge) => `${bridge.from}→${bridge.to}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    for (const bridge of bridges) expect(bridge.why.trim().length).toBeGreaterThan(10);
  });

  it('стартовых мостов шесть', () => {
    expect(bridges).toHaveLength(6);
  });
});
