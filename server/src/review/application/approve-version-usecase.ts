import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { ProjectRepository } from '../../project/domain/project-repository';
import type { Clock } from '../../shared-kernel/clock';
import { ApproverId } from '../domain/approver-id';
import { ReviewRequestNotFoundError } from '../domain/review-request-not-found-error';

import { resolveProjectContext } from './project-context';
import type { Transactor } from './unit-of-work';

export interface ApproveVersionCommand {
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
 * レビュー依頼を承認する。承認ポリシーが充足したら版を approved にする。
 * Document と ReviewRequest を 1 トランザクションで原子的に更新する。
 */
export class ApproveVersionUseCase {
  readonly #transactor: Transactor;
  readonly #projects: ProjectRepository;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#transactor = deps.transactor;
    this.#projects = deps.projects;
    this.#clock = deps.clock;
  }

  async execute(command: ApproveVersionCommand): Promise<DocumentResult> {
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
      reviewRequest.approve({
        approverId: new ApproverId(command.actingUserId),
        approverRole: ctx.role,
        decidedAt: this.#clock.now(),
      });
      await reviewRequests.save(reviewRequest);
      if (reviewRequest.isApproved()) {
        document.approveVersion(command.versionNumber);
        await documents.save(document);
      }
      return toDocumentResult(document);
    });
  }
}
