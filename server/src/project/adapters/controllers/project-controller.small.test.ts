import { problemDetailSchema } from '@pdf-review/shared';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import type { SessionStore } from '../../../auth/application/session-store';
import { UserId } from '../../../auth/domain/user-id';
import { InMemoryUserDirectory, OWNER_ID } from '../../__tests__/fakes';
import { MemberUserNotFoundError } from '../../application/member-user-not-found-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import type { ProjectResult } from '../../application/project-result';
import { ProjectNotFoundError } from '../../domain/project-not-found-error';

import { createProjectApp } from './project-controller';

const RESULT: ProjectResult = {
  id: '01HQ8ZK9PRSTVWXYZ234567890',
  name: 'Docs',
  createdAt: dayjs('2026-05-18T00:00:00.000Z'),
  approvalPolicy: { requiredApprovals: 1, approverRoles: ['owner'] },
  members: [{ userId: OWNER_ID, role: 'owner' }],
};

const directory = new InMemoryUserDirectory([
  { userId: OWNER_ID, email: 'owner@example.com', displayName: 'Owner' },
]);

const loggedInSessions: SessionStore = {
  create: vi.fn(),
  destroy: vi.fn(),
  findUserId: () => Promise.resolve(new UserId(OWNER_ID)),
};
const anonSessions: SessionStore = {
  create: vi.fn(),
  destroy: vi.fn(),
  findUserId: () => Promise.resolve(null),
};

function deps(sessions: SessionStore): Parameters<typeof createProjectApp>[0] {
  return {
    createProject: { execute: vi.fn().mockResolvedValue(RESULT) },
    listProjects: { execute: vi.fn().mockResolvedValue([RESULT]) },
    getProject: { execute: vi.fn().mockResolvedValue(RESULT) },
    addMember: { execute: vi.fn().mockResolvedValue(RESULT) },
    setMemberRole: { execute: vi.fn().mockResolvedValue(RESULT) },
    updateApprovalPolicy: { execute: vi.fn().mockResolvedValue(RESULT) },
    renameProject: { execute: vi.fn().mockResolvedValue(RESULT) },
    deleteProject: { execute: vi.fn().mockResolvedValue(undefined) },
    sessions,
    userDirectory: directory,
  };
}

