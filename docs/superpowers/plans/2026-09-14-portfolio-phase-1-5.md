# Портфолио: фаза 1.5 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать технический долг, накопленный в фазах 0-1, и сделать 3D-сцену наблюдаемой автоматическими тестами — до того, как фаза 2 начнёт строить на ней окружение.

**Architecture:** Гейт монтирования сцены упрощается до двух синхронных проверок (WebGL и `prefers-reduced-motion`), внешняя классификация видеокарт выбрасывается. За качеством картинки следит уже имеющийся `PerformanceMonitor` по фактическим кадрам. Появление канваса начинает проверяться в CI через программный рендерер swiftshader. Граница ленивого чанка `three` закрепляется правилом линтера, а не комментарием.

**Tech Stack:** React 19.2.8, TypeScript 7, Vite, @react-three/fiber, three, Playwright (chromium + swiftshader), ESLint 9 (flat config), Vitest.

**Спека:** `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md`

**Почему эта фаза существует:** сцена не появлялась ни на одной машине, где `detect-gpu` оценивал видеокарту ниже tier 2, и ни один из 114 тестов этого не заметил — канвас невозможно было наблюдать нигде, кроме браузера владельца. Фаза закрывает обе половины этой проблемы: убирает источник ложных отказов и даёт тестам возможность увидеть сцену.

## Global Constraints

- Весь пользовательский текст — на русском (англоязычные названия технологий и должностей — норма).
- TDD: тест пишется до реализации; шаг «убедиться, что падает» выполняется по-настоящему.
- FSD облегчённый: слои `app / content / entities / features / shared` в `src/`.
- Главный бандл без `three` ≤ 100 КБ gzip (сейчас 63.9 КБ). `three` — только в ленивом чанке сцены.
- LCP формирует предрендеренная HTML-проекция, не канвас.
- Сайт обязан быть полезным без JavaScript, без WebGL и при `prefers-reduced-motion: reduce`.
- React запинен на 19.2.8; изменение версий React или появление `--legacy-peer-deps` недопустимо — это уже ломало `npm ci`.
- Деплой: GitHub Pages, чистая статика, без обращений к сторонним сервисам в рантайме.
- Каждый коммит заканчивается строкой `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` — именно этой, независимо от модели исполнителя.

**Решения владельца, принятые до планирования:**
- `detect-gpu` удаляется целиком, а не локализуется.
- Замороженный в предрендере стаж не чинится — принято как есть.

---

### Task 1: Удалить detect-gpu и упростить гейт монтирования

Гейт становится синхронным: два условия, оба доступны сразу. Исчезает асинхронность, внешний сетевой запрос к `unpkg.com` и целый класс ложных отказов.

**Files:**
- Modify: `src/shared/lib/sceneSupport.ts`, `src/shared/lib/sceneSupport.test.ts`
- Modify: `src/shared/hooks/useSceneEnabled.ts`, `src/shared/hooks/useSceneEnabled.test.tsx`
- Modify: `package.json` (удалить зависимость), `docs/superpowers/specs/2026-09-13-portfolio-3d-design.md`

**Interfaces:**
- Consumes: ничего нового.
- Produces:
  - `type SceneSupport = { prefersReducedMotion: boolean; hasWebGL: boolean }` — поле `gpuTier` исчезает.
  - `shouldEnableScene(support: SceneSupport): boolean`
  - `detectWebGL(): boolean` — без изменений.
  - `useSceneEnabled(): boolean` — сигнатура прежняя, реализация синхронная.

- [ ] **Step 1: Переписать тесты чистой функции под новый контракт**

