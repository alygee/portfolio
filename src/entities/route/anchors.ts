import { displayJobs } from '@/content';
import { hallCenter, hallDock, routeWaypoints } from './geometry';

/** Секция «Навыки» в документе и последний якорь маршрута. */
export const HALL_ANCHOR_ID = 'skills';

/**
 * Якоря маршрута сверху вниз по документу: секции работ (`displayJobs`), затем
 * «Навыки». Индекс якоря = индекс путевой точки = индекс для хэша. Единственный
 * источник этого списка: мост скролла, синхронизация с хэшем и кривая камеры
 * читают его отсюда, иначе они снова разъедутся.
 */
export const ROUTE_ANCHOR_IDS: readonly string[] = [
  ...displayJobs.map((job) => job.id),
  HALL_ANCHOR_ID,
];

export const ROUTE_WAYPOINTS = routeWaypoints(displayJobs.length);
export const HALL_DOCK = hallDock(displayJobs.length);
export const HALL_CENTER = hallCenter(displayJobs.length);
