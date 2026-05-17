import { problemDetailSchema } from '@pdf-review/shared';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import type { GetMeUseCase } from '../../application/get-me-usecase';
import { InvalidCredentialsError } from '../../application/invalid-credentials-error';
import type { LoginUseCase } from '../../application/login-usecase';
import type { LogoutUseCase } from '../../application/logout-usecase';
import type { RegisterUseCase } from '../../application/register-usecase';
import { UnauthenticatedError } from '../../application/unauthenticated-error';
import type { UserResult } from '../../application/user-result';

import { createAuthApp } from './auth-controller';

const RESULT: UserResult = {
  id: '01HQ8ZK9PRSTVWXYZ234567890',
  email: 'a@example.com',
  displayName: 'Alice',
  createdAt: dayjs('2026-05-17T12:00:00.000Z'),
};

function jsonReq(path: string, body: unknown): Request {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function deps(over: {
  register?: Pick<RegisterUseCase, 'execute'>;
  login?: Pick<LoginUseCase, 'execute'>;
  logout?: Pick<LogoutUseCase, 'execute'>;
  getMe?: Pick<GetMeUseCase, 'execute'>;
}): Parameters<typeof createAuthApp>[0] {
  return {
    register: over.register ?? { execute: vi.fn().mockResolvedValue(RESULT) },
    login: over.login ?? {
      execute: vi.fn().mockResolvedValue({ user: RESULT, sessionId: 's1' }),
    },
    logout: over.logout ?? { execute: vi.fn().mockResolvedValue(undefined) },
    getMe: over.getMe ?? { execute: vi.fn().mockResolvedValue(RESULT) },
    cookieSecure: false,
  };
}

describe('auth controller', () => {
  it('should register and return 201 with the user shape', async () => {
    const app = createAuthApp(deps({}));

    const res = await app.request(
      jsonReq('/auth/register', {
        email: 'a@example.com',
        password: 'password123',
        displayName: 'Alice',
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: RESULT.id,
      email: 'a@example.com',
      displayName: 'Alice',
      createdAt: '2026-05-17T12:00:00.000Z',
    });
  });

  it('should return 400 for an invalid register body', async () => {
    const app = createAuthApp(deps({}));

    const res = await app.request(
      jsonReq('/auth/register', { email: 'bad', password: 'x' }),
    );

    expect(res.status).toBe(400);
  });

  it('should set an httpOnly session cookie on login', async () => {
    const app = createAuthApp(deps({}));

    const res = await app.request(
      jsonReq('/auth/login', {
        email: 'a@example.com',
        password: 'password123',
      }),
    );

    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('sid=s1');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('should map invalid credentials to 401 problem', async () => {
    const app = createAuthApp(
      deps({
        login: {
          execute: vi.fn().mockRejectedValue(new InvalidCredentialsError()),
        },
      }),
    );

    const res = await app.request(
      jsonReq('/auth/login', {
        email: 'a@example.com',
        password: 'wrong-password',
      }),
    );

    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    expect(problemDetailSchema.parse(await res.json()).status).toBe(401);
  });

  it('should return 401 for /auth/me without a valid session', async () => {
    const app = createAuthApp(
      deps({
        getMe: {
          execute: vi.fn().mockRejectedValue(new UnauthenticatedError()),
        },
      }),
    );

    const res = await app.request('http://local/auth/me');

    expect(res.status).toBe(401);
  });

  it('should return 204 on logout', async () => {
    const app = createAuthApp(deps({}));

    const res = await app.request(
      new Request('http://local/auth/logout', { method: 'POST' }),
    );

    expect(res.status).toBe(204);
  });
});