function postJson(path: string, body: unknown, cookie?: string): Request {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  if (cookie !== undefined) {
    headers.set('cookie', cookie);
  }
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('project controller', () => {
  it('should list projects for an authenticated user', async () => {
    const app = createProjectApp(deps(loggedInSessions));

    const res = await app.request(
      new Request('http://local/projects', {
        headers: new Headers([['cookie', 'sid=abc']]),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('should get a single project for a member', async () => {
    const app = createProjectApp(deps(loggedInSessions));

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}`, {
        headers: new Headers([['cookie', 'sid=abc']]),
      }),
    );

    expect(res.status).toBe(200);
  });

  it('should return 401 when unauthenticated', async () => {
    const app = createProjectApp(deps(anonSessions));

    const res = await app.request(postJson('/projects', { name: 'Docs' }));

    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
  });

  it('should create a project for an authenticated user', async () => {
    const app = createProjectApp(deps(loggedInSessions));

    const res = await app.request(
      postJson('/projects', { name: 'Docs' }, 'sid=abc'),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      id: RESULT.id,
      name: 'Docs',
      members: [
        {
          userId: OWNER_ID,
          email: 'owner@example.com',
          displayName: 'Owner',
          role: 'owner',
        },
      ],
    });
  });

  it('should return 400 problem for an invalid body', async () => {
    const app = createProjectApp(deps(loggedInSessions));

    const res = await app.request(
      postJson('/projects', { name: '' }, 'sid=abc'),
    );

    expect(res.status).toBe(400);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(400);
  });

  it('should add a member (200) for an owner', async () => {
    const app = createProjectApp(deps(loggedInSessions));

    const res = await app.request(
      postJson(
        `/projects/${RESULT.id}/members`,
        { email: 'owner@example.com', role: 'reviewer' },
        'sid=abc',
      ),
    );

    expect(res.status).toBe(200);
  });

  it('should map NotAuthorizedError to 403 problem', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      addMember: {
        execute: vi.fn().mockRejectedValue(new NotAuthorizedError()),
      },
    });

    const res = await app.request(
      postJson(
        `/projects/${RESULT.id}/members`,
        { email: 'owner@example.com', role: 'reviewer' },
        'sid=abc',
      ),
    );

    expect(res.status).toBe(403);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(403);
  });

  it('should update the approval policy (200) for an owner', async () => {
    const app = createProjectApp(deps(loggedInSessions));
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('cookie', 'sid=abc');

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}/approval-policy`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          requiredApprovals: 2,
          approverRoles: ['owner'],
        }),
      }),
    );

    expect(res.status).toBe(200);
  });

  it('should map MemberUserNotFoundError to 404 problem', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      addMember: {
        execute: vi.fn().mockRejectedValue(new MemberUserNotFoundError()),
      },
    });

    const res = await app.request(
      postJson(
        `/projects/${RESULT.id}/members`,
        { email: 'missing@example.com', role: 'reviewer' },
        'sid=abc',
      ),
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    expect(problemDetailSchema.parse(await res.json()).status).toBe(404);
  });

  it('should map a DB unique conflict (23505) to 409 problem', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      addMember: {
        // 同時メンバー追加で project_members の UNIQUE 違反が表面化。
        execute: vi.fn().mockRejectedValue({ code: '23505' }),
      },
    });

    const res = await app.request(
      postJson(
        `/projects/${RESULT.id}/members`,
        { email: 'owner@example.com', role: 'reviewer' },
        'sid=abc',
      ),
    );

    expect(res.status).toBe(409);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    expect(problemDetailSchema.parse(await res.json()).status).toBe(409);
  });

  it('should return 401 for member endpoints without a session', async () => {
    const app = createProjectApp(deps(anonSessions));

    const res = await app.request(
      postJson(`/projects/${RESULT.id}/members`, {
        email: 'owner@example.com',
        role: 'reviewer',
      }),
    );

    expect(res.status).toBe(401);
  });

  it('should rename a project (200) for an owner', async () => {
    const app = createProjectApp(deps(loggedInSessions));
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('cookie', 'sid=abc');

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}/name`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: 'Renamed' }),
      }),
    );

    expect(res.status).toBe(200);
  });

  it('should map NotAuthorizedError to 403 on rename', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      renameProject: {
        execute: vi.fn().mockRejectedValue(new NotAuthorizedError()),
      },
    });
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('cookie', 'sid=abc');

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}/name`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: 'X' }),
      }),
    );

    expect(res.status).toBe(403);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(403);
  });

  it('should require a session to rename a project (401)', async () => {
    const app = createProjectApp(deps(anonSessions));
    const headers = new Headers();
    headers.set('content-type', 'application/json');

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}/name`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: 'Renamed' }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it('should map ProjectNotFoundError to 404 on rename', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      renameProject: {
        execute: vi.fn().mockRejectedValue(new ProjectNotFoundError()),
      },
    });
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('cookie', 'sid=abc');

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}/name`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: 'X' }),
      }),
    );

    expect(res.status).toBe(404);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(404);
  });

  it('should return 400 problem for an invalid rename body', async () => {
    const app = createProjectApp(deps(loggedInSessions));
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('cookie', 'sid=abc');

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}/name`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: '' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(400);
  });

  it('should delete a project and return 204 for an owner', async () => {
    const app = createProjectApp(deps(loggedInSessions));

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}`, {
        method: 'DELETE',
        headers: new Headers([['cookie', 'sid=abc']]),
      }),
    );

    expect(res.status).toBe(204);
  });

  it('should require a session to delete a project (401)', async () => {
    const app = createProjectApp(deps(anonSessions));

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}`, {
        method: 'DELETE',
      }),
    );

    expect(res.status).toBe(401);
  });

  it('should map NotAuthorizedError to 403 on delete', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      deleteProject: {
        execute: vi.fn().mockRejectedValue(new NotAuthorizedError()),
      },
    });

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}`, {
        method: 'DELETE',
        headers: new Headers([['cookie', 'sid=abc']]),
      }),
    );

    expect(res.status).toBe(403);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(403);
  });

  it('should map ProjectNotFoundError to 404 on delete', async () => {
    const d = deps(loggedInSessions);
    const app = createProjectApp({
      ...d,
      deleteProject: {
        execute: vi.fn().mockRejectedValue(new ProjectNotFoundError()),
      },
    });

    const res = await app.request(
      new Request(`http://local/projects/${RESULT.id}`, {
        method: 'DELETE',
        headers: new Headers([['cookie', 'sid=abc']]),
      }),
    );

    expect(res.status).toBe(404);
    expect(problemDetailSchema.parse(await res.json()).status).toBe(404);
  });
});
