import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Clock } from '../../shared-kernel/clock';

/**
 * 実時刻を返す Clock 実装。
 */
export class SystemClock implements Clock {
  now(): Dayjs {
    return dayjs();
  }
}
