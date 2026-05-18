/**
 * ULID の正準表現（26 文字 Crockford Base32、先頭は時刻上位のため 0-7）。
 * ID 値オブジェクト間でルールを一元化し、変更時に N ファイルを触らない。
 */
export const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
