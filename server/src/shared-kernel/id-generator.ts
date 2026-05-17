/**
 * 一意 ID（ULID 想定）を生成するポート。実装は infrastructure。
 */
export interface IdGenerator {
  generate(): string;
}
