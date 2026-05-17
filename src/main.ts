import { mulberry32 } from './sim/rng';
import { World } from './sim/world';
import { createRenderer } from './render/renderer';

/**
 * DOM・入力・アニメーションループの配線のみ。
 * ルールや状態は sim/ に、見た目は render/ に委ね、ここは橋渡しに徹する。
 */
function main(): void {
  const canvas = document.querySelector('#field');
  const input = document.querySelector('#thought-input');
  const hint = document.querySelector('#hint');
  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(input instanceof HTMLInputElement)
  ) {
    throw new Error('必要な DOM 要素が見つかりません');
  }

  const world = new World(mulberry32((Date.now() & 0xffffffff) >>> 0));
  const renderer = createRenderer(canvas);
  renderer.resize();
  window.addEventListener('resize', () => {
    renderer.resize();
  });

  let hintHidden = false;
  function fadeHint(): void {
    if (hintHidden || !(hint instanceof HTMLElement)) return;
    hintHidden = true;
    hint.classList.add('faded');
  }

  // 日本語 IME 変換確定の Enter では発火させない。
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    const spawned = world.spawn(
      input.value,
      window.innerWidth / 2 + (Math.random() - 0.5) * 80,
      window.innerHeight * 0.72,
    );
    if (spawned !== null) {
      input.value = '';
      fadeHint();
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    world.waterNearest(e.clientX, e.clientY, 90);
  });

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    world.step(dt, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    renderer.draw(world, now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
