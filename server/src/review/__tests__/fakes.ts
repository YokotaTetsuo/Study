import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { DocumentId } from '../../document/domain/document-id';
import { ApprovalPolicy } from '../../project/domain/approval-policy';
import { MemberUserId } from '../../project/domain/member-user-id';
import { Project } from '../../project/domain/project';
import { ProjectId } from '../../project/domain/project-id';
import { ProjectName } from '../../project/domain/project-name';
import type { ProjectRepository } from '../../project/domain/project-repository';
import { ProjectRole } from '../../project/domain/project-role';
import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import type { Transactor, UnitOfWork } from '../application/unit-of-work';
import { ReviewRequest } from '../domain/review-request';
import { ReviewRequestId } from '../domain/review-request-id';
import type { ReviewRequestRepository } from '../domain/review-request-repository';

export const FIXED_NOW: Dayjs = dayjs('2026-05-18T00:00:00.000Z');
export const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ234567890';
export const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
export const OWNER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
export const APPROVER_ID = '01HQ8ZK9PRSTVWXYZ23456789C';
export const APPROVER_ID_2 = '01HQ8ZK9PRSTVWXYZ23456789D';
export const REVIEWER_ID = '01HQ8ZK9PRSTVWXYZ23456789E';
export const OUTSIDER_ID = '01HQ8ZK9PRSTVWXYZ23456789F';
export const RR_ID = '01HQ8ZK9PRSTVWXYZ23456789G';

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function idGeneratorReturning(id: string): IdGenerator {
  return { generate: () => id };
}

/**
 * owner + approver + reviewer を持ち、承認ポリシーを差し替え可能な
 * Project を組み立てる。
 */
export function buildProject(params?: {
  requiredApprovals?: number | undefined;
  approverRoles?: readonly ProjectRole[] | undefined;
}): Project {
  const project = Project.create({
    id: new ProjectId(PROJECT_ID),
    name: new ProjectName('Docs'),
    ownerUserId: new MemberUserId(OWNER_ID),
    createdAt: FIXED_NOW,
  });
  project.addMember({
    userId: new MemberUserId(APPROVER_ID),
    role: new ProjectRole('approver'),
  });
  project.addMember({
    userId: new MemberUserId(APPROVER_ID_2),
    role: new ProjectRole('approver'),
  });
  project.addMember({
    userId: new MemberUserId(REVIEWER_ID),
    role: new ProjectRole('reviewer'),
  });
  project.updateApprovalPolicy(
    new ApprovalPolicy({
      requiredApprovals: params?.requiredApprovals ?? 1,
      approverRoles: params?.approverRoles ?? [new ProjectRole('approver')],
    }),
  );
  return project;
}

/** 単一プロジェクトを返す ProjectRepository。 */
export class SingleProjectRepository implements ProjectRepository {
  readonly #project: Project;

  constructor(project: Project) {
    this.#project = project;
  }

  findById(id: ProjectId): Promise<Project | null> {
    return Promise.resolve(id.equals(this.#project.id) ? this.#project : null);
  }

  listByMember(_userId: MemberUserId): Promise<readonly Project[]> {
    return Promise.resolve([this.#project]);
  }

  save(_project: Project): Promise<void> {
    return Promise.resolve();
  }

  delete(_id: ProjectId): Promise<void> {
    return Promise.resolve();
  }
}

/** 永続境界を模し、保存値と独立した複製を作る in-memory 実装。 */
function cloneReviewRequest(rr: ReviewRequest): ReviewRequest {
  return ReviewRequest.reconstruct({
    id: new ReviewRequestId(rr.id.value),
    documentId: new DocumentId(rr.documentId.value),
    versionNumber: rr.versionNumber,
    policy: new ApprovalPolicy({
      requiredApprovals: rr.policy.requiredApprovals,
      approverRoles: rr.policy.approverRoles.map(
        (r) => new ProjectRole(r.value),
      ),
    }),
    status: rr.status,
    createdAt: rr.createdAt,
    decidedAt: rr.decidedAt,
    approvalsData: rr.approvals.map((a) => ({
      approverId: a.approverId.value,
      role: a.role.value,
      decidedAt: a.decidedAt,
    })),
  });
}

export class InMemoryReviewRequestRepository implements ReviewRequestRepository {
  readonly #byKey = new Map<string, ReviewRequest>();

  #key(documentId: string, versionNumber: number): string {
    return `${documentId}#${String(versionNumber)}`;
  }

  findByVersion(
    documentId: DocumentId,
    versionNumber: number,
  ): Promise<ReviewRequest | null> {
    const found = this.#byKey.get(this.#key(documentId.value, versionNumber));
    return Promise.resolve(
      found === undefined ? null : cloneReviewRequest(found),
    );
  }

  save(reviewRequest: ReviewRequest): Promise<void> {
    this.#byKey.set(
      this.#key(reviewRequest.documentId.value, reviewRequest.versionNumber),
      cloneReviewRequest(reviewRequest),
    );
    return Promise.resolve();
  }
}

/**
 * トランザクションを張らず、与えられた in-memory リポジトリ群を
 * そのまま work へ渡す Transactor（usecase ロジック検証用）。
 */
export class FakeTransactor implements Transactor {
  readonly #uow: UnitOfWork;

  constructor(uow: UnitOfWork) {
    this.#uow = uow;
  }

  run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return work(this.#uow);
  }
}
