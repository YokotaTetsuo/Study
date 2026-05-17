import { InfrastructureError } from './infrastructure-error';

/**
 * 版メタデータは存在するが、対応するバイナリが FileStorage に無い場合のエラー。
 * 「版が見つからない（404）」とは別の、ストレージ不整合（運用調査対象 = 5xx）。
 * `DomainError` ではなく `InfrastructureError` を継承し、汎用 400 マッピングに
 * 落ちないようにする。FileStorage ポートが shared-kernel にあるため同居させる。
 *
 * ストレージキーはユーザー向けメッセージに含めず、構造化ログ用に `key` で保持する。
 */
export class StoredFileMissingError extends InfrastructureError {
  readonly key: string;

  constructor(key: string) {
    super('保存ファイルが見つかりません');
    this.key = key;
  }
}