```bash
cd /home/albert/projects/portfolio
cat > src/shared/lib/sceneSupport.test.ts <<'EOF'
import { shouldEnableScene } from './sceneSupport';

const capable = { prefersReducedMotion: false, hasWebGL: true };

describe('shouldEnableScene', () => {
  it('разрешает сцену на способном окружении', () => {
    expect(shouldEnableScene(capable)).toBe(true);
  });

  it('запрещает сцену при просьбе уменьшить движение', () => {
    expect(shouldEnableScene({ ...capable, prefersReducedMotion: true })).toBe(false);
  });

  it('запрещает сцену без WebGL', () => {
    expect(shouldEnableScene({ ...capable, hasWebGL: false })).toBe(false);
  });

  // Регрессия: прежний гейт спрашивал у detect-gpu класс видеокарты и требовал
  // tier >= 2. На Intel Alder Lake GT2 под Mesa библиотека выдавала tier 1, и
  // сцена не появлялась на исправной машине. Класс GPU больше не участвует в
  // решении вовсе: рабочий WebGL — достаточное условие.
  it('разрешает сцену на любой машине с рабочим WebGL, без оглядки на класс GPU', () => {
    expect(shouldEnableScene({ prefersReducedMotion: false, hasWebGL: true })).toBe(true);
  });
});
EOF
npx vitest run src/shared/lib/sceneSupport.test.ts 2>&1 | tail -5
```

Expected: FAIL — тип `SceneSupport` ещё требует `gpuTier`, `tsc` и тесты ругаются на отсутствующее поле.

- [ ] **Step 2: Упростить чистую функцию**

```bash
cat > src/shared/lib/sceneSupport.ts <<'EOF'
export type SceneSupport = {
  prefersReducedMotion: boolean;
  hasWebGL: boolean;
};

/**
 * Решение о монтировании 3D-слоя. Оба условия проверяются синхронно.
 *
 * Класс видеокарты сознательно не участвует. Прежде здесь работал detect-gpu с
 * порогом tier >= 2, и он отсекал исправные машины: Intel Alder Lake GT2 под
 * Mesa библиотека сопоставляла с Coffee Lake Iris Plus 655 и оценивала в 26 fps.
 * Её шкала описывает тяжёлую эталонную сцену, а не нашу, плюс она требовала
 * запроса к внешнему CDN в рантайме. За качеством картинки следит
 * PerformanceMonitor в сцене — по фактическим кадрам, а не по названию GPU.
 * Случай «WebGL есть, но сцена падает» закрывает ErrorBoundary вокруг слоя.
 */
export function shouldEnableScene(support: SceneSupport): boolean {
  if (support.prefersReducedMotion) return false;
  return support.hasWebGL;
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}
EOF
npx vitest run src/shared/lib/sceneSupport.test.ts 2>&1 | tail -3
```

Expected: PASS, 4 теста.

- [ ] **Step 3: Переписать тесты хука**

```bash
cat > src/shared/hooks/useSceneEnabled.test.tsx <<'EOF'
import { renderHook } from '@testing-library/react';
import { useSceneEnabled } from './useSceneEnabled';

function mockMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return { matches: reducedMotion, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      throw new Error(`Неожиданный медиа-запрос в тесте: ${query}`);
    }),
  );
}

describe('useSceneEnabled', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
  });

  it('включается на окружении с рабочим WebGL', () => {
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(true);
  });

  it('остаётся выключенным при prefers-reduced-motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным без WebGL', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(false);
  });

  it('не обращается к сети при принятии решения', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderHook(() => useSceneEnabled());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
EOF
npx vitest run src/shared/hooks/useSceneEnabled.test.tsx 2>&1 | tail -5
```

Expected: FAIL — хук ещё импортирует `detect-gpu` и решает асинхронно, поэтому первый тест видит `false`.

- [ ] **Step 4: Сделать хук синхронным**

```bash
cat > src/shared/hooks/useSceneEnabled.ts <<'EOF'
import { useEffect, useState } from 'react';
import { detectWebGL, shouldEnableScene } from '@/shared/lib/sceneSupport';

/**
 * Решает, монтировать ли 3D-слой. Решение синхронное и принимается один раз:
 * оба условия доступны сразу, ждать нечего.
 *
 * Начальное значение `false`, а не результат проверки, потому что на сервере
 * при предрендере нет ни `window`, ни canvas: разметка обязана совпасть с
 * клиентской при гидрации, а сцена появляется первым же эффектом.
 */
export function useSceneEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    setEnabled(shouldEnableScene({ prefersReducedMotion, hasWebGL: detectWebGL() }));
  }, []);

  return enabled;
}
EOF
npx vitest run src/shared/hooks/useSceneEnabled.test.tsx 2>&1 | tail -3
```

