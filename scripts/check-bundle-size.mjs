import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 100;
const THREE_MARKER = 'WebGLRenderer';

const html = await readFile('dist/index.html', 'utf8');
const entryMatch = html.match(/<script[^>]+src="[^"]*\/(assets\/[^"]+\.js)"/);
if (entryMatch === null) {
  throw new Error('check:size — не найден входной скрипт в dist/index.html');
}
const entryPath = `dist/${entryMatch[1]}`;
const entryCode = await readFile(entryPath, 'utf8');
const entryKb = gzipSync(entryCode).length / 1024;

const failures = [];
if (entryKb > LIMIT_KB) {
  failures.push(`главный чанк ${entryKb.toFixed(1)} КБ gzip > ${LIMIT_KB} КБ`);
}
if (entryCode.includes(THREE_MARKER)) {
  failures.push(`three попал в главный чанк (${entryPath})`);
}

const assets = await readdir('dist/assets');
const lazyWithThree = [];
for (const file of assets.filter((f) => f.endsWith('.js') && !entryPath.endsWith(f))) {
  const code = await readFile(`dist/assets/${file}`, 'utf8');
  if (code.includes(THREE_MARKER)) lazyWithThree.push(file);
}
if (lazyWithThree.length > 1) {
  failures.push(
    `three найден более чем в одном чанке (${lazyWithThree.join(', ')}) — ` +
      'в дереве зависимостей два экземпляра библиотеки',
  );
}
if (lazyWithThree.length === 0) {
  failures.push('three не найден ни в одном ленивом чанке — сцена не собралась?');
}

console.log(`главный чанк: ${entryKb.toFixed(1)} КБ gzip (лимит ${LIMIT_KB})`);
console.log(`three в ленивых чанках: ${lazyWithThree.join(', ') || '—'}`);

if (failures.length > 0) {
  console.error(`\ncheck:size провален:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
