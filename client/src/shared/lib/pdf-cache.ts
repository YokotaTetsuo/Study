import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// Vite: ワーカーを URL として解決し GlobalWorkerOptions に設定する。
// eslint-disable-next-line import-x/default -- Vite の ?url は文字列を default export する
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// パース済み PDF を URL でキャッシュし、版切替を即時化（ちらつき防止）。
// 上限超過分は古いものから destroy する素朴な LRU。
const MAX_ENTRIES = 12;
const cache = new Map<string, Promise<PDFDocumentProxy>>();

function evictIfNeeded(): void {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      return;
    }
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    void evicted?.then(
      (d) => d.destroy(),
      () => {
        /* 失敗キャッシュは破棄不要 */
      },
    );
  }
}

/**
 * URL の PDF をパースして返す（メモ化）。キャッシュ済みなら即時解決し、
 * 版切替時の再フェッチ/再パースによるちらつきを防ぐ。失敗時は
 * キャッシュから除去し、再試行で再取得できるようにする。
 * 返す PDFDocumentProxy の寿命はキャッシュが所有する（呼び出し側は
 * destroy しない）。
 */
export function loadPdf(url: string): Promise<PDFDocumentProxy> {
  const cached = cache.get(url);
  if (cached !== undefined) {
    // LRU 更新（最近使用を末尾へ）。
    cache.delete(url);
    cache.set(url, cached);
    return cached;
  }
  const promise = pdfjsLib.getDocument({
    url,
    withCredentials: true,
  }).promise;
  void promise.catch(() => {
    if (cache.get(url) === promise) {
      cache.delete(url);
    }
  });
  cache.set(url, promise);
  evictIfNeeded();
  return promise;
}

/**
 * キャッシュを全消去する。URL のみをキーにしており認証境界を跨いで
 * 別ユーザーへ流用され得るため、ログイン/ログアウト時に必ず呼ぶ。
 */
export function clearPdfCache(): void {
  for (const entry of cache.values()) {
    void entry.then(
      (d) => d.destroy(),
      () => {
        /* 失敗キャッシュは破棄不要 */
      },
    );
  }
  cache.clear();
}

/** 事前読み込み（結果は捨て、キャッシュだけ温める）。 */
export function prefetchPdf(url: string): void {
  void loadPdf(url).catch(() => {
    /* prefetch の失敗は実使用時に表面化させる */
  });
}
