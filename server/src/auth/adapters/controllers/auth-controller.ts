import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
  loginRequestSchema,
  problemDetailSchema,
  registerRequestSchema,
  userResponseSchema,
} from '@pdf-review/shared';
import type { UserResponse } from '@pdf-review/shared';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import type { GetMeUseCase } from '../../application/get-me-usecase';
import type { LoginUseCase } from '../../application/login-usecase';
import type { LogoutUseCase } from '../../application/logout-usecase';
import type { RegisterUseCase } from '../../application/register-usecase';
import { UnauthenticatedError } from '../../application/unauthenticated-error';
import type { UserResult } from '../../application/user-result';

import { toProblem } from './problem';

const SESSION_COOKIE = 'sid';

interface AuthDeps {
  readonly register: Pick<RegisterUseCase, 'execute'>;
  readonly login: Pick<LoginUseCase, 'execute'>;
  readonly logout: Pick<LogoutUseCase, 'execute'>;
  readonly getMe: Pick<GetMeUseCase, 'execute'>;
  /** 本番(HTTPS)では true。Cookie の Secure 属性。 */
  readonly cookieSecure: boolean;
}

function toUserResponse(result: UserResult): UserResponse {
  return {
    id: result.id,
    email: result.email,
    displayName: result.displayName,
    createdAt: result.createdAt.toISOString(),
  };
}

/* eslint-disable @typescript-eslint/naming-convention --
   HTTP ステータスコード・MIME タイプ・Cookie/ヘッダ名は外部仕様で決まる
   識別子のため camelCase 規約の対象外。 */
const problemContent = {
  'application/problem+json': { schema: problemDetailSchema },
};
const errorResponses = {
  400: { description: 'リクエストが不正' as const, content: problemContent },
  401: { description: '認証が必要' as const, content: problemContent },
  404: { description: '対象が存在しない' as const, content: problemContent },
  409: { description: '競合' as const, content: problemContent },
  500: { description: 'サーバエラー' as const, content: problemContent },
};
const userContent = {
  'application/json': { schema: userResponseSchema },
};
const PROBLEM_HEADERS = {
  'content-type': 'application/problem+json',
} as const;
const BASE_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'Lax',
  path: '/',
} as const;

const registerRoute = createRoute({
  method: 'post',
  path: '/auth/register',
  request: {
    body: {
      content: { 'application/json': { schema: registerRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    201: { description: '作成成功' as const, content: userContent },
  },
});

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  request: {
    body: { content: { 'application/json': { schema: loginRequestSchema } } },
  },
  responses: {
    ...errorResponses,
    200: { description: 'ログイン成功' as const, content: userContent },
  },
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/auth/logout',
  responses: {
    ...errorResponses,
    204: { description: 'ログアウト成功' as const },
  },
});

const meRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  responses: {
    ...errorResponses,
    200: { description: '現在のユーザー' as const, content: userContent },
  },
});
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC のエンドツーエンド型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createAuthApp(deps: AuthDeps) {
  const cookieOpts = { ...BASE_COOKIE_OPTS, secure: deps.cookieSecure };

  return new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'リクエストの検証に失敗しました',
          },
          400,
          PROBLEM_HEADERS,
        );
      }
      return undefined;
    },
  })
    .openapi(registerRoute, async (c) => {
      try {
        const result = await deps.register.execute(c.req.valid('json'));
        return c.json(toUserResponse(result), 201);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(loginRoute, async (c) => {
      try {
        const { user, sessionId } = await deps.login.execute(
          c.req.valid('json'),
        );
        setCookie(c, SESSION_COOKIE, sessionId, cookieOpts);
        return c.json(toUserResponse(user), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(logoutRoute, async (c) => {
      const sessionId = getCookie(c, SESSION_COOKIE);
      try {
        if (sessionId !== undefined) {
          await deps.logout.execute({ sessionId });
        }
        return c.body(null, 204);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      } finally {
        // 成否に関わらず常にクッキーを失効させ、クライアントが復旧可能にする。
        deleteCookie(c, SESSION_COOKIE, {
          path: '/',
          secure: deps.cookieSecure,
          sameSite: 'Lax',
        });
      }
    })
    .openapi(meRoute, async (c) => {
      const sessionId = getCookie(c, SESSION_COOKIE);
      if (sessionId === undefined) {
        const p = toProblem(new UnauthenticatedError());
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
      try {
        const result = await deps.getMe.execute({ sessionId });
        return c.json(toUserResponse(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    });
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */
