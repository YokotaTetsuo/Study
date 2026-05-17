import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

import { createAuthApp } from '../../auth/adapters/controllers/auth-controller';
import type { GetMeUseCase } from '../../auth/application/get-me-usecase';
import type { LoginUseCase } from '../../auth/application/login-usecase';
import type { LogoutUseCase } from '../../auth/application/logout-usecase';
import type { RegisterUseCase } from '../../auth/application/register-usecase';
import type { SessionStore } from '../../auth/application/session-store';
import { createHealthApp } from '../../health/adapters/controllers/health-controller';
import type { GetHealthUseCase } from '../../health/application/get-health-usecase';
import { createProjectApp } from '../../project/adapters/controllers/project-controller';
import type { AddMemberUseCase } from '../../project/application/add-member-usecase';
import type { CreateProjectUseCase } from '../../project/application/create-project-usecase';
import type { GetProjectUseCase } from '../../project/application/get-project-usecase';
import type { ListProjectsUseCase } from '../../project/application/list-projects-usecase';
import type { SetMemberRoleUseCase } from '../../project/application/set-member-role-usecase';
import type { UpdateApprovalPolicyUseCase } from '../../project/application/update-approval-policy-usecase';
import type { UserDirectory } from '../../project/application/user-directory';

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
  readonly project: {
    readonly createProject: CreateProjectUseCase;
    readonly listProjects: ListProjectsUseCase;
    readonly getProject: GetProjectUseCase;
    readonly addMember: AddMemberUseCase;
    readonly setMemberRole: SetMemberRoleUseCase;
    readonly updateApprovalPolicy: UpdateApprovalPolicyUseCase;
    readonly sessions: SessionStore;
    readonly userDirectory: UserDirectory;
  };
}

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC のエンドツーエンド型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createApp(deps: AppDeps) {
  const health = createHealthApp({ getHealth: deps.getHealth });
  const auth = createAuthApp(deps.auth);
  const project = createProjectApp(deps.project);
  return new OpenAPIHono()
    .use('*', cors({ origin: deps.corsOrigin, credentials: true }))
    .route('/', health)
    .route('/', auth)
    .route('/', project);
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */

export type AppType = ReturnType<typeof createApp>;
