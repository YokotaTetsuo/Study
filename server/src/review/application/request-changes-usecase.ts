import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { DocumentRepository } from '../../document/domain/document-repository';
import type { ProjectRepository } from '../../project/domain/project-repository';
import type { Clock } from '../../shared-kernel/clock';
import { ReviewRequestNotFoundError } from '../domain/review-request-not-found-error';
import type { ReviewRequestRepository } from '../domain/review-request-repository';

import { resolveProjectContext } from './project-context';

export interface RequestChangesCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly reviewRequests: ReviewRequestRepository;
  readonly projects: ProjectRepository;
  readonly clock: Clock;
}

/**
 * レビュー依頼を差戻す（under_review → changes_requested）。
 * Document と ReviewRequest の 2 集約を更新する（原子性は Medium で検証）。
 */
export class RequestChangesUseCase {
  readonly #documents: DocumentRepository;
  readonly #reviewRequests: ReviewRequestRepository;
  readonly #projects: ProjectRepository;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#reviewRequests = deps.reviewRequests;
    this.#projects = deps.projects;
    this.#clock = deps.clock;
  }

  async execute(command: RequestChangesCommand): Promise<DocumentResult> {
    const document = await this.#documents.findById(
      new DocumentId(command.documentId),
    );
    if (document === null) {
      throw new DocumentNotFoundError();
    }
    const reviewRequest = await this.#reviewRequests.findByVersion(
      document.id,
      command.versionNumber,
    );
    if (reviewRequest === null) {
      throw new ReviewRequestNotFoundError();
    }
    await resolveProjectContext(
      this.#projects,
      document.projectId.value,
      command.actingUserId,
    );
    reviewRequest.requestChanges(this.#clock.now());
    document.requestChangesOnVersion(command.versionNumber);
    await this.#reviewRequests.save(reviewRequest);
    await this.#documents.save(document);
    return toDocumentResult(document);
  }
}
