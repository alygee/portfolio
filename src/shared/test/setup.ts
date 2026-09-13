import '@testing-library/jest-dom/vitest';

// jsdom не реализует matchMedia вовсе (в отличие от настоящего браузера).
// Дефолт — «не запрошено уменьшение движения»: тесты, которым нужен другой
// исход, переопределяют global через vi.stubGlobal сами.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}
