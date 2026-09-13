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

  it('запрещает сцену на GPU tier 0 и 1', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: 0 })).toBe(false);
    expect(shouldEnableScene({ ...capable, gpuTier: 1 })).toBe(false);
  });

  it('разрешает сцену начиная с tier 2', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: 2 })).toBe(true);
  });

  it('пока класс GPU не выяснен, сцена не монтируется', () => {
    expect(shouldEnableScene({ ...capable, gpuTier: null })).toBe(false);
  });
});