Expected: PASS, 4 теста.

- [ ] **Step 5: Удалить зависимость и обновить спеку**

```bash
cd /home/albert/projects/portfolio
npm uninstall detect-gpu
grep -rn "detect-gpu" src/ docs/ scripts/ e2e/ vite.config.ts || echo "ссылок на detect-gpu не осталось"
python3 - <<'PY'
import pathlib
p = pathlib.Path('docs/superpowers/specs/2026-09-13-portfolio-3d-design.md')
s = p.read_text()

old = "- detect-gpu (определение класса GPU для деградации)\n"
assert s.count(old) == 1
s = s.replace(old, "")

old = "WebGL, при `prefers-reduced-motion: reduce` или на GPU tier 0 канвас не"
new = "WebGL или при `prefers-reduced-motion: reduce` канвас не"
assert s.count(old) == 1
s = s.replace(old, new)

start = s.index("- `detect-gpu` сообщает tier 0")
end = s.index("### Мобильные устройства")
s = s[:start] + """Класс видеокарты в решении не участвует. Так было не всегда: прежде здесь
работал `detect-gpu` с порогом tier ≥ 2, и он отсекал исправные машины — Intel
Alder Lake GT2 под Mesa он сопоставлял с Coffee Lake Iris Plus 655 и оценивал в
26 fps. Его шкала описывает собственную тяжёлую эталонную сцену, а не нашу, и
вдобавок требовала запроса к внешнему CDN в рантайме, что противоречит §3.3.
Библиотека удалена в фазе 1.5. За качеством картинки отвечает
`PerformanceMonitor` в сцене — обратная связь по фактическим кадрам надёжнее
классификации по названию GPU, а случай «WebGL есть, но сцена падает» закрывает
`ErrorBoundary` вокруг ленивого слоя.

""" + s[end:]
p.write_text(s)
print('спека обновлена')
PY
```

- [ ] **Step 6: Прогнать всё и закоммитить**

```bash
cd /home/albert/projects/portfolio
npx vitest run 2>&1 | grep -E "Test Files|Tests "
npx tsc --noEmit && echo "типы чисты"
npm run build >/dev/null && npm run check:size
for f in dist/assets/*.js; do printf '%s: %s КБ gzip\n' "$(basename $f)" "$(gzip -c $f | wc -c | awk '{printf "%.1f", $1/1024}')"; done
```

Expected: все тесты зелёные; `check:size` проходит; в списке чанков больше нет `detect-gpu.esm-*.js`; главный чанк не вырос.

```bash
git add -A
git commit -m "$(cat <<'MSG'
refactor: убрать detect-gpu, гейт сцены стал синхронным

Класс видеокарты больше не участвует в решении о монтировании 3D-слоя.
Порог tier >= 2 отсекал исправные машины, шкала detect-gpu описывает чужую
тяжёлую сцену, а рантайм-запрос к unpkg.com противоречил требованию чистой
статики. Качество регулирует PerformanceMonitor по фактическим кадрам.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Сделать сцену наблюдаемой в CI

Самая ценная задача фазы. Программный рендерер swiftshader даёт headless-браузеру рабочий WebGL, после чего появление канваса становится проверяемым фактом, а не обещанием.

**Files:**
- Modify: `playwright.config.ts`
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `shouldEnableScene`, `useSceneEnabled` из Task 1 (гейт без класса GPU — именно он делает сцену достижимой под swiftshader).
- Produces: e2e-проверки, на которые опираются следующие фазы.

- [ ] **Step 1: Включить программный WebGL в браузере тестов**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('playwright.config.ts')
s = p.read_text()
old = """  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],"""
new = """  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
  ],"""
assert s.count(old) == 1
s = s.replace(old, new)

old = "export default defineConfig({"
new = """// Headless-браузер без GPU не даёт WebGL-контекста, поэтому 3D-слой в тестах не
// монтировался вовсе и его появление никто не проверял. swiftshader — программный
// рендерер: кадры считает процессор, но для страницы WebGL полноценный, и канвас
// становится наблюдаемым фактом.
const launchOptions = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};

export default defineConfig({"""
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print('playwright.config.ts обновлён')
PY
```

