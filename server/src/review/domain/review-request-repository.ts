import type { DocumentId } from '../../document/domain/document-id';

import type { ReviewRequest } from './review-request';

/**
 * ReviewRequest 集約の永続化ポート。実装は adapters/gateways。
 */
export interface ReviewRequestRepository {
  /** 指定文書・版のレビュー依頼を取得する（無ければ null）。 */
  findByVersion(
    documentId: DocumentId,
    versionNumber: number,
  ): Promise<ReviewRequest | null>;
  save(reviewRequest: ReviewRequest): Promise<void>;
}
