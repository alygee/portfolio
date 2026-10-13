import { skillStatus } from './status';

const job = { stack: ['react'] as const };
const project = { stack: ['python'] as const };

describe('skillStatus', () => {
  it('навык из stack работы — применён', () => {
    expect(skillStatus({ id: 'react' }, [job], [])).toBe('applied');
  });

  it('навык из stack проекта — применён, даже если намерение не снято', () => {
    // Данные противоречивы (К2 ловит это в контенте), но доказательство
    // сильнее заявления: статус не занижается.
    expect(skillStatus({ id: 'python', intent: 'learning' }, [], [project])).toBe('applied');
  });

  it('без доказательств — намерение', () => {
    expect(skillStatus({ id: 'python', intent: 'learning' }, [job], [])).toBe('learning');
    expect(skillStatus({ id: 'onnx', intent: 'planned' }, [job], [])).toBe('planned');
  });

  it('без доказательств и без намерения — «в плане», а не «применён»', () => {
    // Ошибка в данных не должна завышать опыт.
    expect(skillStatus({ id: 'vue' }, [job], [])).toBe('planned');
  });
});
