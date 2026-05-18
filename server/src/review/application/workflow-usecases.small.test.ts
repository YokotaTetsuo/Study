import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryDocumentRepository } from '../../document/__tests__/fakes';
import { Document } from '../../document/domain/document';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentName } from '../../document/domain/document-name';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import { DocumentProjectId } from '../../document/domain/document-project-id';
import { InvalidVersionTransitionError } from '../../document/domain/invalid-version-transition-error';
import { StorageKey } from '../../document/domain/storage-key';
import { UploaderId } from '../../document/domain/uploader-id';
import {
  APPROVER_ID,
  APPROVER_ID_2,
  DOC_ID,
  FakeTransactor,
  OUTSIDER_ID,
  OWNER_ID,
  PROJECT_ID,
  REVIEWER_ID,
  RR_ID,
  buildProject,
  fixedClock,
  idGeneratorReturning,
  InMemoryReviewRequestRepository,
  SingleProjectRepository,
} from '../__tests__/fakes';
import { DuplicateApprovalError } from '../domain/duplicate-approval-error';
import { ReviewRequestNotFoundError } from '../domain/review-request-not-found-error';
import { UnauthorizedApproverError } from '../domain/unauthorized-approver-error';

import { ApproveVersionUseCase } from './approve-version-usecase';
import { NotAuthorizedError } from './not-authorized-error';
import { PublishVersionUseCase } from './publish-version-usecase';
import { RejectVersionUseCase } from './reject-version-usecase';
import { RequestChangesUseCase } from './request-changes-usecase';
import { SubmitVersionUseCase } from './submit-version-usecase';

let documents: InMemoryDocumentRepository;
let reviewRequests: InMemoryReviewRequestRepository;

function makeDeps(opts?: { requiredApprovals?: number | undefined }): {
  transactor: FakeTransactor;
  projects: SingleProjectRepository;
  idGenerator: ReturnType<typeof idGeneratorReturning>;
  clock: typeof fixedClock;
} {
  return {
    transactor: new FakeTransactor({ documents, reviewRequests }),
    projects: new SingleProjectRepository(
      buildProject({ requiredApprovals: opts?.requiredApprovals }),
    ),
    idGenerator: idGeneratorReturning(RR_ID),
    clock: fixedClock,
  };
}

async function seedDraft(): Promise<void> {
  const doc = Document.create({
    id: new DocumentId(DOC_ID),
    projectId: new DocumentProjectId(PROJECT_ID),
    name: new DocumentName('設計書'),
    createdAt: fixedClock.now(),
  });
  doc.addVersion({
    storageKey: new StorageKey('documents/d/a.pdf'),
    uploadedBy: new UploaderId(OWNER_ID),
    createdAt: fixedClock.now(),
  });
  await documents.save(doc);
}

async function submit(opts?: {
  actingUserId?: string;
  requiredApprovals?: number;
}): Promise<void> {
  // ReviewRequest は提出時のポリシーをスナップショットするため、
  // 必要承認数はここで確定させる。
  const deps = makeDeps({ requiredApprovals: opts?.requiredApprovals });
  await new SubmitVersionUseCase(deps).execute({
    documentId: DOC_ID,
    versionNumber: 1,
    actingUserId: opts?.actingUserId ?? OWNER_ID,
  });
}

beforeEach(async () => {
  documents = new InMemoryDocumentRepository();
  reviewRequests = new InMemoryReviewRequestRepository();
  await seedDraft();
});

