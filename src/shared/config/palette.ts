export type Palette = Record<'background' | 'foreground' | 'muted' | 'accent', string>;

/**
 * Единственный источник цветов, общих для документа и 3D-сцены. CSS-переменные
 * `:root` (`--bg`, `--fg`, …) не объявлены в styles.css — их вставляет в
 * index.html плагин `tooling/paletteStyle.ts` при сборке и на dev-сервере.
 * Сцена импортирует палитру напрямую. Так фон документа и фон/туман сцены не
 * могут разъехаться: их задаёт одна строка.
 */
export const palette = {
  background: '#0d0f14',
  foreground: '#e8e6e1',
  muted: '#8d8a84',
  accent: '#7dd3c0',
} satisfies Palette;
