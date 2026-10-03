import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { Color, Fog, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Scene } from 'three';
import { palette } from '@/shared/config/palette';
import { displayJobs } from '@/content';
import { CareerScene } from './CareerScene';
import { stationPosition } from './route';
import { DEFAULT_SCENE_CONFIG, sceneConfigStore } from './sceneConfig';

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
  sceneConfigStore.setState(DEFAULT_SCENE_CONFIG, true);
});

describe('CareerScene', () => {
  it('окружение — один draw call: рельеф инстансирован, отдельные меши только у станций', async () => {
    const { renderer } = await renderScene();
    let instanced = 0;
    let meshes = 0;
    renderer.scene.instance.traverse((object: Object3D) => {
      if ((object as InstancedMesh).isInstancedMesh) instanced += 1;
      else if ((object as Mesh).isMesh) meshes += 1;
    });
    expect(instanced).toBe(1);
    expect(meshes).toBe(displayJobs.length);
  });

  it('туман читается из конфигурации и обновляется при её изменении', async () => {
    const { renderer } = await renderScene();
    const scene = renderer.scene.instance as Scene;
    expect((scene.fog as Fog).far).toBe(DEFAULT_SCENE_CONFIG.fog.far);
    await ReactThreeTestRenderer.act(async () => {
      sceneConfigStore.setState({ fog: { near: 5, far: 55 } });
    });
    expect((scene.fog as Fog).far).toBe(55);
  });

  it('станции светятся акцентом палитры с интенсивностью из конфигурации', async () => {
    const { stations } = await renderScene();
    const mesh = stations[0]!.instance.children.find((child) => (child as Mesh).isMesh) as Mesh;
    const material = mesh.material as MeshStandardMaterial;
    expect(material.emissive.getHexString()).toBe(palette.accent.slice(1));
    expect(material.emissiveIntensity).toBe(DEFAULT_SCENE_CONFIG.station.emissiveIntensity);
  });

  it('фон и туман сцены — цвет фона палитры', async () => {
    const { renderer } = await renderScene();
    const scene = renderer.scene.instance as Scene;
    const expected = palette.background.slice(1);
    expect((scene.background as Color).getHexString()).toBe(expected);
    expect((scene.fog as Fog).color.getHexString()).toBe(expected);
  });

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
