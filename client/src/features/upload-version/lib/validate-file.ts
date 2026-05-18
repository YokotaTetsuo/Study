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

function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function validatePdfFile(file: File): FileValidation {
  if (file.type !== ACCEPTED_MIME) {
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
