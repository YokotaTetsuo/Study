import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

import { createAuthApp } from '../../auth/adapters/controllers/auth-controller';
import type { GetMeUseCase } from '../../auth/application/get-me-usecase';
import type { LoginUseCase } from '../../auth/application/login-usecase';
import type { LogoutUseCase } from '../../auth/application/logout-usecase';
import type { RegisterUseCase } from '../../auth/application/register-usecase';
import type { SessionStore } from '../../auth/application/session-store';
import { createDocumentApp } from '../../document/adapters/controllers/document-controller';
import type { CreateDocumentUseCase } from '../../document/application/create-document-usecase';
import type { GetDocumentUseCase } from '../../document/application/get-document-usecase';
import type { GetVersionFileUseCase } from '../../document/application/get-version-file-usecase';
import type { ListDocumentsUseCase } from '../../document/application/list-documents-usecase';
import type { UploadVersionUseCase } from '../../document/application/upload-version-usecase';
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
import { createReviewApp } from '../../review/adapters/controllers/review-controller';
import type { ApproveVersionUseCase } from '../../review/application/approve-version-usecase';
import type { PublishVersionUseCase } from '../../review/application/publish-version-usecase';
import type { RejectVersionUseCase } from '../../review/application/reject-version-usecase';
import type { RequestChangesUseCase } from '../../review/application/request-changes-usecase';
import type { SubmitVersionUseCase } from '../../review/application/submit-version-usecase';

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
  readonly document: {
    readonly createDocument: CreateDocumentUseCase;
    readonly listDocuments: ListDocumentsUseCase;
    readonly getDocument: GetDocumentUseCase;
    readonly uploadVersion: UploadVersionUseCase;
    readonly getVersionFile: GetVersionFileUseCase;
    readonly sessions: SessionStore;
  };
  readonly review: {
    readonly submitVersion: SubmitVersionUseCase;
    readonly approveVersion: ApproveVersionUseCase;
    readonly requestChanges: RequestChangesUseCase;
    readonly rejectVersion: RejectVersionUseCase;
    readonly publishVersion: PublishVersionUseCase;
    readonly sessions: SessionStore;
  };
}

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC のエンドツーエンド型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createApp(deps: AppDeps) {
  const health = createHealthApp({ getHealth: deps.getHealth });
  const auth = createAuthApp(deps.auth);
  const project = createProjectApp(deps.project);
  const document = createDocumentApp(deps.document);
  const review = createReviewApp(deps.review);
  return new OpenAPIHono()
    .use('*', cors({ origin: deps.corsOrigin, credentials: true }))
    .route('/', health)
    .route('/', auth)
    .route('/', project)
    .route('/', document)
    .route('/', review);
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */

export type AppType = ReturnType<typeof createApp>;
