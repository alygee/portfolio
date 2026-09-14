import { collectThreeRoots } from './threeRoots';

describe('collectThreeRoots', () => {
  it('даёт один корень для модулей одного экземпляра', () => {
    const roots = collectThreeRoots([
      '/app/node_modules/three/build/three.module.js',
      '/app/node_modules/three/examples/jsm/controls/OrbitControls.js',
    ]);
    expect([...roots]).toEqual(['/app/node_modules/three']);
  });

  it('различает вложенную копию как второй экземпляр', () => {
    const roots = collectThreeRoots([
      '/app/node_modules/three/build/three.module.js',
      '/app/node_modules/stats-gl/node_modules/three/build/three.module.js',
    ]);
    expect([...roots].sort()).toEqual([
      '/app/node_modules/stats-gl/node_modules/three',
      '/app/node_modules/three',
    ]);
  });

  it('не считает three-stdlib экземпляром three', () => {
    expect(collectThreeRoots(['/app/node_modules/three-stdlib/index.js']).size).toBe(0);
  });

  it('понимает разделители путей Windows', () => {
    const roots = collectThreeRoots(['C:\\app\\node_modules\\three\\build\\three.module.js']);
    expect(roots.size).toBe(1);
  });

  it('для графа без three не находит ни одного корня', () => {
    expect(collectThreeRoots(['/app/src/main.tsx', '/app/node_modules/react/index.js']).size).toBe(0);
  });
});
