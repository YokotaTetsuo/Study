import type { Dayjs } from 'dayjs';

import type { User } from '../domain/user';

/**
 * ユースケースの User Result。日時は Dayjs のまま保持し、
 * 文字列化は adapter 層で行う（.claude/rules/server-application-result.md）。
 */
export interface UserResult {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly createdAt: Dayjs;
}

export function toUserResult(user: User): UserResult {
  return {
    id: user.id.value,
    email: user.email.value,
    displayName: user.displayName.value,
    createdAt: user.createdAt,
  };
}
