import type { Rng } from './rng';
import type { StepEnv, Thought } from './thought';
import { createThought, isDead, stepThought, water } from './thought';

/**
 * 思考の集合を管理する。描画には触れず、配列の更新だけを担う純粋なモデル。
 */
export const MAX_THOUGHTS = 48;

/** これ以上離れた思考同士は連結しない（px）。 */
export const LINK_RADIUS = 220;

/**
 * 2 つの思考の連結強度 [0, 1]。
 * 共有する文字が多いほど、また近いほど強い。共有文字が無ければ 0。
 * 引数の順序に依らない（対称）。
 */
export function linkStrength(a: Thought, b: Thought): number {
  if (a.id === b.id) return 0;

  const charsA = new Set(a.text);
  let shared = 0;
  const seen = new Set<string>();
  for (const ch of b.text) {
    if (charsA.has(ch) && !seen.has(ch)) {
      seen.add(ch);
      shared++;
    }
  }
  if (shared === 0) return 0;

  const uniqueUnion = new Set([...a.text, ...b.text]).size;
  const overlap = uniqueUnion === 0 ? 0 : shared / uniqueUnion;

  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= LINK_RADIUS) return 0;
  const proximity = 1 - dist / LINK_RADIUS;

  return overlap * proximity;
}

export class World {
  private readonly items: Thought[] = [];
  private nextId = 0;

  constructor(private readonly rng: Rng) {}

  /** 現在の思考一覧（読み取り専用ビュー）。 */
  get thoughts(): readonly Thought[] {
    return this.items;
  }

  /**
   * 言葉から思考を生み出す。空・空白のみは null。
   * 上限に達している場合は最も活力の低い思考を 1 つ追い出してから追加する。
   */
  spawn(text: string, x: number, y: number): Thought | null {
    const thought = createThought(text, {
      id: `t${this.nextId}`,
      x,
      y,
      rng: this.rng,
    });
    if (thought === null) return null;
    this.nextId++;

    if (this.items.length >= MAX_THOUGHTS) {
      let weakestIndex = 0;
      for (let i = 1; i < this.items.length; i++) {
        const item = this.items[i];
        const weakest = this.items[weakestIndex];
        if (item !== undefined && weakest !== undefined) {
          if (item.vitality < weakest.vitality) weakestIndex = i;
        }
      }
      this.items.splice(weakestIndex, 1);
    }

    this.items.push(thought);
    return thought;
  }

  /** 全思考を dt 秒進め、枯死したものを取り除く。 */
  step(dt: number, env: StepEnv): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item !== undefined) this.items[i] = stepThought(item, dt, env);
    }
    this.prune();
  }

  /**
   * (x, y) から radius 以内で最も近い思考に水やりする。
   * 対象が無ければ null。
   */
  waterNearest(x: number, y: number, radius: number): Thought | null {
    let bestIndex = -1;
    let bestDist = radius;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item === undefined) continue;
      const dx = item.x - x;
      const dy = item.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) return null;
    const target = this.items[bestIndex];
    if (target === undefined) return null;
    const watered = water(target);
    this.items[bestIndex] = watered;
    return watered;
  }

  /** 枯死した思考を取り除く。 */
  private prune(): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item !== undefined && isDead(item)) this.items.splice(i, 1);
    }
  }
}
