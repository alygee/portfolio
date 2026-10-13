/**
 * Вектор без `three`: им пользуются чистые функции главного чанка
 * (`entities/route`, `entities/skill`). В ленивом чанке он переводится в
 * `Vector3` одной строкой.
 */
export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}