- [ ] **Step 2: Написать падающие тесты на сцену**

```bash
cat >> e2e/smoke.spec.ts <<'EOF'

test('3D-слой монтируется, и канвас ровно один', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('канвас не перехватывает клики по ссылкам резюме', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  const layer = page.locator('.scene-layer');
  await expect(layer).toHaveCSS('pointer-events', 'none');
});

test('прокрутка до конца доводит хэш до последней работы', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => new URL(page.url()).hash, { timeout: 10_000 }).toBe('#amazingcat');
});
EOF
npm run build >/dev/null && npx playwright test --project=desktop 2>&1 | tail -6
```

Expected: три новых теста падают на текущей сборке — она ещё содержит прежний гейт, если Task 1 не применён; если Task 1 уже в дереве, тесты должны пройти, и это подтверждает, что swiftshader работает. Любой другой исход (например, `Timeout` на `.scene-layer canvas` при применённом Task 1) означает, что флаги браузера не сработали — разбирайся с ними, а не ослабляй тест.

- [ ] **Step 3: Убедиться, что тесты зелёные на обоих проектах**

```bash
cd /home/albert/projects/portfolio
npm run e2e 2>&1 | tail -5
```

Expected: все тесты проходят и на `desktop`, и на `mobile`.

Если на `mobile` канвас не появляется — это находка, а не повод исключить проект из теста: значит на тач-устройствах сцена не монтируется, и надо понять почему.

- [ ] **Step 4: Убедиться, что проверка reduced-motion осталась содержательной**

```bash
cd /home/albert/projects/portfolio
grep -n "reducedMotion" e2e/smoke.spec.ts | head -5
```

Теперь, когда канвас в headless появляется, тест «при `prefers-reduced-motion` канваса нет» перестал быть тривиально зелёным: он впервые различает две причины. Убедись, что он на месте и не закомментирован.

- [ ] **Step 5: Проверить эксперимент на прочность**

Временно поменяй в `src/shared/lib/sceneSupport.ts` возврат `support.hasWebGL` на `false`, пересобери и прогони e2e. Ожидается: три новых теста краснеют, тест про reduced-motion остаётся зелёным. Верни код обратно и убедись, что всё снова зелёное. Результат опиши в отчёте — без этой проверки неизвестно, наблюдает ли тест сцену или просто ждёт таймаут.

- [ ] **Step 6: Добавить в CI и закоммитить**

Установка браузеров в workflow уже есть (`npx playwright install --with-deps chromium`), отдельных шагов не требуется — swiftshader идёт в комплекте с chromium.

```bash
cd /home/albert/projects/portfolio
git add -A
git commit -m "$(cat <<'MSG'
test: сделать 3D-сцену наблюдаемой в CI через swiftshader

Headless-браузер без GPU не давал WebGL, поэтому канвас не монтировался и его
появление не проверял ни один тест — ровно поэтому отказ гейта по классу GPU
дошёл до продакшена незамеченным. Программный рендерер закрывает эту дыру.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Один экземпляр three в дереве зависимостей

`@react-three/drei` тянет `stats-gl` со своим вложенным `three@0.170.0`. Пока материалов нет, это незаметно; в фазе 2 два экземпляра дают классический симптом «`instanceof` не работает» и часы потерянного времени.

**Files:**
- Modify: `vite.config.ts`
- Modify: `scripts/check-bundle-size.mjs`

**Interfaces:**
- Consumes: ничего.
- Produces: `npm run check:size` дополнительно утверждает, что `three` присутствует ровно в одном чанке.

- [ ] **Step 1: Убедиться, что дубликат действительно есть**

```bash
cd /home/albert/projects/portfolio
npm ls three --all 2>&1 | grep -c "three@" 
find node_modules -path "*/node_modules/three/package.json" -not -path "node_modules/three/*" | head
```

Expected: находится вложенная копия `three` (например, внутри `stats-gl`). Если её нет — зафиксируй это в отчёте и всё равно выполни Step 2: `dedupe` защищает от появления дубликата в будущем.

- [ ] **Step 2: Написать падающую проверку в скрипте бюджета**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('scripts/check-bundle-size.mjs')
s = p.read_text()
old = "if (lazyWithThree.length === 0) {"
new = """if (lazyWithThree.length > 1) {
  failures.push(
    `three найден более чем в одном чанке (${lazyWithThree.join(', ')}) — ` +
      'в дереве зависимостей два экземпляра библиотеки',
  );
}
if (lazyWithThree.length === 0) {"""
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print('проверка добавлена')
PY
npm run build >/dev/null && npm run check:size
```

