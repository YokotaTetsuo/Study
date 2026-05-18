import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
// Vite: ワーカーを URL として解決し GlobalWorkerOptions に設定する。
// eslint-disable-next-line import-x/default -- Vite の ?url は文字列を default export する
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// パース済み PDF を URL でキャッシュし、版切替を即時化（ちらつき防止）。
// 上限超過分は古い「未使用（pin されていない）」ものから破棄する。
// 表示中の PdfViewer が保持する proxy を破棄しないよう pin で保護する。
const MAX_ENTRIES = 12;

/**
 * loading task と解決 promise を対で保持する。task.destroy() は読み込み中
 * なら DL/パースを中断し、解決済みなら生成された document も破棄するため、
 * pending/resolved の双方をこれ 1 つで破棄でき、in-flight 作業も上限で
 * 律速できる（promise のみ保持だと中断不能）。
 */
interface Entry {
  readonly task: PDFDocumentLoadingTask;
  readonly promise: Promise<PDFDocumentProxy>;
}

const cache = new Map<string, Entry>();
const pins = new Map<string, number>();

function destroyEntry(entry: Entry): void {
  void entry.task.destroy().catch(() => {
    /* 破棄失敗は無視（既に破棄済み等） */
  });
}

/** マウント中の利用者が保持する URL を保護（破棄対象外にする）。 */
export function pinPdf(url: string): void {
  pins.set(url, (pins.get(url) ?? 0) + 1);
}

/**
 * pin 解除。0 になったら以後の eviction 対象になる。全 entry が pin 済みで
 * 上限超過を一時許容していた場合、最後の pin 解放を契機に縮められるよう
 * その場で eviction を再走させる（次の loadPdf まで超過し続けないように）。
 */
export function unpinPdf(url: string): void {
  const n = (pins.get(url) ?? 0) - 1;
  if (n <= 0) {
    pins.delete(url);
    evictIfNeeded();
  } else {
    pins.set(url, n);
  }
}

function evictIfNeeded(): void {
  // 古い順に走査し、pin されていないものだけ破棄する。
  // 全て pin 済みなら一時的に上限超過を許容（利用者解放後に縮む）。
  for (const key of [...cache.keys()]) {
    if (cache.size <= MAX_ENTRIES) {
      return;
    }
    if ((pins.get(key) ?? 0) > 0) {
      continue;
    }
    const evicted = cache.get(key);
    cache.delete(key);
    if (evicted !== undefined) {
      destroyEntry(evicted);
    }
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
    return cached.promise;
  }
  const task = pdfjsLib.getDocument({ url, withCredentials: true });
  const entry: Entry = { task, promise: task.promise };
  void entry.promise.catch(() => {
    if (cache.get(url) === entry) {
      cache.delete(url);
    }
  });
  cache.set(url, entry);
  evictIfNeeded();
  return entry.promise;
}

/**
 * キャッシュを全消去する。URL のみをキーにしており認証境界を跨いで
 * 別ユーザーへ流用され得るため、ログイン/ログアウト時に必ず呼ぶ。
 */
export function clearPdfCache(): void {
  for (const entry of cache.values()) {
    destroyEntry(entry);
  }
  cache.clear();
  // 認証境界のリセット。表示中ビューアはアンマウント/再読込されるため
  // pin も含めて全消去する。
  pins.clear();
}

/** 事前読み込み（結果は捨て、キャッシュだけ温める）。 */
export function prefetchPdf(url: string): void {
  void loadPdf(url).catch(() => {
    /* prefetch の失敗は実使用時に表面化させる */
  });
}
