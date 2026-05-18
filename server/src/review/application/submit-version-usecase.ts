import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { DocumentRepository } from '../../document/domain/document-repository';
import type { ProjectRepository } from '../../project/domain/project-repository';
import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { ReviewRequest } from '../domain/review-request';
import { ReviewRequestId } from '../domain/review-request-id';
import type { ReviewRequestRepository } from '../domain/review-request-repository';

import { resolveProjectContext } from './project-context';

export interface SubmitVersionCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly reviewRequests: ReviewRequestRepository;
  readonly projects: ProjectRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/**
 * 版を提出しレビュー依頼を起こす（draft → under_review）。
 * Document と ReviewRequest の 2 集約を更新する（原子性は Medium で検証）。
 */
export class SubmitVersionUseCase {
  readonly #documents: DocumentRepository;
  readonly #reviewRequests: ReviewRequestRepository;
  readonly #projects: ProjectRepository;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#reviewRequests = deps.reviewRequests;
    this.#projects = deps.projects;
    this.#idGenerator = deps.idGenerator;
    this.#clock = deps.clock;
  }

  async execute(command: SubmitVersionCommand): Promise<DocumentResult> {
    const document = await this.#documents.findById(
      new DocumentId(command.documentId),
    );
    if (document === null) {
      throw new DocumentNotFoundError();
    }
    const ctx = await resolveProjectContext(
      this.#projects,
      document.projectId.value,
      command.actingUserId,
    );
    document.submitVersion(command.versionNumber);
    const reviewRequest = ReviewRequest.create({
      id: new ReviewRequestId(this.#idGenerator.generate()),
      documentId: document.id,
      versionNumber: command.versionNumber,
      policy: ctx.policy,
      createdAt: this.#clock.now(),
    });
    await this.#reviewRequests.save(reviewRequest);
    await this.#documents.save(document);
    return toDocumentResult(document);
  }
}
