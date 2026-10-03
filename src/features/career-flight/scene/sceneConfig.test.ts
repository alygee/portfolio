import { CAMERA, DEFAULT_SCENE_CONFIG, sceneConfigStore } from './sceneConfig';
import { cameraWaypoint } from './route';

describe('конфигурация среды', () => {
  it('туман полностью скрывает геометрию раньше дальней плоскости камеры', () => {
    // Иначе на горизонте видно, как геометрия обрывается о плоскость far.
    const { near, far } = DEFAULT_SCENE_CONFIG.fog;
    expect(near).toBeLessThan(far);
    expect(far).toBeLessThan(CAMERA.far);
  });

  it('следующая станция видна сквозь туман', () => {
    const gap = cameraWaypoint(0).distanceTo(cameraWaypoint(1));
    expect(DEFAULT_SCENE_CONFIG.fog.far).toBeGreaterThan(gap * 1.5);
  });

  it('стор стартует с дефолтов', () => {
    expect(sceneConfigStore.getState()).toEqual(DEFAULT_SCENE_CONFIG);
  });
});
