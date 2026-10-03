import { paletteCss, paletteStyle } from './paletteStyle';

const sample = {
  background: '#000001',
  foreground: '#000002',
  muted: '#000003',
  accent: '#000004',
};

describe('paletteCss', () => {
  it('объявляет все CSS-переменные палитры под теми именами, что читает styles.css', () => {
    expect(paletteCss(sample)).toBe(
      ':root{--bg:#000001;--fg:#000002;--muted:#000003;--accent:#000004}',
    );
  });
});

describe('paletteStyle', () => {
  it('вставляет переменные тегом <style> в начало head', () => {
    const hook = paletteStyle(sample).transformIndexHtml;
    expect(typeof hook).toBe('function');
    expect((hook as () => unknown)()).toEqual([
      {
        tag: 'style',
        children: ':root{--bg:#000001;--fg:#000002;--muted:#000003;--accent:#000004}',
        injectTo: 'head-prepend',
      },
    ]);
  });
});