Expected: проверка выполняется. Если сейчас `three` уже ровно в одном чанке — она зелёная, и это нормально: она страхует от регрессии.

- [ ] **Step 3: Включить dedupe**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('vite.config.ts')
s = p.read_text()
old = """  resolve: {
    alias: { '@': resolvePath('./src') },
  },"""
new = """  resolve: {
    alias: { '@': resolvePath('./src') },
    // Один экземпляр three на всё приложение. drei тянет stats-gl со своим
    // вложенным three; два экземпляра ломают instanceof и материалы — это
    // проявится в фазе 2, когда появятся кастомные материалы и инстансинг.
    dedupe: ['three'],
  },"""
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print('dedupe включён')
PY
npm run build >/dev/null && npm run check:size && npx vitest run 2>&1 | grep -E "Tests "
```

Expected: сборка проходит, `check:size` зелёный, юнит-тесты не сломаны.

- [ ] **Step 4: Коммит**

```bash
cd /home/albert/projects/portfolio
git add -A
git commit -m "$(cat <<'MSG'
build: один экземпляр three в сборке

drei тянет stats-gl со своим вложенным three. Два экземпляра ломают instanceof
и материалы — фаза 2 упёрлась бы в это на кастомных материалах. check:size
теперь утверждает, что three присутствует ровно в одном чанке.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: ESLint и машинная граница ленивого чанка

Сейчас правило «`three` только в коде сцены» держится на комментарии и на проверке размера бандла постфактум. Оно уже один раз протекало: `useStationHash` импортировал математику из `route.ts` и утянул `three` в главный чанк — 160 КБ вместо 63. Линтер ловит это в момент написания, а не после сборки.

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (скрипт `lint`), `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: ничего.
- Produces: `npm run lint`, выполняемый в CI до тестов.

- [ ] **Step 1: Установить линтер**

```bash
cd /home/albert/projects/portfolio
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals
```

Установка обязана пройти без `--legacy-peer-deps`. Если упрётся в peer-конфликт — останови работу и сообщи, версии React трогать нельзя.

- [ ] **Step 2: Создать конфигурацию**

```bash
cd /home/albert/projects/portfolio
cat > eslint.config.js <<'EOF'
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Главное правило здесь — запрет импорта `three` вне папки сцены.
 * `three` весит около 230 КБ gzip и обязан оставаться в ленивом чанке. Один
 * импорт в модуле, который тянется из `App`, отменяет всю схему: так уже
 * случалось, когда `useStationHash` взял математику из `route.ts`, и главный
 * чанк вырос с 63 до 160 КБ. Проверка размера бандла ловит это только после
 * сборки, линтер — сразу.
 */
