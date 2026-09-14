import { shouldEnableScene } from './sceneSupport';

const capable = { prefersReducedMotion: false, hasWebGL: true, gpuTier: 3 };

describe('shouldEnableScene', () => {
  it('разрешает сцену на способном окружении', () => {
    expect(shouldEnableScene(capable)).toBe(true);
  });

  it('запрещает сцену при просьбе уменьшить движение', () => {
    expect(shouldEnableScene({ ...capable, prefersReducedMotion: true })).toBe(false);
  });

  it('запрещает сцену без WebGL', () => {
    expect(shouldEnableScene({ ...capable, hasWebGL: false })).toBe(false);
  });

  it('запрещает сцену только на tier 0 — нерабочий или заблокированный WebGL', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: 0 })).toBe(false);
  });

  it('разрешает сцену начиная с tier 1', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: 1 })).toBe(true);
    expect(shouldEnableScene({ ...capable, gpuTier: 2 })).toBe(true);
  });

  // Регрессия: Intel Alder Lake GT2 под Mesa detect-gpu сопоставляет с Coffee Lake
  // Iris Plus 655 и оценивает в 26 fps, то есть tier 1. Прежний порог tier >= 2
  // отсекал такие машины полностью, хотя сцена из четырёх примитивов идёт на них
  // без труда: шкала detect-gpu описывает тяжёлую эталонную сцену, а не нашу.
  it('разрешает сцену на типичной интегрированной графике, оценённой как tier 1', () => {
    expect(shouldEnableScene({ prefersReducedMotion: false, hasWebGL: true, gpuTier: 1 })).toBe(
      true,
    );
  });

  it('пока класс GPU не выяснен, сцена не монтируется', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: null })).toBe(false);
  });
});
