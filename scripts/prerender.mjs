import { readFile, writeFile } from 'node:fs/promises';
import { injectAppHtml } from '../dist-ssr/injectAppHtml.js';
import { render } from '../dist-ssr/entry-server.js';

const template = await readFile('dist/index.html', 'utf8');
await writeFile('dist/index.html', injectAppHtml(template, render()), 'utf8');
console.log('prerender: dist/index.html содержит разметку резюме');
