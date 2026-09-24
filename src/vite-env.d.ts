/// <reference types="vite/client" />

/**
 * Месяц сборки в формате YYYY-MM, подставляемый `vite.config.ts` через
 * `define` (только при `npm run build`, см. `src/shared/lib/now.ts`).
 * На dev-сервере и в vitest не определена.
 */
declare const __BUILD_MONTH__: string | undefined;
