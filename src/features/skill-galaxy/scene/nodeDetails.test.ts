import { describeNode } from './nodeDetails';

describe('describeNode', () => {
  it('навык: домен, категория и статус; где применён — хабы-работы со ссылкой на станцию', () => {
    const details = describeNode('postgres')!;
    expect(details.title).toBe('PostgreSQL');
    expect(details.meta).toBe('Web · Databases · applied');
    expect(details.links).toEqual([
      { id: 'mplat', label: 'Mobile Platform', kind: 'job', href: '#mplat' },
    ]);
    expect(details.bridges).toEqual([
      { pair: 'PostgreSQL → pandas', why: expect.stringContaining('pre-billing') },
    ]);
  });

  it('изучаемый навык: доказательств нет, мост в него есть', () => {
    const details = describeNode('python')!;
    expect(details.meta).toContain('learning');
    expect(details.links).toEqual([]);
    expect(details.bridges.map((bridge) => bridge.pair)).toEqual(['TypeScript → Python']);
  });

  it('хаб-работа перечисляет свои навыки', () => {
    const details = describeNode('mplat')!;
    expect(details.meta).toBe('Job');
    expect(details.links).toContainEqual({ id: 'react', label: 'React', kind: 'skill', href: null });
  });

  it('неизвестный узел — null', () => {
    expect(describeNode('nope')).toBeNull();
  });
});
