import { jobs, projects, skills } from './index';

describe('контент-модель', () => {
  it('не содержит дублей id навыков', () => {
    const ids = skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('не содержит дублей id работ', () => {
    const ids = jobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Тест целостности job.stack → skills не нужен: система типов гарантирует это через SkillId,
  // выведённый из массива skills в as const satisfies readonly Job[]. Опечатку компилятор
  // ловит на этапе типизации, до запуска тестов.

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

  // Доказательства — stack работ и проектов. Статус «применён» выводится из них
  // (entities/skill/status.ts); здесь — согласованность данных с этим правилом.
  const evidence = new Set([...jobs, ...projects].flatMap((source) => [...source.stack]));

  it('К1: у навыка без доказательств указано намерение', () => {
    const orphans = skills
      .filter((skill) => !evidence.has(skill.id) && !('intent' in skill))
      .map((skill) => skill.id);
    expect(orphans).toEqual([]);
  });

  it('К2: у навыка с доказательствами намерения нет — «изучаю» не залеживается', () => {
    const stale = skills
      .filter((skill) => evidence.has(skill.id) && 'intent' in skill)
      .map((skill) => skill.id);
    expect(stale).toEqual([]);
  });

  it('К5: id навыков, работ и проектов не пересекаются — это одно пространство узлов графа', () => {
    const ids = [...skills, ...jobs, ...projects].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('К6: у проекта проверяемая ссылка и дата YYYY-MM', () => {
    for (const project of projects) {
      expect(project.url).toMatch(/^https:\/\/\S+$/);
      expect(project.date).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(project.bullets.length).toBeGreaterThan(0);
    }
  });

  it('стартовый срез: Python изучается, остальные ML-навыки в плане', () => {
    const python = skills.find((skill) => skill.id === 'python');
    expect(python && 'intent' in python ? python.intent : null).toBe('learning');
    const planned = skills.filter((skill) => 'intent' in skill && skill.intent === 'planned');
    expect(planned).toHaveLength(17);
  });
});
