/**
 * Корни пакета three среди путей модулей сборки. Каждый различный корень —
 * отдельный экземпляр библиотеки в бандле. Разделитель пути после `three`
 * обязателен: без него `three-stdlib` (его тянет drei) считался бы экземпляром.
 */
export function collectThreeRoots(moduleIds: Iterable<string>): Set<string> {
  const roots = new Set<string>();
  for (const id of moduleIds) {
    const match = id.match(/^(.*[\\/]node_modules[\\/]three)[\\/]/);
    if (match?.[1]) roots.add(match[1]);
  }
  return roots;
}
