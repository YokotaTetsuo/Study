import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/sim/rng';
import type { StepEnv } from '../src/sim/thought';
import {
  LINK_RADIUS,
  MAX_THOUGHTS,
  World,
  linkStrength,
} from '../src/sim/world';

const env: StepEnv = { width: 1200, height: 900 };

function newWorld(): World {
  return new World(mulberry32(7));
}

describe('World.spawn', () => {
  it('空入力では何も生まれない', () => {
    const w = newWorld();
    expect(w.spawn('   ', 0, 0)).toBeNull();
    expect(w.thoughts.length).toBe(0);
  });

  it('生成した思考は一覧に追加され、ID は一意', () => {
    const w = newWorld();
    w.spawn('一', 10, 10);
    w.spawn('二', 20, 20);
    expect(w.thoughts.length).toBe(2);
    const ids = new Set(w.thoughts.map((t) => t.id));
    expect(ids.size).toBe(2);
  });

  it('上限を超えても MAX_THOUGHTS を保つ', () => {
    const w = newWorld();
    for (let i = 0; i < MAX_THOUGHTS + 20; i++) w.spawn(`思考${i}`, i, i);
    expect(w.thoughts.length).toBe(MAX_THOUGHTS);
  });
});

describe('World.step', () => {
  it('枯死した思考は取り除かれる', () => {
    const w = newWorld();
    w.spawn('儚', 100, 100);
    expect(w.thoughts.length).toBe(1);
    for (let i = 0; i < 120; i++) w.step(1, env);
    expect(w.thoughts.length).toBe(0);
  });
});

describe('World.waterNearest', () => {
  it('範囲内の最も近い思考を回復し、それを返す', () => {
    const w = newWorld();
    w.spawn('近', 100, 100);
    w.spawn('遠', 800, 800);
    for (let i = 0; i < 40; i++) w.step(1, env);
    const target = w.thoughts.find((t) => t.text === '近');
    expect(target).toBeDefined();
    const weakened = target?.vitality ?? 1;
    const watered = w.waterNearest(target?.x ?? 0, target?.y ?? 0, 50);
    expect(watered).not.toBeNull();
    expect(watered?.text).toBe('近');
    expect((watered?.vitality ?? 0) > weakened).toBe(true);
  });

  it('範囲内に何も無ければ null', () => {
    const w = newWorld();
    w.spawn('孤', 100, 100);
    expect(w.waterNearest(900, 900, 30)).toBeNull();
  });
});

describe('linkStrength', () => {
  function at(id: string, text: string, x: number, y: number) {
    return {
      id,
      text,
      x,
      y,
      vx: 0,
      vy: 0,
      vitality: 1,
      ageSec: 0,
      hue: 0,
      seed: 0,
    };
  }

  it('共有文字が無ければ 0', () => {
    expect(linkStrength(at('a', 'あい', 0, 0), at('b', 'うえ', 10, 10))).toBe(
      0,
    );
  });

  it('引数の順序に依らない（対称）', () => {
    const a = at('a', '光と影', 0, 0);
    const b = at('b', '光の中', 30, 40);
    expect(linkStrength(a, b)).toBeCloseTo(linkStrength(b, a));
  });

  it('同一 ID 同士は連結しない', () => {
    const a = at('a', '同じ', 0, 0);
    expect(linkStrength(a, a)).toBe(0);
  });

  it('遠いほど弱く、LINK_RADIUS 以遠は 0', () => {
    const near = linkStrength(at('a', '海原', 0, 0), at('b', '海色', 10, 0));
    const far = linkStrength(at('a', '海原', 0, 0), at('b', '海色', 150, 0));
    expect(near).toBeGreaterThan(far);
    expect(
      linkStrength(at('a', '海原', 0, 0), at('b', '海色', LINK_RADIUS, 0)),
    ).toBe(0);
  });
});
