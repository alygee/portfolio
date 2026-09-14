import { skills } from '@/content';
import { CATEGORY_LABELS, CATEGORY_ORDER } from './categories';

/**
 * `CATEGORY_LABELS` типизирован как `Record<SkillCategory, string>`, поэтому
 * пропуск категории в нём ловит компилятор. `CATEGORY_ORDER` — обычный массив,
 * и его неполноту не ловит ничто: новая категория навыков молча исчезла бы с
 * сайта, потому что вывод навыков идёт именно по порядку.
 */
describe('CATEGORY_ORDER', () => {
  it('содержит все категории ровно по одному разу', () => {
    // Ключи CATEGORY_LABELS полны по построению — за этим следит тип.
    expect([...CATEGORY_ORDER].sort()).toEqual(Object.keys(CATEGORY_LABELS).sort());
  });

  it('содержит каждую категорию, которая встречается в навыках', () => {
    const used = [...new Set(skills.map((skill) => skill.category))];
    const missing = used.filter((category) => !CATEGORY_ORDER.includes(category));
    expect(missing).toEqual([]);
  });
});
