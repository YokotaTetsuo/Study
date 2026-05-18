import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import type * as PdfCacheModule from './pdf-cache';

// pdfjs-dist の loading task を差し替え、ネットワーク/ワーカー無しで
// キャッシュの振る舞い（メモ化・失敗除去・LRU eviction・pin 保護・
// クリア）を検証する。task.destroy() の呼び出し有無で「破棄されたか」を
// 観察し、内部 Map を覗かず振る舞いベースで確認する。
const h = vi.hoisted(() => {
  const failUrls = new Set<string>();
  // url ごとに最後に生成した task の destroy モックを記録（破棄観察用）。
  const destroyByUrl = new Map<string, Mock>();
  const getDocument = vi.fn((args: { url: string }) => {
    const { url } = args;
    const destroy = vi.fn(() => Promise.resolve());
    destroyByUrl.set(url, destroy);
    const promise = failUrls.has(url)
      ? Promise.reject(new Error(`load failed: ${url}`))
      : Promise.resolve({ url });
    return { promise, destroy };
  });
  return { failUrls, destroyByUrl, getDocument };
});

vi.mock('pdfjs-dist', () => ({
  // 外部 API 名のため命名規約の対象外（PascalCase をそのまま使う）。
  // eslint-disable-next-line @typescript-eslint/naming-convention
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: h.getDocument,
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'worker-stub',
}));

// 失敗 promise の unhandled rejection を避けつつ「失敗時はキャッシュから
// 除去される」までのマイクロタスクを消化するヘルパー。
async function loadSwallowing(
  loadPdf: (u: string) => Promise<unknown>,
  url: string,
): Promise<void> {
  await loadPdf(url).then(
    () => undefined,
    () => undefined,
  );
}

async function freshModule(): Promise<typeof PdfCacheModule> {
  vi.resetModules();
  return import('./pdf-cache');
}

describe('pdf-cache', () => {
  beforeEach(() => {
    h.failUrls.clear();
    h.destroyByUrl.clear();
    h.getDocument.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should memoize by url so a cached load is not re-fetched', async () => {
    const { loadPdf } = await freshModule();

    const first = loadPdf('a');
    const second = loadPdf('a');

    expect(second).toBe(first);
    expect(h.getDocument).toHaveBeenCalledTimes(1);
  });

  it('should remove a failed load from the cache so it can be retried', async () => {
    const { loadPdf } = await freshModule();
    h.failUrls.add('bad');

    await loadSwallowing(loadPdf, 'bad');
    await loadSwallowing(loadPdf, 'bad');

    expect(h.getDocument).toHaveBeenCalledTimes(2);
  });

  it('should evict the oldest unpinned entry when over the limit', async () => {
    const { loadPdf } = await freshModule();

    // 上限 12 を 1 つ超える 13 件を投入（'u0' が最古）。
    for (let i = 0; i < 13; i += 1) {
      await loadSwallowing(loadPdf, `u${String(i)}`);
    }

    // 最古の未 pin エントリの loading task が破棄されている。
    expect(h.destroyByUrl.get('u0')?.mock.calls.length ?? 0).toBeGreaterThan(0);
    // 破棄後に再要求すると再フェッチされる（キャッシュから消えている）。
    h.getDocument.mockClear();
    await loadSwallowing(loadPdf, 'u0');
    expect(h.getDocument).toHaveBeenCalledWith({
      url: 'u0',
      withCredentials: true,
    });
  });

  it('should protect a pinned entry from eviction', async () => {
    const { loadPdf, pinPdf } = await freshModule();

    pinPdf('keep');
    await loadSwallowing(loadPdf, 'keep');
    for (let i = 0; i < 13; i += 1) {
      await loadSwallowing(loadPdf, `v${String(i)}`);
    }

    // pin 済みは最古でも破棄されない。
    expect(h.destroyByUrl.get('keep')?.mock.calls.length ?? 0).toBe(0);
    // 再要求してもキャッシュヒット（再フェッチされない）。
    h.getDocument.mockClear();
    await loadSwallowing(loadPdf, 'keep');
    expect(h.getDocument).not.toHaveBeenCalled();
  });

  it('should shrink the cache when the last pin is released over capacity', async () => {
    const { loadPdf, pinPdf, unpinPdf } = await freshModule();

    // 13 件すべて pin して一時的に上限超過を許容させる。
    for (let i = 0; i < 13; i += 1) {
      pinPdf(`w${String(i)}`);
      await loadSwallowing(loadPdf, `w${String(i)}`);
    }
    // この時点では全 pin 済みのため破棄されていない。
    expect(h.destroyByUrl.get('w0')?.mock.calls.length ?? 0).toBe(0);

    // 最古の pin を解放すると eviction が再走し縮む。
    unpinPdf('w0');

    expect(h.destroyByUrl.get('w0')?.mock.calls.length ?? 0).toBeGreaterThan(0);
  });

  it('should destroy all entries and drop pins on clear', async () => {
    const { loadPdf, pinPdf, clearPdfCache } = await freshModule();

    pinPdf('p');
    await loadSwallowing(loadPdf, 'p');
    await loadSwallowing(loadPdf, 'q');

    clearPdfCache();

    expect(h.destroyByUrl.get('p')?.mock.calls.length ?? 0).toBeGreaterThan(0);
    expect(h.destroyByUrl.get('q')?.mock.calls.length ?? 0).toBeGreaterThan(0);
    // pin もクリアされ、再要求は新規フェッチ（キャッシュ空）。
    h.getDocument.mockClear();
    await loadSwallowing(loadPdf, 'p');
    expect(h.getDocument).toHaveBeenCalledWith({
      url: 'p',
      withCredentials: true,
    });
  });
});
