/**
 * DB への到達性を確認するポート（health コンテキスト固有）。
 * 実装は adapters/gateways 層に置く。
 */
export interface DbConnectivityPort {
  isReachable(): Promise<boolean>;
}
