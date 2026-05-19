import type { DocumentVersion } from '@pdf-review/shared';

/**
 * 版を版番号の降順（最新＝版番号が大きいものが先頭）に並べ替えて返す。
 *
 * 取得側（リポジトリ/ユースケース）は版番号の昇順を保ち、採番ロジックや
 * 「最新版/正式版」判定はその順序に依存する。表示順だけを最新優先に
 * 揃えるため、列挙する UI 直前でこの純粋関数を通す。
 *
 * 入力は変更せず（非破壊）、新しい配列を返す。版番号は文書内で一意の
 * 連番のため安定ソートの考慮は不要だが、念のため `b - a` のみで比較する。
 */
export function sortVersionsDesc(
  versions: readonly DocumentVersion[],
): readonly DocumentVersion[] {
  return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
}
