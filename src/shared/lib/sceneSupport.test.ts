import { detectWebGL, shouldEnableScene } from './sceneSupport';

const capable = { prefersReducedMotion: false, hasWebGL: true };

describe('shouldEnableScene', () => {
  // Регрессия: прежний гейт спрашивал у detect-gpu класс видеокарты и требовал
  // tier >= 2. На Intel Alder Lake GT2 под Mesa библиотека выдавала tier 1, и
  // сцена не появлялась на исправной машине. Класс GPU больше не участвует в
  // решении вовсе: рабочий WebGL — достаточное условие.
  it('разрешает сцену на способном окружении', () => {
    expect(shouldEnableScene(capable)).toBe(true);
  });

  it('запрещает сцену при просьбе уменьшить движение', () => {
    expect(shouldEnableScene({ ...capable, prefersReducedMotion: true })).toBe(false);
  });

  it('запрещает сцену без WebGL', () => {
    expect(shouldEnableScene({ ...capable, hasWebGL: false })).toBe(false);
  });
});

type FakeContext = { getExtension: (name: string) => { loseContext: () => void } | null };

function fakeContext(withLoseContext = true) {
  const loseContext = vi.fn();
  const context: FakeContext = {
    getExtension: vi.fn((name: string) =>
      withLoseContext && name === 'WEBGL_lose_context' ? { loseContext } : null,
    ),
  };
  return { context, loseContext };
}

/** Подменяет canvas, который создаёт detectWebGL, и записывает запрошенные типы контекста. */
function fakeCanvas(
  contexts: Partial<Record<'webgl2' | 'webgl', FakeContext>>,
  { throws = false } = {},
) {
  const requested: string[] = [];
  const canvas = {
    getContext: (type: string) => {
      requested.push(type);
      if (throws) throw new Error('getContext недоступен');
      return contexts[type as 'webgl2' | 'webgl'] ?? null;
    },
  };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);
  return { requested };
}

describe('detectWebGL', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('находит WebGL2 и не спрашивает WebGL1', () => {
    const { requested } = fakeCanvas({ webgl2: fakeContext().context });
    expect(detectWebGL()).toBe(true);
    expect(requested).toEqual(['webgl2']);
  });

  it('при отсутствии WebGL2 довольствуется WebGL1', () => {
    const { requested } = fakeCanvas({ webgl: fakeContext().context });
    expect(detectWebGL()).toBe(true);
    expect(requested).toEqual(['webgl2', 'webgl']);
  });

  it('без обоих контекстов отвечает false', () => {
    fakeCanvas({});
    expect(detectWebGL()).toBe(false);
  });

  it('если getContext бросает, отвечает false, а не роняет приложение', () => {
    fakeCanvas({}, { throws: true });
    expect(detectWebGL()).toBe(false);
  });

  it('освобождает пробный контекст — лимит одновременных контекстов не расходуется', () => {
    const { context, loseContext } = fakeContext();
    fakeCanvas({ webgl2: context });
    detectWebGL();
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('без расширения WEBGL_lose_context всё равно отвечает true', () => {
    fakeCanvas({ webgl2: fakeContext(false).context });
    expect(detectWebGL()).toBe(true);
  });
});
