/**
 * Текущий месяц в формате YYYY-MM. Единая точка получения «сейчас»:
 * и предрендер, и гидрация считают стаж от одного значения.
 */
export function currentMonthIso(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}
