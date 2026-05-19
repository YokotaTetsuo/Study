import type { DocumentVersion } from '@pdf-review/shared';

/**
 * 表示中に保持している選択版番号 `prev` を、取得済みの `versions` に
 * 整合させる。
 *
 * 同一ルートで documentId だけが変わる遷移ではページコンポーネントが
 * アンマウントされず、前の文書で選んだ版番号が state に残る。その版が
 * 新しい文書に存在しないと、別文書に無い版で PdfViewer/CommentThread を
 * 開いてしまう。`prev` が新しい `versions` に含まれない場合（文書切替
 * 直後や未選択時）は最新版へ寄せ、含まれる場合は選択を維持する。
 *
 * versions が空（版未作成）の場合は選択不能なので null を返す。
 */
export function reconcileSelectedVersion(
  prev: number | null,
  versions: readonly DocumentVersion[] | undefined,
): number | null {
  const last = versions?.at(-1);
  if (last === undefined) {
    return null;
  }
  if (prev !== null && versions?.some((v) => v.versionNumber === prev)) {
    return prev;
  }
  return last.versionNumber;
}
