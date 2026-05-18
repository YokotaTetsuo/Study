/**
 * PostgreSQL の競合系エラー判定（ドメイン非依存の汎用分類）。
 * 直列化失敗 (40001) / デッドロック (40P01) / UNIQUE 違反 (23505)。
 * controller の problem mapper が再試行可能な 409 に変換するために使う。
 */
export function isDbConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return (
    error.code === '40001' || error.code === '40P01' || error.code === '23505'
  );
}
