import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

import { createAuthApp } from '../../auth/adapters/controllers/auth-controller';
import type { GetMeUseCase } from '../../auth/application/get-me-usecase';
import type { LoginUseCase } from '../../auth/application/login-usecase';
import type { LogoutUseCase } from '../../auth/application/logout-usecase';
import type { RegisterUseCase } from '../../auth/application/register-usecase';
import { createHealthApp } from '../../health/adapters/controllers/health-controller';
import type { GetHealthUseCase } from '../../health/application/get-health-usecase';

interface AppDeps {
  readonly getHealth: GetHealthUseCase;
  /** Cookie 認証のため、許可するブラウザ Origin（非ワイルドカード）。 */
  readonly corsOrigin: string;
  readonly auth: {
    readonly register: RegisterUseCase;
    readonly login: LoginUseCase;
    readonly logout: LogoutUseCase;
    readonly getMe: GetMeUseCase;
    readonly cookieSecure: boolean;
  };
}

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC のエンドツーエンド型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createApp(deps: AppDeps) {
  const health = createHealthApp({ getHealth: deps.getHealth });
  const auth = createAuthApp(deps.auth);
  return new OpenAPIHono()
    .use('*', cors({ origin: deps.corsOrigin, credentials: true }))
    .route('/', health)
    .route('/', auth);
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */

export type AppType = ReturnType<typeof createApp>;
