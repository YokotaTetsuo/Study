/**
 * 文書が属するプロジェクトのメンバーシップ判定ポート（document 固有）。
 * project ドメインに依存せず、認可チェックに用いる。実装は adapters/gateways。
 */
export interface ProjectAccess {
  isMember(projectId: string, userId: string): Promise<boolean>;
}
