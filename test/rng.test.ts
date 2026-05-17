import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/sim/rng';

describe('mulberry32', () => {
  it('同じ seed なら同じ列を返す（決定的）', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('異なる seed は異なる列を生む', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('常に [0, 1) を返す', () => {
    const rng = mulberry32(98765);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('既知 seed の先頭値スナップショット（移植時の退行検知）', () => {
    const rng = mulberry32(42);
    const first3 = [rng(), rng(), rng()];
    expect(first3).toMatchInlineSnapshot(`
      [
        0.6011037519201636,
        0.44829055899754167,
        0.8524657934904099,
      ]
    `);
  });

  it('十分に一様（粗い分布チェック）', () => {
    const rng = mulberry32(7);
    const buckets = new Array<number>(10).fill(0);
    const n = 100000;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * 10);
      const bucket = buckets[idx];
      if (bucket !== undefined) buckets[idx] = bucket + 1;
    }
    for (const count of buckets) {
      // 期待値 n/10 ±20% に収まること
      expect(count).toBeGreaterThan(n / 10 / 1.2);
      expect(count).toBeLessThan((n / 10) * 1.2);
    }
  });
});
