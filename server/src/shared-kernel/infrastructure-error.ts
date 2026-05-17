/**
 * インフラ起因の障害（ストレージ不整合・接続失敗など）の基底。
 * `DomainError`（クライアント起因 = 4xx 相当）と区別し、
 * controller では 5xx にマッピングする。
 */
export abstract class InfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