describe('SubmitVersionUseCase', () => {
  it('should move the version to under_review and create a review request', async () => {
    const result = await new SubmitVersionUseCase(makeDeps()).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: OWNER_ID,
    });

    expect(result.versions[0]?.status).toBe('under_review');
    const rr = await reviewRequests.findByVersion(new DocumentId(DOC_ID), 1);
    expect(rr?.status.value).toBe('pending');
  });

  it('should reject a non-member', async () => {
    await expect(submit({ actingUserId: OUTSIDER_ID })).rejects.toThrow(
      NotAuthorizedError,
    );
  });

  it('should reject an unknown document', async () => {
    await expect(
      new SubmitVersionUseCase(makeDeps()).execute({
        documentId: '01HQ8ZK9PRSTVWXYZ23456789Z',
        versionNumber: 1,
        actingUserId: OWNER_ID,
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });

  it('should reject submitting a version that is not draft', async () => {
    await submit();
    await expect(submit()).rejects.toThrow(InvalidVersionTransitionError);
  });
});

describe('ApproveVersionUseCase', () => {
  it('should approve the version when the policy needs one approval', async () => {
    await submit();

    const result = await new ApproveVersionUseCase(makeDeps()).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: APPROVER_ID,
    });

    expect(result.versions[0]?.status).toBe('approved');
  });

  it('should stay under_review until the required approvals are reached', async () => {
    await submit({ requiredApprovals: 2 });
    const deps = makeDeps({ requiredApprovals: 2 });

    const first = await new ApproveVersionUseCase(deps).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: APPROVER_ID,
    });
    expect(first.versions[0]?.status).toBe('under_review');

    const second = await new ApproveVersionUseCase(deps).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: APPROVER_ID_2,
    });
    expect(second.versions[0]?.status).toBe('approved');
  });

  it('should reject an approver whose role lacks authority', async () => {
    await submit();

    await expect(
      new ApproveVersionUseCase(makeDeps()).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: REVIEWER_ID,
      }),
    ).rejects.toThrow(UnauthorizedApproverError);
  });

  it('should reject a duplicate approval from the same approver', async () => {
    await submit({ requiredApprovals: 2 });
    const deps = makeDeps({ requiredApprovals: 2 });
    await new ApproveVersionUseCase(deps).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: APPROVER_ID,
    });

    await expect(
      new ApproveVersionUseCase(deps).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: APPROVER_ID,
      }),
    ).rejects.toThrow(DuplicateApprovalError);
  });

  it('should reject when no review request exists', async () => {
    await expect(
      new ApproveVersionUseCase(makeDeps()).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: APPROVER_ID,
      }),
    ).rejects.toThrow(ReviewRequestNotFoundError);
  });
});

describe('RequestChangesUseCase', () => {
  it('should move the version to changes_requested', async () => {
    await submit();

    const result = await new RequestChangesUseCase(makeDeps()).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: REVIEWER_ID,
    });

    expect(result.versions[0]?.status).toBe('changes_requested');
  });

  it('should reject a non-reviewer/owner role', async () => {
    await submit();

    await expect(
      new RequestChangesUseCase(makeDeps()).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: APPROVER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });
});

describe('RejectVersionUseCase', () => {
  it('should move the version to rejected', async () => {
    await submit();

    const result = await new RejectVersionUseCase(makeDeps()).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: REVIEWER_ID,
    });

    expect(result.versions[0]?.status).toBe('rejected');
  });

  it('should reject a non-reviewer/owner role', async () => {
    await submit();

    await expect(
      new RejectVersionUseCase(makeDeps()).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: APPROVER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });
});

describe('PublishVersionUseCase', () => {
  async function approveV1(): Promise<void> {
    await submit();
    await new ApproveVersionUseCase(makeDeps()).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: APPROVER_ID,
    });
  }

  it('should publish an approved version as official (owner only)', async () => {
    await approveV1();

    const result = await new PublishVersionUseCase(makeDeps()).execute({
      documentId: DOC_ID,
      versionNumber: 1,
      actingUserId: OWNER_ID,
    });

    expect(result.versions[0]?.status).toBe('official');
    expect(result.officialVersionNumber).toBe(1);
  });

  it('should reject a non-owner', async () => {
    await approveV1();

    await expect(
      new PublishVersionUseCase(makeDeps()).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: APPROVER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject publishing a version that is not approved', async () => {
    await submit();

    await expect(
      new PublishVersionUseCase(makeDeps()).execute({
        documentId: DOC_ID,
        versionNumber: 1,
        actingUserId: OWNER_ID,
      }),
    ).rejects.toThrow(InvalidVersionTransitionError);
  });
});
