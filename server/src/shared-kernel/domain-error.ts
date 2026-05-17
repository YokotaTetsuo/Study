/**
 * ドメイン/アプリケーション層のエラー基底。
 * インフラ起因の例外と区別し、ユースケース層で分岐・HTTP 変換する。
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
