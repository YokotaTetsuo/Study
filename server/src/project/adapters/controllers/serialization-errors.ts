/**
 * レスポンス整形時の内部エラー。toProblem で 500 に明示マップする。
 */
export class MemberProfileMissingError extends Error {
  constructor() {
    super('member profile not found');
    this.name = 'MemberProfileMissingError';
  }
}

export class ResponseSerializationError extends Error {
  constructor() {
    super('failed to serialize project response');
    this.name = 'ResponseSerializationError';
  }
}
