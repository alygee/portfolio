import { shouldEnableScene } from './sceneSupport';

const capable = { prefersReducedMotion: false, hasWebGL: true };

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

  // Регрессия: прежний гейт спрашивал у detect-gpu класс видеокарты и требовал
  // tier >= 2. На Intel Alder Lake GT2 под Mesa библиотека выдавала tier 1, и
  // сцена не появлялась на исправной машине. Класс GPU больше не участвует в
  // решении вовсе: рабочий WebGL — достаточное условие.
  it('разрешает сцену на любой машине с рабочим WebGL, без оглядки на класс GPU', () => {
    expect(shouldEnableScene({ prefersReducedMotion: false, hasWebGL: true })).toBe(true);
  });
});
