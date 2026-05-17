/**
 * 文字列を決定的なハッシュ・色相へ変換する純粋関数群。
 * 同じ言葉は常に同じ色になり、似た言葉でも色は十分に散らばる。
 */

/** FNV-1a 32bit ハッシュ。常に符号なし 32bit を返す。 */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 文字列から決定的な色相 [0, 360) を得る。 */
export function hueFromText(text: string): number {
  return hashString(text) % 360;
}
