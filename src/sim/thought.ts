import type { Rng } from './rng';
import { hueFromText } from './hash';

/**
 * 「思考」= 画面を漂う一つの生き物。
 * 副作用を持たない純粋なデータと関数で表現し、描画層から完全に独立させる。
 */
export interface Thought {
  readonly id: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** 活力 0..1。0 で枯死。 */
  readonly vitality: number;
  /** 生まれてからの経過秒。 */
  readonly ageSec: number;
  /** 色相 0..360。 */
  readonly hue: number;
  /** ゆらぎ位相の種。 */
  readonly seed: number;
}

export interface SpawnOptions {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly rng: Rng;
}

export interface StepEnv {
  readonly width: number;
  readonly height: number;
}

/** 入力欄に何も無い／空白だけの場合は思考を生まない。 */
export const MAX_TEXT_LENGTH = 80;
/** 放置すると約 90 秒で活力 0（枯死）に至る。 */
export const DECAY_PER_SEC = 1 / 90;
/** 一度の水やりで回復する活力量。 */
export const WATER_AMOUNT = 0.5;

const SWAY_FREQ = 0.6;
const SWAY_ACCEL = 6;
const DRAG = 0.92;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * 入力文字列から思考を生成する。空・空白のみは null。
 * 長すぎる場合は MAX_TEXT_LENGTH で切り詰める。色は言葉から決定的に決まる。
 */
export function createThought(
  rawText: string,
  opts: SpawnOptions,
): Thought | null {
  const trimmed = rawText.trim();
  if (trimmed.length === 0) return null;
  const text =
    trimmed.length > MAX_TEXT_LENGTH
      ? trimmed.slice(0, MAX_TEXT_LENGTH)
      : trimmed;
  return {
    id: opts.id,
    text,
    x: opts.x,
    y: opts.y,
    vx: (opts.rng() - 0.5) * 24,
    vy: -8 - opts.rng() * 12,
    vitality: 1,
    ageSec: 0,
    hue: hueFromText(text),
    seed: opts.rng() * Math.PI * 2,
  };
}

/**
 * dt 秒だけ思考を進める純粋関数。
 * 活力は時間とともに単調減少。活力が高いほど浮き、低いほど沈む。
 * dt=0 のときは何も変化させない。
 */
export function stepThought(t: Thought, dt: number, env: StepEnv): Thought {
  if (dt <= 0) return t;

  const vitality = clamp(t.vitality - DECAY_PER_SEC * dt, 0, 1);
  const ageSec = t.ageSec + dt;

  // 活力 0.5 を境に浮力／重力が反転する。
  const buoyancy = (0.5 - vitality) * 30;
  const sway = Math.sin(ageSec * SWAY_FREQ + t.seed) * SWAY_ACCEL;

  let vx = (t.vx + sway * dt) * DRAG;
  let vy = (t.vy + buoyancy * dt) * DRAG;

  let x = t.x + vx * dt;
  let y = t.y + vy * dt;

  // 画面端では速度を反転させ、内側へ戻す。
  // 極小ビューポートでも境界が反転しないよう、margin を環境サイズで上限制限する。
  const marginX = Math.min(40, env.width / 2);
  const marginY = Math.min(40, env.height / 2);
  if (x < marginX) {
    x = marginX;
    vx = Math.abs(vx);
  } else if (x > env.width - marginX) {
    x = env.width - marginX;
    vx = -Math.abs(vx);
  }
  if (y < marginY) {
    y = marginY;
    vy = Math.abs(vy);
  } else if (y > env.height - marginY) {
    y = env.height - marginY;
    vy = -Math.abs(vy);
  }

  return { ...t, x, y, vx, vy, vitality, ageSec };
}

/** 水やり。活力を WATER_AMOUNT だけ回復（上限 1）。 */
export function water(t: Thought): Thought {
  return { ...t, vitality: clamp(t.vitality + WATER_AMOUNT, 0, 1) };
}

/** 枯死（活力 0）しているか。 */
export function isDead(t: Thought): boolean {
  return t.vitality <= 0;
}
