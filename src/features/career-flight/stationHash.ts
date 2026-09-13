export function hashToStationIndex(
  hash: string,
  ids: readonly string[],
): number | null {
  const id = hash.replace(/^#/, '');
  if (id === '') return null;
  const index = ids.indexOf(id);
  return index === -1 ? null : index;
}

export function stationIndexToHash(index: number, ids: readonly string[]): string {
  const id = ids[index];
  return id === undefined ? '' : `#${id}`;
}
