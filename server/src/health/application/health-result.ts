import type { Dayjs } from 'dayjs';

/**
 * health ユースケースの Result。日時は Dayjs のまま保持し、
 * 文字列化は adapter 層で行う（.claude/rules/server-application-result.md）。
 */
export interface HealthResult {
  readonly status: 'ok';
  readonly db: 'up' | 'down';
  readonly checkedAt: Dayjs;
}
