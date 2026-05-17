import type { Clock } from '../../shared-kernel/clock';

import type { DbConnectivityPort } from './db-connectivity-port';
import type { HealthResult } from './health-result';

/**
 * サーバ稼働と DB 到達性を返す。状態変更を伴わない読み取り（Query）。
 */
export class GetHealthUseCase {
  readonly #clock: Clock;
  readonly #db: DbConnectivityPort;

  constructor(deps: { clock: Clock; db: DbConnectivityPort }) {
    this.#clock = deps.clock;
    this.#db = deps.db;
  }

  async execute(): Promise<HealthResult> {
    const reachable = await this.#db.isReachable();
    return {
      status: 'ok',
      db: reachable ? 'up' : 'down',
      checkedAt: this.#clock.now(),
    };
  }
}
