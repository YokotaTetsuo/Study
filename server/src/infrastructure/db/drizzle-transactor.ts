import { DrizzleDocumentRepository } from '../../document/adapters/gateways/drizzle-document-repository';
import { DrizzleReviewRequestRepository } from '../../review/adapters/gateways/drizzle-review-request-repository';
import type {
  Transactor,
  UnitOfWork,
} from '../../review/application/unit-of-work';

import type { Database } from './client';

/**
 * 単一 PostgreSQL トランザクションで Unit of Work を実行する Transactor。
 * tx に束ねたリポジトリを work に渡すため、Document と ReviewRequest の
 * 更新は原子的（途中失敗時は全ロールバック）。REPEATABLE READ により
 * 並行する同一行への状態遷移は直列化エラーで弾かれ、ロストアップデートを防ぐ。
 */
export class DrizzleTransactor implements Transactor {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.#db.transaction(
      (tx) =>
        work({
          documents: new DrizzleDocumentRepository(tx),
          reviewRequests: new DrizzleReviewRequestRepository(tx),
        }),
      { isolationLevel: 'repeatable read' },
    );
  }
}