export default tseslint.config(
  { ignores: ['dist', 'dist-ssr', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message:
                'three допустим только в src/features/career-flight/** — он обязан остаться в ленивом чанке сцены. Чистую математику берите из entities/route.',
            },
          ],
          patterns: [
            {
              group: ['three/*'],
              message: 'three допустим только в src/features/career-flight/**.',
            },
          ],
        },
      ],
    },
  },
  {
    // Папка сцены — единственное место, где three разрешён.
    files: ['src/features/career-flight/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/shared/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, vi: 'readonly' } },
  },
);
EOF
python3 - <<'PY'
import json, pathlib
p = pathlib.Path('package.json')
pkg = json.loads(p.read_text())
pkg['scripts']['lint'] = 'eslint .'
p.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
PY
npm run lint 2>&1 | tail -20
```

Ожидается, что линтер найдёт какое-то количество замечаний в существующем коде. Исправь их по существу — не отключай правила ради зелёного вывода. Исключение: если какое-то правило `typescript-eslint` окажется массово неприменимым к этому проекту (например, требует строгой типизации там, где её сознательно нет), выключить его в конфиге допустимо, но с комментарием, почему.

- [ ] **Step 3: Проверить, что запрет импорта работает**

```bash
cd /home/albert/projects/portfolio
cp src/shared/lib/math.ts /tmp/math-backup.ts
printf "import { Vector3 } from 'three';\nexport const probe = new Vector3();\n" >> src/shared/lib/math.ts
npm run lint 2>&1 | grep -A2 "math.ts" | head -5
cp /tmp/math-backup.ts src/shared/lib/math.ts && rm /tmp/math-backup.ts
npm run lint 2>&1 | tail -3
```

Expected: при временном импорте `three` в `shared` линтер выдаёт ошибку с нашим сообщением; после отката — чисто. Если ошибки не было, правило не работает — разберись до коммита.

- [ ] **Step 4: Добавить в CI**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('.github/workflows/deploy.yml')
s = p.read_text()
old = "      - run: npm test\n"
new = "      - run: npm run lint\n      - run: npm test\n"
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print('lint добавлен в CI перед тестами')
PY
grep -n "run:" .github/workflows/deploy.yml
```

- [ ] **Step 5: Прогнать всё и закоммитить**

```bash
cd /home/albert/projects/portfolio
npm run lint && npx vitest run 2>&1 | grep -E "Tests " && npx tsc --noEmit && npm run build >/dev/null && npm run check:size
git add -A
git commit -m "$(cat <<'MSG'
build: ESLint и машинный запрет импорта three вне папки сцены

Граница ленивого чанка держалась на комментарии и проверке размера бандла
постфактум. Она уже протекала: импорт математики из route.ts утянул three в
главный чанк, 63 КБ превратились в 160. Теперь это ошибка линтера.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: Мелкий долг — слой математики, мёртвый API, разнобой в ролях

Три независимые мелкие правки, объединённые в одну задачу: каждая тривиальна и не заслуживает отдельного ревью, но вместе они закрывают три замечания финального ревью.

**Files:**
- Create: `src/entities/route/progress.ts`, `src/entities/route/progress.test.ts`
- Delete: `src/features/career-flight/routeProgress.ts` (и его тест, если существует)
- Modify: `src/features/career-flight/route.ts`, `src/features/career-flight/useStationHash.ts`, `src/features/scroll-bridge/scrollProgress.ts`, `src/features/scroll-bridge/useScrollProgress.ts` — всё, что импортирует математику прогресса
- Modify: `src/features/scroll-bridge/progressStore.ts`, `src/features/scroll-bridge/progressStore.test.ts`
- Modify: `src/content/jobs.ts`

**Interfaces:**
- Consumes: `stationProgress`, `activeStationIndex` — переезжают, сигнатуры не меняются.
- Produces:
  - `stationProgress(index: number, count: number): number` и `activeStationIndex(t: number, count: number): number` из `@/entities/route/progress`.
  - `progressStore` без поля `mode`; `setSceneMode` и тип `SceneMode` удалены.

- [ ] **Step 1: Перенести математику прогресса в слой сущностей**

Математика маршрута нужна и сцене, и мосту скролла, и синхронизации с URL — то есть она общая, а не принадлежит фиче полёта. Её нынешнее место в `features/career-flight` заставляет `scroll-bridge` импортировать из чужой фичи.

```bash
cd /home/albert/projects/portfolio
mkdir -p src/entities/route
git mv src/features/career-flight/routeProgress.ts src/entities/route/progress.ts
ls src/features/career-flight/routeProgress.test.ts 2>/dev/null && git mv src/features/career-flight/routeProgress.test.ts src/entities/route/progress.test.ts
grep -rln "routeProgress" src/ | sort
```

Замени во всех найденных файлах импорт `'./routeProgress'` или `'@/features/career-flight/routeProgress'` на `'@/entities/route/progress'`. В шапке `src/entities/route/progress.ts` поправь комментарий: теперь это общий слой, а не «вынесено из route.ts», и упомяни, что здесь не должно появиться импорта `three` — линтер это и так запретит.

- [ ] **Step 2: Убрать реэкспорт из route.ts**

Реэкспорт делал `./route` каноничным путём импорта, из-за чего даже тесты чистой математики тянули `three`. Теперь у функций один дом.

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('src/features/career-flight/route.ts')
s = p.read_text()
s = re.sub(
    r"// Реэкспорт:.*?export \{ activeStationIndex, stationProgress \};\n",
    "",
    s,
    flags=re.S,
)
p.write_text(s)
print('реэкспорт удалён')
PY
grep -rn "from './route'" src/ | grep -E "stationProgress|activeStationIndex" || echo "прямых импортов математики из ./route не осталось"
npx tsc --noEmit
```

