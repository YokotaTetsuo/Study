import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { ProjectRepository } from '../../project/domain/project-repository';
import type { Clock } from '../../shared-kernel/clock';
import { ReviewRequestNotFoundError } from '../domain/review-request-not-found-error';

import { assertCanReview, resolveProjectContext } from './project-context';
import type { Transactor } from './unit-of-work';

export interface RejectVersionCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly transactor: Transactor;
  readonly projects: ProjectRepository;
  readonly clock: Clock;
}

/**
 * レビュー依頼を却下する（under_review → rejected）。
 * Document と ReviewRequest を 1 トランザクションで原子的に更新する。
 */
export class RejectVersionUseCase {
  readonly #transactor: Transactor;
  readonly #projects: ProjectRepository;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#transactor = deps.transactor;
    this.#projects = deps.projects;
    this.#clock = deps.clock;
  }

  async execute(command: RejectVersionCommand): Promise<DocumentResult> {
    return this.#transactor.run(async ({ documents, reviewRequests }) => {
      const document = await documents.findById(
        new DocumentId(command.documentId),
      );
      if (document === null) {
        throw new DocumentNotFoundError();
      }
      const reviewRequest = await reviewRequests.findByVersion(
        document.id,
        command.versionNumber,
      );
      if (reviewRequest === null) {
        throw new ReviewRequestNotFoundError();
      }
      const ctx = await resolveProjectContext(
        this.#projects,
        document.projectId.value,
        command.actingUserId,
      );
      assertCanReview(ctx);
      reviewRequest.reject(this.#clock.now());
      document.rejectVersion(command.versionNumber);
      await reviewRequests.save(reviewRequest);
      await documents.save(document);
      return toDocumentResult(document);
    });
  }
}
