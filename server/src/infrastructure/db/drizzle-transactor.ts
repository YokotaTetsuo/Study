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
 * 更新は原子的（途中失敗時は全ロールバック）。REPEATABLE READ で
 * 一貫スナップショット読みを担保しつつ、ロストアップデートの防止は主に
 * documents.revision の楽観ロック（不一致は StaleDocumentError）が担う。
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
          // inTx=true: 既に tx 境界内なので各リポジトリは
          // transaction を張らず同一 tx 上で実行する。
          documents: new DrizzleDocumentRepository(tx, true),
          reviewRequests: new DrizzleReviewRequestRepository(tx, true),
        }),
      { isolationLevel: 'repeatable read' },
    );
  }
}
