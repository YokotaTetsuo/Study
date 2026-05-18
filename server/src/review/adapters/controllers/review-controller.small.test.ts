import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import type { SessionStore } from '../../../auth/application/session-store';
import { UserId } from '../../../auth/domain/user-id';
import type { DocumentResult } from '../../../document/application/document-result';
import { DocumentNotFoundError } from '../../../document/domain/document-not-found-error';
import { InvalidVersionTransitionError } from '../../../document/domain/invalid-version-transition-error';
import { VersionNotFoundError } from '../../../document/domain/version-not-found-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';

import { createReviewApp } from './review-controller';

const USER_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ23456789B';

const RESULT: DocumentResult = {
  id: DOC_ID,
  projectId: PROJECT_ID,
  name: '設計書',
  createdAt: dayjs('2026-05-18T00:00:00.000Z'),
  officialVersionNumber: null,
  versions: [
    {
      versionNumber: 1,
      status: 'under_review',
      uploadedBy: USER_ID,
      createdAt: dayjs('2026-05-18T00:00:00.000Z'),
    },
  ],
};

const loggedIn: SessionStore = {
  create: vi.fn(),
  destroy: vi.fn(),
  findUserId: () => Promise.resolve(new UserId(USER_ID)),
};
const anon: SessionStore = {
  create: vi.fn(),
  destroy: vi.fn(),
  findUserId: () => Promise.resolve(null),
};

function deps(
  sessions: SessionStore,
  overrides: Partial<Parameters<typeof createReviewApp>[0]> = {},
): Parameters<typeof createReviewApp>[0] {
  return {
    submitVersion: { execute: vi.fn().mockResolvedValue(RESULT) },
    approveVersion: { execute: vi.fn().mockResolvedValue(RESULT) },
    requestChanges: { execute: vi.fn().mockResolvedValue(RESULT) },
    rejectVersion: { execute: vi.fn().mockResolvedValue(RESULT) },
    publishVersion: { execute: vi.fn().mockResolvedValue(RESULT) },
    sessions,
    ...overrides,
  };
}

function post(path: string, cookie?: string): Request {
  const headers = new Headers();
  if (cookie !== undefined) {
    headers.set('cookie', cookie);
  }
  return new Request(`http://local${path}`, { method: 'POST', headers });
}

const SUBMIT = `/documents/${DOC_ID}/versions/1/submit`;

describe('review controller', () => {
  it('should return 401 when unauthenticated', async () => {
    const app = createReviewApp(deps(anon));

    const res = await app.request(post(SUBMIT));

    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
  });

  it('should return 400 for an invalid version number', async () => {
    const app = createReviewApp(deps(loggedIn));

    const res = await app.request(
      post(`/documents/${DOC_ID}/versions/abc/submit`, 'sid=a'),
    );

    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
  });

  it('should submit a version (200) and return the document', async () => {
    const app = createReviewApp(deps(loggedIn));

    const res = await app.request(post(SUBMIT, 'sid=a'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: DOC_ID,
      versions: [{ status: 'under_review' }],
    });
  });

  it('should drive each workflow route to its usecase', async () => {
    const d = deps(loggedIn);
    const app = createReviewApp(d);

    for (const action of ['approve', 'request-changes', 'reject', 'publish']) {
      const res = await app.request(
        post(`/documents/${DOC_ID}/versions/1/${action}`, 'sid=a'),
      );
      expect(res.status).toBe(200);
    }
    expect(d.approveVersion.execute).toHaveBeenCalledOnce();
    expect(d.requestChanges.execute).toHaveBeenCalledOnce();
    expect(d.rejectVersion.execute).toHaveBeenCalledOnce();
    expect(d.publishVersion.execute).toHaveBeenCalledOnce();
  });

  it('should map DocumentNotFoundError to 404 problem+json', async () => {
    const app = createReviewApp(
      deps(loggedIn, {
        submitVersion: {
          execute: vi.fn().mockRejectedValue(new DocumentNotFoundError()),
        },
      }),
    );

    const res = await app.request(post(SUBMIT, 'sid=a'));

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
  });

  it('should map VersionNotFoundError to 404 problem+json', async () => {
    const app = createReviewApp(
      deps(loggedIn, {
        submitVersion: {
          execute: vi.fn().mockRejectedValue(new VersionNotFoundError()),
        },
      }),
    );

    const res = await app.request(post(SUBMIT, 'sid=a'));

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
  });

  it('should map NotAuthorizedError to 403', async () => {
    const app = createReviewApp(
      deps(loggedIn, {
        submitVersion: {
          execute: vi.fn().mockRejectedValue(new NotAuthorizedError()),
        },
      }),
    );

    const res = await app.request(post(SUBMIT, 'sid=a'));

    expect(res.status).toBe(403);
  });

  it('should map InvalidVersionTransitionError to 409', async () => {
    const app = createReviewApp(
      deps(loggedIn, {
        submitVersion: {
          execute: vi
            .fn()
            .mockRejectedValue(
              new InvalidVersionTransitionError('draft', 'approve'),
            ),
        },
      }),
    );

    const res = await app.request(post(SUBMIT, 'sid=a'));

    expect(res.status).toBe(409);
  });
});
