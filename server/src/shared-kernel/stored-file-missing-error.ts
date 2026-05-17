import { DomainError } from './domain-error';

/**
 * 版メタデータは存在するが、対応するバイナリが FileStorage に無い場合のエラー。
 * 「版が見つからない（404）」とは別に、ストレージ不整合（運用調査対象）として扱う。
 * FileStorage ポートが shared-kernel にあるため、専用エラーもここに置く。
 */
export class StoredFileMissingError extends DomainError {
  constructor(key: string) {
    super(`保存ファイルが見つかりません: ${key}`);
  }
}
