import type { Plugin } from 'vite';
import type { Palette } from '../src/shared/config/palette';

/** Имена переменных, которые читает src/app/styles.css. */
const CSS_VARS: Record<keyof Palette, string> = {
  background: '--bg',
  foreground: '--fg',
  muted: '--muted',
  accent: '--accent',
};

export function paletteCss(palette: Palette): string {
  const keys = Object.keys(CSS_VARS) as (keyof Palette)[];
  return `:root{${keys.map((key) => `${CSS_VARS[key]}:${palette[key]}`).join(';')}}`;
}

/**
 * Вставляет палитру в index.html статическим `<style>`: переменные доступны
 * до загрузки JS и без него. `transformIndexHtml` Vite вызывает и в
 * `vite build`, и на dev-сервере.
 */
export function paletteStyle(palette: Palette): Plugin {
  return {
    name: 'palette-style',
    transformIndexHtml() {
      return [{ tag: 'style', children: paletteCss(palette), injectTo: 'head-prepend' }];
    },
  };
}
