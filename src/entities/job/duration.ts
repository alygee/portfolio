export type Period = { start: string; end: string | null };

/** Абсолютный номер месяца, чтобы арифметика не зависела от таймзон и Date. */
function monthIndex(iso: string): number {
  const [year, month] = iso.split('-');
  return Number(year) * 12 + (Number(month) - 1);
}

/** Месяцы между двумя датами, включая оба крайних месяца. */
export function inclusiveMonths(start: string, end: string): number {
  return monthIndex(end) - monthIndex(start) + 1;
}

export function jobMonths(period: Period, now: string): number {
  return inclusiveMonths(period.start, period.end ?? now);
}

function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = n % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function formatMonths(total: number): string {
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${plural(years, ['год', 'года', 'лет'])}`);
  if (months > 0 || years === 0) {
    parts.push(`${months} ${plural(months, ['месяц', 'месяца', 'месяцев'])}`);
  }
  return parts.join(' ');
}

/**
 * Суммарный стаж. Перекрывающиеся периоды объединяются: два места работы
 * в одном месяце — это один месяц стажа, а не два.
 */
export function totalExperienceMonths(periods: readonly Period[], now: string): number {
  const ranges = periods
    .map((p) => [monthIndex(p.start), monthIndex(p.end ?? now)] as const)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let cursor: number | null = null;
  let cursorEnd = 0;

  for (const [start, end] of ranges) {
    if (cursor === null) {
      cursor = start;
      cursorEnd = end;
      continue;
    }
    if (start <= cursorEnd + 1) {
      cursorEnd = Math.max(cursorEnd, end);
    } else {
      total += cursorEnd - cursor + 1;
      cursor = start;
      cursorEnd = end;
    }
  }
  if (cursor !== null) total += cursorEnd - cursor + 1;
  return total;
}
