import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { ProjectRepository } from '../../project/domain/project-repository';
import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { ReviewRequest } from '../domain/review-request';
import { ReviewRequestId } from '../domain/review-request-id';

import { resolveProjectContext } from './project-context';
import type { Transactor } from './unit-of-work';

export interface SubmitVersionCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly transactor: Transactor;
  readonly projects: ProjectRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/**
 * 版を提出しレビュー依頼を起こす（draft → under_review）。
 * Document と ReviewRequest を 1 トランザクションで原子的に更新する。
 */
export class SubmitVersionUseCase {
  readonly #transactor: Transactor;
  readonly #projects: ProjectRepository;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#transactor = deps.transactor;
    this.#projects = deps.projects;
    this.#idGenerator = deps.idGenerator;
    this.#clock = deps.clock;
  }

  async execute(command: SubmitVersionCommand): Promise<DocumentResult> {
    return this.#transactor.run(async ({ documents, reviewRequests }) => {
      const document = await documents.findById(
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
      await reviewRequests.save(reviewRequest);
      await documents.save(document);
      return toDocumentResult(document);
    });
  }
}