Если `tsc` покажет ошибки — значит какой-то модуль брал функции через `./route`; переключи его на `@/entities/route/progress`.

- [ ] **Step 3: Удалить мёртвый API машины состояний**

`setSceneMode` не вызывается нигде в продакшн-коде — единственный вызов в его собственном тесте, из-за чего покрытие машины состояний выглядит существующим, хотя самой машины нет. Спека (решение Р7) вводит её в фазе 3; тогда она и появится, вместе с первым настоящим потребителем.

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('src/features/scroll-bridge/progressStore.ts')
s = p.read_text()
s = s.replace("export type SceneMode = 'travelling' | 'docked';\n\n", "")
s = s.replace("  mode: SceneMode;\n", "")
s = s.replace("  mode: 'travelling',\n", "")
s = re.sub(r"\nexport function setSceneMode[^}]*\}\n", "\n", s)
p.write_text(s)
print(p.read_text())
PY
```

Из `src/features/scroll-bridge/progressStore.test.ts` удали тест про переключение режима и упоминания `mode` в `beforeEach`/начальном состоянии. Остальные тесты стора не трогай.

В спеку добавь одну строку в §3.1 к решению Р7: реализация машины состояний удалена в фазе 1.5 как мёртвый код и вводится в фазе 3 вместе с залом навыков.

- [ ] **Step 4: Нормализовать написание роли**

В резюме одна и та же должность записана тремя способами, и все три видны на одном экране сайта: «Front-end разработчик», «Frontend разработчик», «Frontend-разработчик». Данные при этом верны — это типографика, а не факты.

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('src/content/jobs.ts')
s = p.read_text()
for old, new in [
    ("role: 'Front-end разработчик'", "role: 'Frontend-разработчик'"),
    ("role: 'Frontend разработчик'", "role: 'Frontend-разработчик'"),
    ("role: 'PHP (fullstack) разработчик'", "role: 'PHP-разработчик (fullstack)'"),
]:
    assert s.count(old) == 1, old
    s = s.replace(old, new)
p.write_text(s)
print('роли нормализованы')
PY
grep -n "role:" src/content/jobs.ts
```

- [ ] **Step 5: Прогнать всё и закоммитить**

