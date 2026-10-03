import { StatsGl } from '@react-three/drei';
import { useEffect, useState } from 'react';
// Статический импорт leva допустим только здесь: этот модуль подгружается
// исключительно динамическим import() под import.meta.env.DEV (SceneLayer.tsx),
// и в продакшен-сборку не попадает вместе с leva. Сборку охраняет check:size
// по маркерам leva.
// oxlint-disable-next-line no-restricted-imports
import { folder, useControls } from 'leva';
import { DEFAULT_SCENE_CONFIG, sceneConfigStore } from '../sceneConfig';

const d = DEFAULT_SCENE_CONFIG;

/** Настройка среды в разработке: панель пишет в sceneConfigStore, сцена подписана на него. */
export default function DevPanel() {
  const v = useControls({
    Туман: folder({
      fogNear: { value: d.fog.near, min: 0, max: 100, step: 1 },
      fogFar: { value: d.fog.far, min: 10, max: 300, step: 1 },
    }),
    Свет: folder({
      sky: d.hemisphere.sky,
      ground: d.hemisphere.ground,
      hemisphereIntensity: { value: d.hemisphere.intensity, min: 0, max: 3, step: 0.05 },
      sunColor: d.sun.color,
      sunIntensity: { value: d.sun.intensity, min: 0, max: 5, step: 0.05 },
    }),
    Рельеф: folder({
      lowColor: d.terrain.lowColor,
      highColor: d.terrain.highColor,
      terrainRoughness: { value: d.terrain.roughness, min: 0, max: 1, step: 0.05 },
    }),
    Станции: folder({
      emissiveIntensity: { value: d.station.emissiveIntensity, min: 0, max: 2, step: 0.05 },
    }),
  });

  useEffect(() => {
    sceneConfigStore.setState({
      fog: { near: v.fogNear, far: v.fogFar },
      hemisphere: { sky: v.sky, ground: v.ground, intensity: v.hemisphereIntensity },
      sun: { ...d.sun, color: v.sunColor, intensity: v.sunIntensity },
      terrain: { lowColor: v.lowColor, highColor: v.highColor, roughness: v.terrainRoughness },
      station: { ...d.station, emissiveIntensity: v.emissiveIntensity },
    });
  }, [
    v.fogNear, v.fogFar, v.sky, v.ground, v.hemisphereIntensity, v.sunColor, v.sunIntensity,
    v.lowColor, v.highColor, v.terrainRoughness, v.emissiveIntensity,
  ]);

  // drei снимает со счётчика собственный `position: fixed` stats-gl, и без
  // контейнера он уезжает в конец документа и прокручивается вместе с ним.
  const [statsParent] = useState(() => {
    const element = document.createElement('div');
    element.style.cssText = 'position:fixed;left:0;top:0;z-index:10000;pointer-events:none';
    return { current: element };
  });
  useEffect(() => {
    const element = statsParent.current;
    document.body.appendChild(element);
    return () => element.remove();
  }, [statsParent]);

  // Счётчик кадров и draw calls — для проверки бюджета §7 глазами.
  return <StatsGl parent={statsParent} />;
}
