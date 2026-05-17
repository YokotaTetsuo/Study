import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import type { SessionStore } from '../../../auth/application/session-store';
import { UserId } from '../../../auth/domain/user-id';
import type { DocumentResult } from '../../application/document-result';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import { UnsupportedContentTypeError } from '../../application/unsupported-content-type-error';
import { DocumentNotFoundError } from '../../domain/document-not-found-error';

import { createDocumentApp } from './document-controller';

const USER_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ23456789B';

const RESULT: DocumentResult = {
  id: DOC_ID,
  projectId: PROJECT_ID,
  name: '設計書',
  createdAt: dayjs('2026-05-18T00:00:00.000Z'),
  versions: [
    {
      versionNumber: 1,
      status: 'draft',
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
  overrides: Partial<Parameters<typeof createDocumentApp>[0]> = {},
): Parameters<typeof createDocumentApp>[0] {
  return {
    createDocument: { execute: vi.fn().mockResolvedValue(RESULT) },
    listDocuments: { execute: vi.fn().mockResolvedValue([RESULT]) },
    getDocument: { execute: vi.fn().mockResolvedValue(RESULT) },
    uploadVersion: { execute: vi.fn().mockResolvedValue(RESULT) },
    getVersionFile: {
      execute: vi.fn().mockResolvedValue({ data: new Uint8Array([1, 2, 3]) }),
    },
    sessions,
    ...overrides,
  };
}

function postJson(path: string, body: unknown, cookie?: string): Request {
  const headers = new Headers([['content-type', 'application/json']]);
  if (cookie !== undefined) {
    headers.set('cookie', cookie);
  }
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('document controller', () => {
  it('should return 401 when unauthenticated', async () => {
    const app = createDocumentApp(deps(anon));

    const res = await app.request(
      postJson('/documents', { projectId: PROJECT_ID, name: '設計書' }),
    );

    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
  });

  it('should create a document (201)', async () => {
    const app = createDocumentApp(deps(loggedIn));

    const res = await app.request(
      postJson(
        '/documents',
        { projectId: PROJECT_ID, name: '設計書' },
        'sid=a',
      ),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: DOC_ID, projectId: PROJECT_ID });
  });

  it('should list documents of a project (200)', async () => {
    const app = createDocumentApp(deps(loggedIn));

    const res = await app.request(
      new Request(`http://local/projects/${PROJECT_ID}/documents`, {
        headers: new Headers([['cookie', 'sid=a']]),
      }),
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('should map DocumentNotFoundError to 404', async () => {
    const app = createDocumentApp(
      deps(loggedIn, {
        getDocument: {
          execute: vi.fn().mockRejectedValue(new DocumentNotFoundError()),
        },
      }),
    );

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}`, {
        headers: new Headers([['cookie', 'sid=a']]),
      }),
    );

    expect(res.status).toBe(404);
  });

  it('should map NotAuthorizedError to 403', async () => {
    const app = createDocumentApp(
      deps(loggedIn, {
        getDocument: {
          execute: vi.fn().mockRejectedValue(new NotAuthorizedError()),
        },
      }),
    );

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}`, {
        headers: new Headers([['cookie', 'sid=a']]),
      }),
    );

    expect(res.status).toBe(403);
  });

  it('should require a file field on upload (400)', async () => {
    const app = createDocumentApp(deps(loggedIn));

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}/versions`, {
        method: 'POST',
        headers: new Headers([['cookie', 'sid=a']]),
        body: new FormData(),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('should upload a version via multipart (201)', async () => {
    const app = createDocumentApp(deps(loggedIn));
    const form = new FormData();
    form.set(
      'file',
      new File([new Uint8Array([1, 2, 3])], 'v1.pdf', {
        type: 'application/pdf',
      }),
    );

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}/versions`, {
        method: 'POST',
        headers: new Headers([['cookie', 'sid=a']]),
        body: form,
      }),
    );

    expect(res.status).toBe(201);
  });

  it('should map UnsupportedContentTypeError to 415', async () => {
    const app = createDocumentApp(
      deps(loggedIn, {
        uploadVersion: {
          execute: vi
            .fn()
            .mockRejectedValue(new UnsupportedContentTypeError('image/png')),
        },
      }),
    );
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1])], 'x.png'));

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}/versions`, {
        method: 'POST',
        headers: new Headers([['cookie', 'sid=a']]),
        body: form,
      }),
    );

    expect(res.status).toBe(415);
  });

  it('should download a version file as application/pdf', async () => {
    const app = createDocumentApp(deps(loggedIn));

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}/versions/1/file`, {
        headers: new Headers([['cookie', 'sid=a']]),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it('should reject a non-positive version number (400)', async () => {
    const app = createDocumentApp(deps(loggedIn));

    const res = await app.request(
      new Request(`http://local/documents/${DOC_ID}/versions/0/file`, {
        headers: new Headers([['cookie', 'sid=a']]),
      }),
    );

    expect(res.status).toBe(400);
  });
});
