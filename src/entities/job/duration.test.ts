import { jobs } from '@/content';
import {
  formatMonths,
  inclusiveMonths,
  jobMonths,
  totalExperienceMonths,
} from './duration';

const NOW = '2026-08';

describe('inclusiveMonths', () => {
  it('считает один месяц, когда начало и конец совпадают', () => {
    expect(inclusiveMonths('2020-03', '2020-03')).toBe(1);
  });

  it('считает месяцы включительно с обоих концов', () => {
    expect(inclusiveMonths('2018-06', '2025-04')).toBe(83);
    expect(inclusiveMonths('2017-11', '2018-07')).toBe(9);
    expect(inclusiveMonths('2016-09', '2017-11')).toBe(15);
  });

  it('работает через границу года', () => {
    expect(inclusiveMonths('2019-12', '2020-01')).toBe(2);
  });
});

describe('jobMonths', () => {
  it('для текущей работы считает до now включительно', () => {
    expect(jobMonths({ start: '2025-08', end: null }, NOW)).toBe(13);
  });

  it('для завершённой работы игнорирует now', () => {
    expect(jobMonths({ start: '2017-11', end: '2018-07' }, NOW)).toBe(9);
  });
});

describe('formatMonths', () => {
  it('pluralizes months', () => {
    expect(formatMonths(1)).toBe('1 month');
    expect(formatMonths(2)).toBe('2 months');
    expect(formatMonths(5)).toBe('5 months');
    expect(formatMonths(9)).toBe('9 months');
    expect(formatMonths(11)).toBe('11 months');
  });

  it('pluralizes years', () => {
    expect(formatMonths(12)).toBe('1 year');
    expect(formatMonths(24)).toBe('2 years');
    expect(formatMonths(60)).toBe('5 years');
  });

  it('соединяет годы и месяцы', () => {
    expect(formatMonths(13)).toBe('1 year 1 month');
    expect(formatMonths(15)).toBe('1 year 3 months');
    expect(formatMonths(83)).toBe('6 years 11 months');
    expect(formatMonths(117)).toBe('9 years 9 months');
  });

  it('нулевой срок отдаёт нулевые месяцы', () => {
    expect(formatMonths(0)).toBe('0 months');
  });
});

describe('totalExperienceMonths', () => {
  it('объединяет перекрывающиеся периоды вместо их суммирования', () => {
    const overlapping = [
      { start: '2020-01', end: '2020-06' },
      { start: '2020-05', end: '2020-08' },
    ];
    expect(totalExperienceMonths(overlapping, NOW)).toBe(8);
  });

  it('складывает непересекающиеся периоды и не заполняет разрывы', () => {
    const gapped = [
      { start: '2020-01', end: '2020-03' },
      { start: '2021-01', end: '2021-02' },
    ];
    expect(totalExperienceMonths(gapped, NOW)).toBe(5);
  });

  it('на реальных данных резюме даёт 9 лет 9 месяцев', () => {
    expect(totalExperienceMonths(jobs, NOW)).toBe(117);
    expect(formatMonths(totalExperienceMonths(jobs, NOW))).toBe('9 years 9 months');
  });

  it('периоды соприкасаются, но не перекрываются', () => {
    const touching = [
      { start: '2020-01', end: '2020-03' },
      { start: '2020-04', end: '2020-06' },
    ];
    expect(totalExperienceMonths(touching, NOW)).toBe(6);
  });

  it('разрыв ровно в один месяц', () => {
    const gapOneMonth = [
      { start: '2020-01', end: '2020-03' },
      { start: '2020-05', end: '2020-06' },
    ];
    expect(totalExperienceMonths(gapOneMonth, NOW)).toBe(5);
  });

  it('пустой список периодов', () => {
    expect(totalExperienceMonths([], NOW)).toBe(0);
  });
});
