/**
 * アップロード前のクライアント側バリデーション（純粋関数）。
 * サーバ側制約（`application/pdf` のみ / 50 MiB 上限）を先回りで弾き、
 * 即時フィードバックする。サーバ検証の代替ではなく UX 向上目的。
 */

export const ACCEPTED_MIME = 'application/pdf';
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export type FileValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

/** UI 表示・accept・検証で同一の制約を参照するための表示ラベル。 */
export const MAX_FILE_SIZE_LABEL = formatMiB(MAX_FILE_SIZE_BYTES);

export function validatePdfFile(file: File): FileValidation {
  // サーバの早期ガード（document-controller の trim().toLowerCase() 比較）と
  // 揃え、大小文字・前後空白の差異で不要に弾かないよう normalize する。
  const mime = file.type.trim().toLowerCase();
  if (mime !== ACCEPTED_MIME) {
    return {
      ok: false,
      message: 'PDF ファイル（application/pdf）を選択してください。',
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: `ファイルサイズが上限（${formatMiB(
        MAX_FILE_SIZE_BYTES,
      )}）を超えています（選択: ${formatMiB(file.size)}）。`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: '空のファイルはアップロードできません。' };
  }
  return { ok: true };
}
