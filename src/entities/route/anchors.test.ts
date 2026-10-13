import { displayJobs } from '@/content';
import { HALL_ANCHOR_ID, ROUTE_ANCHOR_IDS, ROUTE_WAYPOINTS } from './anchors';

describe('якоря маршрута', () => {
  it('секции работ в порядке отображения, затем «Навыки»', () => {
    expect(ROUTE_ANCHOR_IDS).toEqual([...displayJobs.map((job) => job.id), HALL_ANCHOR_ID]);
  });

  it('у каждого якоря своя путевая точка', () => {
    expect(ROUTE_WAYPOINTS).toHaveLength(ROUTE_ANCHOR_IDS.length);
  });
});
