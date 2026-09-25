import ReactThreeTestRenderer from '@react-three/test-renderer';
import { displayJobs } from '@/content';
import { CareerScene } from './CareerScene';
import { stationPosition } from './route';

/**
 * Композиция сцены — требование спеки §8 («станции монтируются в количестве,
 * равном числу работ»). Проверяется настоящая сцена, а не её копия:
 * `<Html>` из drei внутри `StationMarker` под test-renderer работает, потому
 * что маркер рендерится внутри сцены, а не отдельным поддеревом — ограничение
 * drei обойдено структурой теста, а не отказом от `<Html>`.
 *
 * `CameraRig` не оставляет следа в графе сцены (он ничего не рендерит и только
 * двигает камеру в `useFrame`), поэтому его присутствие фиксируется подменой
 * модуля.
 */
const cameraRigMounted = vi.hoisted(() => vi.fn());
vi.mock('./CameraRig', () => ({
  CameraRig: () => {
    cameraRigMounted();
    return null;
  },
}));

async function renderScene() {
  const renderer = await ReactThreeTestRenderer.create(<CareerScene />);
  // Станции — группы верхнего уровня сцены; группа, которую создаёт `<Html>`,
  // вложена внутрь станции и сюда не попадает.
  const stations = renderer.scene.children.filter((child) => child.type === 'Group');
  return { renderer, stations };
}

beforeEach(() => {
  cameraRigMounted.mockClear();
});

describe('CareerScene', () => {
  it('монтирует ровно по одной станции на каждую работу', async () => {
    const { stations } = await renderScene();
    expect(stations).toHaveLength(displayJobs.length);
  });

  it('станции идут в порядке отображения работ', async () => {
    const { stations } = await renderScene();
    expect(stations.map((station) => station.instance.name)).toEqual(
      displayJobs.map((job) => job.id),
    );
  });

  it('станция с индексом N стоит в позиции этого индекса на маршруте', async () => {
    const { stations } = await renderScene();
    stations.forEach((station, index) => {
      expect(station.instance.position.distanceTo(stationPosition(index))).toBeLessThan(
        1e-6,
      );
    });
  });

  it('монтирует CameraRig', async () => {
    await renderScene();
    expect(cameraRigMounted).toHaveBeenCalled();
  });
});
