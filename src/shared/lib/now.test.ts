import { currentMonthIso } from './now';

/**
 * `__BUILD_MONTH__` — глобальная константа, которую в реальной сборке
 * подставляет `vite.config.ts` через `define` (только при `command === 'build'`).
 * В vitest `define` не применяется, поэтому тут её подделывает `vi.stubGlobal`
 * — так же, как в проде её значение приходит через `globalThis`, а не через
 * module-локальную переменную.
 */
describe('currentMonthIso', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('возвращает константу сборки, когда она определена', () => {
    vi.stubGlobal('__BUILD_MONTH__', '2026-10');
    // Реальные часы намеренно показывают другой месяц, чтобы тест не мог
    // случайно пройти из-за совпадения с текущей датой.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 2, 15));

    expect(currentMonthIso()).toBe('2026-10');
  });

  it('возвращает реальную дату, когда константа сборки не определена', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 2, 15));

    expect(currentMonthIso()).toBe('2027-03');
  });

  it('явно переданная дата всегда в приоритете над константой сборки', () => {
    vi.stubGlobal('__BUILD_MONTH__', '2026-10');

    expect(currentMonthIso(new Date(2020, 0, 5))).toBe('2020-01');
  });
});
