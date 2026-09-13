import { jobs, skills } from './index';

describe('контент-модель', () => {
  it('не содержит дублей id навыков', () => {
    const ids = skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('не содержит дублей id работ', () => {
    const ids = jobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('все навыки в стеках работ существуют в справочнике', () => {
    const known = new Set(skills.map((s) => s.id));
    const unknown = jobs.flatMap((j) => j.stack.filter((id) => !known.has(id)));
    expect(unknown).toEqual([]);
  });

  it('каждый навык используется хотя бы на одной работе', () => {
    const used = new Set(jobs.flatMap((j) => [...j.stack]));
    const orphans = skills.filter((s) => !used.has(s.id)).map((s) => s.id);
    expect(orphans).toEqual([]);
  });

  it('даты записаны как YYYY-MM, конец не раньше начала', () => {
    for (const job of jobs) {
      expect(job.start).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      if (job.end !== null) {
        expect(job.end).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
        expect(job.end >= job.start).toBe(true);
      }
    }
  });

  it('работы упорядочены хронологически от ранней к поздней', () => {
    const starts = jobs.map((j) => j.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it('ровно одна работа является текущей', () => {
    expect(jobs.filter((j) => j.end === null)).toHaveLength(1);
  });

  it('у каждой работы есть непустое описание и пункты', () => {
    for (const job of jobs) {
      expect(job.summary.length).toBeGreaterThan(0);
      expect(job.bullets.length).toBeGreaterThan(0);
    }
  });
});
