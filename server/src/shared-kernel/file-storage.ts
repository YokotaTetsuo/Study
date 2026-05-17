/**
 * バイナリオブジェクトの保存/取得ポート（S3 互換などの実装を infra に置く）。
 */
export interface FileStorage {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}
