// Именно `career-flight/routeProgress`, а не `./route`: у этой математики нет
// зависимости на `three`, поэтому мост скролла остаётся в главном чанке.
// Импорт не случайный: прогресс станции должен быть определён ровно один раз,
// иначе позиция камеры и позиция документа снова разъедутся.
import { stationProgress } from '@/features/career-flight/routeProgress';
import { clamp01 } from '@/shared/lib/math';

export type SectionProgressInput = {
  /** Смещения секций работ от начала документа, по порядку сверху. */
  offsets: readonly number[];
  /** Позиция точки обзора в тех же координатах (позиция скролла). */
  viewOffset: number;
  /** Дальше документ не прокручивается: `scrollHeight - innerHeight`. */
  scrollLimit: number;
};

/**
 * Прогресс маршрута по фактическим позициям секций работ.
 *
 * Полная высота документа для этого не годится: шапка, «Навыки» и
 * «Образование» станциями не являются, и прогресс по ним уезжал бы от
 * положения камеры. Здесь же выполняется инвариант «N-я секция в точке обзора
 * ⇒ прогресс равен `stationProgress(N)`», а значит вход по хэшу согласован с
 * прокруткой по построению: браузер ставит секцию к верхней кромке окна, то
 * есть в точку обзора, и первое же событие скролла даёт ровно тот прогресс,
 * который выставил хэш.
 *
 * Позиции секций поджимаются к `scrollLimit`: секция, до которой документ
 * физически не доскролливается (хвоста страницы не хватает), иначе делала бы
 * свой прогресс недостижимым.
 */
export function sectionsToProgress({
  offsets,
  viewOffset,
  scrollLimit,
}: SectionProgressInput): number {
  const count = offsets.length;
  // Одна станция (или ни одной) — прогресса не существует, см. stationProgress.
  if (count < 2) return 0;

  const limit = Number.isFinite(scrollLimit) ? Math.max(0, scrollLimit) : 0;
  const anchors = offsets.map((offset) =>
    Number.isFinite(offset) ? Math.min(Math.max(offset, 0), limit) : 0,
  );
  const view = Number.isFinite(viewOffset) ? viewOffset : 0;

  if (view <= anchors[0]!) return 0;
  if (view >= anchors[count - 1]!) return 1;

  let index = 0;
  for (let i = 0; i < count - 1; i += 1) {
    if (anchors[i]! <= view) index = i;
  }

  const from = anchors[index]!;
  const span = anchors[index + 1]! - from;
  // span === 0 возможно только при поджатых к пределу соседях; тогда точка
  // обзора уже прошла обе секции.
  const local = span > 0 ? (view - from) / span : 1;
  const fromProgress = stationProgress(index, count);
  const toProgress = stationProgress(index + 1, count);

  return clamp01(fromProgress + (toProgress - fromProgress) * local);
}

/**
 * Смещения секций работ в координатах скролла документа. `null` — хотя бы одна
 * секция в документе не найдена: соответствия станциям нет, и считать прогресс
 * не по чему.
 */
export function readSectionOffsets(ids: readonly string[]): number[] | null {
  const scroll = window.scrollY;
  const offsets: number[] = [];

  for (const id of ids) {
    const element = document.getElementById(id);
    if (element === null) return null;
    offsets.push(element.getBoundingClientRect().top + scroll);
  }

  return offsets;
}
