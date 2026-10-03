/**
 * Фича не импортирует другую фичу (облегчённый FSD, спека §3.2): общее
 * опускается в entities или shared. Нарушение уже случалось: career-flight
 * брал progressStore из scroll-bridge.
 *
 * Исходники читаются через import.meta.glob как текст: так тест видит и
 * алиасные (`@/features/…`), и относительные (`../../scroll-bridge/…`) пути.
 */
const sources = import.meta.glob<string>('/src/features/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

function featureOf(path: string): string | null {
  return path.match(/^\/src\/features\/([^/]+)\//)?.[1] ?? null;
}

function importedFeature(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return featureOf(`/src/${specifier.slice(2)}`);
  if (specifier.startsWith('.')) {
    return featureOf(new URL(specifier, `file://${fromFile}`).pathname);
  }
  return null;
}

describe('importedFeature', () => {
  it.each([
    ['/src/features/career-flight/useStationHash.ts', '@/features/scroll-bridge/x', 'scroll-bridge'],
    ['/src/features/career-flight/scene/CameraRig.tsx', '../../scroll-bridge/x', 'scroll-bridge'],
    ['/src/features/career-flight/scene/CameraRig.tsx', './route', 'career-flight'],
    ['/src/features/career-flight/useStationHash.ts', '@/entities/route/progress', null],
    ['/src/features/career-flight/useStationHash.ts', 'react', null],
  ])('%s + %s → %s', (from, specifier, expected) => {
    expect(importedFeature(from, specifier)).toBe(expected);
  });
});

describe('границы фич', () => {
  it('видит исходники фич (проверка не ослепла)', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
  });

  it('ни одна фича не импортирует другую', () => {
    const violations: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      const own = featureOf(file);
      for (const [, specifier] of code.matchAll(IMPORT_SPECIFIER)) {
        const target = importedFeature(file, specifier!);
        if (target !== null && target !== own) violations.push(`${file} → ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
