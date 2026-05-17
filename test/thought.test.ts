import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/sim/rng';
import {
  DECAY_PER_SEC,
  MAX_TEXT_LENGTH,
  WATER_AMOUNT,
  createThought,
  isDead,
  stepThought,
  water,
  type SpawnOptions,
  type StepEnv,
} from '../src/sim/thought';

const env: StepEnv = { width: 1000, height: 800 };

function spawnOpts(): SpawnOptions {
  return { id: 't0', x: 500, y: 400, rng: mulberry32(42) };
}

describe('createThought', () => {
  it('空文字・空白のみは null を返す', () => {
    expect(createThought('', spawnOpts())).toBeNull();
    expect(createThought('   ', spawnOpts())).toBeNull();
    expect(createThought('\n\t ', spawnOpts())).toBeNull();
  });

  it('前後の空白を除去する', () => {
    const t = createThought('  考える  ', spawnOpts());
    expect(t?.text).toBe('考える');
  });

  it('MAX_TEXT_LENGTH を超える入力は切り詰める', () => {
    const long = 'あ'.repeat(MAX_TEXT_LENGTH + 50);
    const t = createThought(long, spawnOpts());
    expect(t?.text.length).toBe(MAX_TEXT_LENGTH);
  });

  it('生まれたては活力 1・経過 0', () => {
    const t = createThought('種', spawnOpts());
    expect(t?.vitality).toBe(1);
    expect(t?.ageSec).toBe(0);
  });

  it('同じ言葉は同じ色になる', () => {
    const a = createThought('光', spawnOpts());
    const b = createThought('光', spawnOpts());
    expect(a?.hue).toBe(b?.hue);
  });
});

describe('stepThought', () => {
  it('dt=0 では活力も位置も変化しない', () => {
    const t = createThought('静', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    expect(stepThought(t, 0, env)).toEqual(t);
  });

  it('活力は時間とともに単調減少する', () => {
    let t = createThought('減', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    let prev = t.vitality;
    for (let i = 0; i < 30; i++) {
      t = stepThought(t, 1, env);
      expect(t.vitality).toBeLessThanOrEqual(prev);
      prev = t.vitality;
    }
  });

  it('放置すると約 1/DECAY 秒で活力 0（枯死）に至る', () => {
    let t = createThought('枯', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    const lifeSec = 1 / DECAY_PER_SEC;
    for (let i = 0; i < Math.ceil(lifeSec) + 2; i++) {
      t = stepThought(t, 1, env);
    }
    expect(t.vitality).toBe(0);
    expect(isDead(t)).toBe(true);
  });

  it('活力は 0 未満にならない', () => {
    let t = createThought('底', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    for (let i = 0; i < 500; i++) t = stepThought(t, 1, env);
    expect(t.vitality).toBe(0);
  });

  it('極小ビューポートでも座標が負にならず画面内に収まる', () => {
    const tiny: StepEnv = { width: 30, height: 20 };
    let t = createThought('小', { id: 't0', x: 15, y: 10, rng: mulberry32(3) });
    expect(t).not.toBeNull();
    if (t === null) return;
    for (let i = 0; i < 200; i++) {
      t = stepThought(t, 0.5, tiny);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(tiny.width);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(tiny.height);
    }
  });

  it('座標は画面内（マージン込み）に保たれる', () => {
    let t = createThought('境', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    for (let i = 0; i < 300; i++) {
      t = stepThought(t, 0.5, env);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(env.width);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(env.height);
    }
  });
});

describe('water', () => {
  it('活力を WATER_AMOUNT 回復し、上限 1 を超えない', () => {
    let t = createThought('渇', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    for (let i = 0; i < 40; i++) t = stepThought(t, 1, env);
    const before = t.vitality;
    const after = water(t).vitality;
    expect(after).toBeCloseTo(Math.min(1, before + WATER_AMOUNT));
    expect(after).toBeLessThanOrEqual(1);
  });

  it('満タンの思考に水やりしても 1 のまま', () => {
    const t = createThought('満', spawnOpts());
    expect(t).not.toBeNull();
    if (t === null) return;
    expect(water(t).vitality).toBe(1);
  });
});
