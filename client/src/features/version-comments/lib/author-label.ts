/**
 * コメント著者の表示ラベルを組み立てる。
 * 表示名が解決できた場合は「表示名（ID）」、解決できない（null）場合は
 * ID のみを返す（server 契約の未解決フォールバックに対応）。
 */
export function authorLabel(
  authorId: string,
  authorDisplayName: string | null,
): string {
  if (authorDisplayName === null) {
    return authorId;
  }
  return `${authorDisplayName}（${authorId}）`;
}
