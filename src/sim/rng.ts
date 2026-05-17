/**
 * 決定的な擬似乱数生成器（mulberry32）。
 * テストで再現性を持たせるため、乱数は必ずこのポート経由で注入する。
 */
export type Rng = () => number;

/** seed から [0, 1) を返す決定的 RNG を作る。 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
