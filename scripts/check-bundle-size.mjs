import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const ENTRY_LIMIT_KB = 100;
// Бюджет на всё ленивое вместе, а не на файл `SceneLayer-*.js`: если Rollup
// однажды вынесет `three` в отдельный vendor-чанк, лимит на один файл
// перестанет что-либо ограничивать. В сумму попадает и `lenis` (~5 КБ).
// На 2026-09 — около 238 КБ. КБ здесь по 1024 байта, Vite в отчёте сборки
// считает по 1000, поэтому у него те же чанки выходят на ~3% больше. Запас
// рассчитан на фазы 2–5; выход за лимит — повод осознанно пересмотреть его,
// а не молча поднять.
const LAZY_LIMIT_KB = 300;
const THREE_MARKER = 'WebGLRenderer';
// `leva` — только для разработки (спека §3.3). Маркеры — строки, которые
// минификация не трогает: DOM-класс и ключ объекта из исходников leva 0.10.
// Проверено сборкой с leva: импорт в чанке сцены давал +66 КБ gzip, и оба
// маркера были в нём.
const LEVA_MARKERS = ['leva__panel__dragged', '__levaInput'];

const gzipKb = (code) => gzipSync(code).length / 1024;

const html = await readFile('dist/index.html', 'utf8');
const entryMatch = html.match(/<script[^>]+src="[^"]*\/(assets\/[^"]+\.js)"/);
if (entryMatch === null) {
  throw new Error('check:size — не найден входной скрипт в dist/index.html');
}
const entryFile = entryMatch[1].slice('assets/'.length);
const entryCode = await readFile(`dist/assets/${entryFile}`, 'utf8');
const entryKb = gzipKb(entryCode);

const failures = [];
if (entryKb > ENTRY_LIMIT_KB) {
  failures.push(`главный чанк ${entryKb.toFixed(1)} КБ gzip > ${ENTRY_LIMIT_KB} КБ`);
}
if (entryCode.includes(THREE_MARKER)) {
  failures.push(`three попал в главный чанк (${entryFile})`);
}

const chunks = [];
for (const file of (await readdir('dist/assets')).filter((f) => f.endsWith('.js'))) {
  const code = await readFile(`dist/assets/${file}`, 'utf8');
  chunks.push({ file, code, kb: file === entryFile ? entryKb : gzipKb(code) });
}
const lazy = chunks.filter((c) => c.file !== entryFile);

const lazyWithThree = lazy.filter((c) => c.code.includes(THREE_MARKER)).map((c) => c.file);
if (lazyWithThree.length === 0) {
  failures.push('three не найден ни в одном ленивом чанке — сцена не собралась?');
}

const lazyKb = lazy.reduce((sum, c) => sum + c.kb, 0);
if (lazyKb > LAZY_LIMIT_KB) {
  failures.push(`ленивые чанки вместе ${lazyKb.toFixed(1)} КБ gzip > ${LAZY_LIMIT_KB} КБ`);
}

const withLeva = chunks
  .filter((c) => LEVA_MARKERS.some((m) => c.code.includes(m)))
  .map((c) => c.file);
if (withLeva.length > 0) {
  failures.push(
    `leva попала в продакшен-сборку (${withLeva.join(', ')}). Подключайте её только ` +
      'динамическим import() под import.meta.env.DEV: статический импорт под тем же ' +
      'условием не вырезается — у leva нет "sideEffects": false.',
  );
}

console.log(`главный чанк: ${entryKb.toFixed(1)} КБ gzip (лимит ${ENTRY_LIMIT_KB})`);
console.log(
  `ленивые чанки: ${lazyKb.toFixed(1)} КБ gzip (лимит ${LAZY_LIMIT_KB}) — ` +
    lazy.map((c) => `${c.file} ${c.kb.toFixed(1)}`).join(', '),
);
console.log(`three в ленивых чанках: ${lazyWithThree.join(', ') || '—'}`);

if (failures.length > 0) {
  console.error(`\ncheck:size провален:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