```bash
cd /home/albert/projects/portfolio
npm run lint && npx vitest run 2>&1 | grep -E "Test Files|Tests " && npx tsc --noEmit && npm run build >/dev/null && npm run check:size && npm run e2e 2>&1 | tail -3
git add -A
git commit -m "$(cat <<'MSG'
refactor: математика маршрута в entities, минус мёртвый API, единое написание роли

Математика прогресса переехала из features/career-flight в entities/route:
её потребляют три разные фичи, и мост скролла больше не импортирует из чужой.
Реэкспорт из route.ts убран — у функций один дом, и тесты чистой математики
больше не тянут three. setSceneMode удалён как мёртвый код: машина состояний
появится в фазе 3 вместе с первым потребителем.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: Деплой фазы 1.5

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Полная проверка перед пушем**

```bash
cd /home/albert/projects/portfolio
npm run lint && npx tsc --noEmit && npx vitest run 2>&1 | grep -E "Test Files|Tests " && npm run build >/dev/null && npm run check:size && npm run e2e 2>&1 | tail -3
```

Все шаги обязаны быть зелёными. Красный шаг — стоп, разбирайся, не пушь.

- [ ] **Step 2: Отметить фазу в README**

```bash
cd /home/albert/projects/portfolio
python3 - <<'PY'
import pathlib
p = pathlib.Path('README.md')
s = p.read_text()
old = "- Фаза 1 — скролл ведёт камеру по маршруту мимо четырёх станций: готово."
new = """- Фаза 1 — скролл ведёт камеру по маршруту мимо четырёх станций: готово.
- Фаза 1.5 — техдолг: гейт сцены без detect-gpu, наблюдаемость сцены в CI,
  один экземпляр three, ESLint с запретом импорта three вне сцены: готово."""
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print('README обновлён')
PY
git add -A
git commit -m "$(cat <<'MSG'
docs: отметить завершение фазы 1.5

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 3: Задеплоить и проверить живой сайт**

```bash
cd /home/albert/projects/portfolio
git push
gh run watch "$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
URL=$(gh api "repos/{owner}/{repo}/pages" --jq .html_url)
curl -sS "$URL" | grep -c 'ГИСГИС'
curl -sS "$URL" | grep -oE 'Frontend-разработчик' | sort -u
```

Expected: workflow зелёный, контент отдаётся сервером, роль везде записана одинаково.

- [ ] **Step 4: Сообщить владельцу, что проверить руками**

Сцена теперь проверяется в CI, но программным рендерером. Ручная проверка на живом сайте всё ещё нужна и занимает минуту: открыть страницу, убедиться, что сетка на месте и камера едет при прокрутке. Отдельно стоит проверить, что удаление `detect-gpu` не изменило поведение на слабых машинах в худшую сторону — раньше они не получали сцену вовсе, теперь получают с адаптацией разрешения.

---

## Self-review плана

**Покрытие договорённостей.** Все пять пунктов, согласованных с владельцем, имеют задачу: удаление `detect-gpu` — Task 1; наблюдаемость в CI — Task 2; `dedupe` — Task 3; ESLint с запретом импорта — Task 4; мелочи (слой математики, мёртвый API, роли) — Task 5. Решение «стаж не чиним» соблюдено: задачи на него нет.

**Порядок задач обязателен.** Task 2 зависит от Task 1: под swiftshader `detect-gpu` классифицировал бы программный рендерер как слабый и не дал бы сцене смонтироваться, то есть тесты на канвас невозможно было бы написать, пока библиотека на месте. Task 5 идёт после Task 4, чтобы линтер уже работал и подтвердил переезд математики.

**Плейсхолдеров нет.** Каждый шаг содержит исполняемые команды или конкретный код; шаги, где результат зависит от текущего состояния кодовой базы (замечания линтера в Task 4, поиск импортов в Task 5), явно описывают, что делать с любым исходом.

**Согласованность имён.** `stationProgress` и `activeStationIndex` сохраняют сигнатуры при переезде; новый путь `@/entities/route/progress` используется одинаково во всех задачах; `SceneSupport` теряет поле `gpuTier` в Task 1, и ни одна последующая задача на него не ссылается.

**Известный риск.** Флаги swiftshader (Task 2) зависят от версии Chromium в Playwright. Если канвас под ними не появится, задача не отменяется: надо подобрать рабочую комбинацию флагов и зафиксировать её в конфиге. Ослаблять или удалять тесты на канвас нельзя — именно ради них фаза и затевалась.
