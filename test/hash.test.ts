import { describe, expect, it } from 'vitest';
import { hashString, hueFromText } from '../src/sim/hash';

describe('hashString', () => {
  it('同じ入力には常に同じ値を返す（決定的）', () => {
    expect(hashString('考える')).toBe(hashString('考える'));
  });

  it('常に符号なし 32bit 整数を返す', () => {
    for (const s of ['', 'a', '思考の席', '🌱', 'long '.repeat(50)]) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('異なる入力は十分に散らばる', () => {
    const words = ['朝', '昼', '夜', '光', '影', '水', '火', '風', '土', '空'];
    const hues = new Set(words.map(hashString));
    expect(hues.size).toBe(words.length);
  });
});

describe('hueFromText', () => {
  it('色相は決定的で [0, 360) に収まる', () => {
    for (const s of ['', 'a', '思考', '🌊', 'test123']) {
      const hue = hueFromText(s);
      expect(hue).toBe(hueFromText(s));
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});
