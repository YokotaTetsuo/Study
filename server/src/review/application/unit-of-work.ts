import type { DocumentRepository } from '../../document/domain/document-repository';
import type { ReviewRequestRepository } from '../domain/review-request-repository';

/**
 * 1 トランザクション内で束ねた集約リポジトリ群。
 * ワークフローは Document と ReviewRequest を原子的に更新する必要があるため、
 * 同一トランザクションに紐づくリポジトリをここから取得する。
 */
export interface UnitOfWork {
  readonly documents: DocumentRepository;
  readonly reviewRequests: ReviewRequestRepository;
}

/**
 * 単一 DB トランザクション境界を張るポート。実装は infrastructure。
 * work 内の全リポジトリ操作は同一 tx で実行され、例外時は全てロールバックされる。
 */
export interface Transactor {
  run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}
