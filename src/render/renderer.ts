import type { Thought } from '../sim/thought';
import { linkStrength, type World } from '../sim/world';

/**
 * canvas2D への描画のみを担う層。状態やルールは持たない。
 * シミュレーション（sim/）の結果を受け取り、見た目に変換するだけ。
 */
export interface Renderer {
  resize(): void;
  draw(world: World, timeSec: number): void;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D コンテキストを取得できませんでした');
  }
  const context = ctx;

  let cssWidth = 0;
  let cssHeight = 0;

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = window.innerWidth;
    cssHeight = window.innerHeight;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBackground(timeSec: number): void {
    // 画面全体がゆっくり「呼吸」する。
    const breath = 0.5 + 0.5 * Math.sin(timeSec * 0.25);
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const radius = Math.hypot(cssWidth, cssHeight) / 2;
    const grad = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(16, 20, 34, ${0.9 + breath * 0.05})`);
    grad.addColorStop(1, 'rgba(4, 5, 10, 1)');
    context.fillStyle = grad;
    context.fillRect(0, 0, cssWidth, cssHeight);
  }

  function drawLinks(thoughts: readonly Thought[]): void {
    for (let i = 0; i < thoughts.length; i++) {
      for (let j = i + 1; j < thoughts.length; j++) {
        const a = thoughts[i];
        const b = thoughts[j];
        if (a === undefined || b === undefined) continue;
        const s = linkStrength(a, b);
        if (s <= 0.02) continue;
        const alpha = s * Math.min(a.vitality, b.vitality) * 0.5;
        context.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 70%, 75%, ${alpha})`;
        context.lineWidth = 0.6 + s;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }
  }

  function drawRoots(t: Thought): void {
    // 活力が落ちるほど根が長く伸び、揺れる。
    const decay = 1 - t.vitality;
    if (decay <= 0.05) return;
    const len = 18 + decay * 70;
    context.strokeStyle = `hsla(${t.hue}, 35%, 55%, ${0.12 + decay * 0.18})`;
    context.lineWidth = 1;
    for (let r = -1; r <= 1; r++) {
      context.beginPath();
      context.moveTo(t.x, t.y);
      const sway = Math.sin(t.ageSec * 1.3 + t.seed + r) * 10 * decay;
      context.quadraticCurveTo(
        t.x + r * 12 + sway,
        t.y + len * 0.6,
        t.x + r * 18 + sway,
        t.y + len,
      );
      context.stroke();
    }
  }

  function drawGlow(t: Thought): void {
    const baseSize = 6 + Math.min(t.text.length, 24) * 0.7;
    const size = baseSize * (0.55 + t.vitality);
    const glow = context.createRadialGradient(
      t.x,
      t.y,
      0,
      t.x,
      t.y,
      size * 3.2,
    );
    const light = 45 + t.vitality * 30;
    glow.addColorStop(0, `hsla(${t.hue}, 85%, ${light}%, ${0.5 * t.vitality})`);
    glow.addColorStop(1, `hsla(${t.hue}, 85%, ${light}%, 0)`);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(t.x, t.y, size * 3.2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `hsla(${t.hue}, 90%, ${70 + t.vitality * 20}%, ${
      0.25 + t.vitality * 0.7
    })`;
    context.beginPath();
    context.arc(t.x, t.y, size * 0.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawSparks(t: Thought): void {
    // 活力が高いほど多くの粒が周回する。
    const count = Math.round(t.vitality * 6);
    for (let k = 0; k < count; k++) {
      const ang =
        t.ageSec * (0.8 + k * 0.12) + t.seed + (k / count) * Math.PI * 2;
      const orbit = 14 + k * 4 + Math.sin(t.ageSec + k) * 3;
      const sx = t.x + Math.cos(ang) * orbit;
      const sy = t.y + Math.sin(ang) * orbit;
      context.fillStyle = `hsla(${t.hue}, 95%, 80%, ${0.5 * t.vitality})`;
      context.beginPath();
      context.arc(sx, sy, 1.6, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawText(t: Thought): void {
    const alpha = 0.12 + t.vitality * 0.78;
    context.font = '14px "Hiragino Sans", "Yu Gothic", system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = `hsla(${t.hue}, 40%, 90%, ${alpha})`;
    context.fillText(t.text, t.x, t.y + 16);
  }

  function draw(world: World, timeSec: number): void {
    drawBackground(timeSec);
    const thoughts = world.thoughts;
    drawLinks(thoughts);
    for (const t of thoughts) {
      drawRoots(t);
      drawGlow(t);
      drawSparks(t);
      drawText(t);
    }
  }

  return { resize, draw };
}
