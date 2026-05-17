import { ulid } from 'ulid';

import type { IdGenerator } from '../../shared-kernel/id-generator';

/**
 * ULID による ID 生成。
 */
export class UlidIdGenerator implements IdGenerator {
  generate(): string {
    return ulid();
  }
}
