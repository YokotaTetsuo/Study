import { problemDetailSchema } from '@pdf-review/shared';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import type { SessionStore } from '../../../auth/application/session-store';
import { UserId } from '../../../auth/domain/user-id';
import { InMemoryUserDirectory, OWNER_ID } from '../../__tests__/fakes';
import type { ProjectResult } from '../../application/project-result';

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
    addMember: { execute: vi.fn().mockResolvedValue(RESULT) },
    setMemberRole: { execute: vi.fn().mockResolvedValue(RESULT) },
    updateApprovalPolicy: { execute: vi.fn().mockResolvedValue(RESULT) },
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
});
