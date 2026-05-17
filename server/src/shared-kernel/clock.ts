import type { Dayjs } from 'dayjs';

/**
 * 現在時刻を供給するポート。テストで固定時刻に差し替える。
 */
export interface Clock {
  now(): Dayjs;
}
