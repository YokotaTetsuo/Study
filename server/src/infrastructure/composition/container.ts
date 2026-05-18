import { Argon2PasswordHasher } from '../../auth/adapters/gateways/argon2-password-hasher';
import { DrizzleSessionStore } from '../../auth/adapters/gateways/drizzle-session-store';
import { DrizzleUserRepository } from '../../auth/adapters/gateways/drizzle-user-repository';
import { GetMeUseCase } from '../../auth/application/get-me-usecase';
import { LoginUseCase } from '../../auth/application/login-usecase';
import { LogoutUseCase } from '../../auth/application/logout-usecase';
import { RegisterUseCase } from '../../auth/application/register-usecase';
import { DrizzleDocumentRepository } from '../../document/adapters/gateways/drizzle-document-repository';
import { S3FileStorage } from '../../document/adapters/gateways/s3-file-storage';
import { SqlProjectAccess } from '../../document/adapters/gateways/sql-project-access';
import { CreateDocumentUseCase } from '../../document/application/create-document-usecase';
import { GetDocumentUseCase } from '../../document/application/get-document-usecase';
import { GetVersionFileUseCase } from '../../document/application/get-version-file-usecase';
import { ListDocumentsUseCase } from '../../document/application/list-documents-usecase';
import { UploadVersionUseCase } from '../../document/application/upload-version-usecase';
import { SqlDbConnectivity } from '../../health/adapters/gateways/sql-db-connectivity';
import { GetHealthUseCase } from '../../health/application/get-health-usecase';
import { DrizzleProjectRepository } from '../../project/adapters/gateways/drizzle-project-repository';
import { DrizzleUserDirectory } from '../../project/adapters/gateways/drizzle-user-directory';
import { AddMemberUseCase } from '../../project/application/add-member-usecase';
import { CreateProjectUseCase } from '../../project/application/create-project-usecase';
import { GetProjectUseCase } from '../../project/application/get-project-usecase';
import { ListProjectsUseCase } from '../../project/application/list-projects-usecase';
import { SetMemberRoleUseCase } from '../../project/application/set-member-role-usecase';
import { UpdateApprovalPolicyUseCase } from '../../project/application/update-approval-policy-usecase';
import { DrizzleReviewRequestRepository } from '../../review/adapters/gateways/drizzle-review-request-repository';
import { ApproveVersionUseCase } from '../../review/application/approve-version-usecase';
import { PublishVersionUseCase } from '../../review/application/publish-version-usecase';
import { RejectVersionUseCase } from '../../review/application/reject-version-usecase';
import { RequestChangesUseCase } from '../../review/application/request-changes-usecase';
import { SubmitVersionUseCase } from '../../review/application/submit-version-usecase';
import { SystemClock } from '../clock/system-clock';
import { createDbClient } from '../db/client';
import type { DbClient } from '../db/client';
import type { Env } from '../env';
import { createApp } from '../http/app';
import type { AppType } from '../http/app';
import { UlidIdGenerator } from '../id/ulid-id-generator';
import { createS3Client, ensureBucket } from '../storage/s3-client';

/**
 * コンポジションルート。全依存をここで配線する。
 */
export interface Container {
  readonly dbClient: DbClient;
  readonly app: AppType;
  /** S3 バケット作成など、起動前に完了させる初期化。 */
  readonly ready: Promise<void>;
}

export function createContainer(env: Env): Container {
  const dbClient = createDbClient(env);
  const clock = new SystemClock();
  const idGenerator = new UlidIdGenerator();

  const dbConnectivity = new SqlDbConnectivity(dbClient.sql);
  const getHealth = new GetHealthUseCase({ clock, db: dbConnectivity });

  const users = new DrizzleUserRepository(dbClient.db);
  const hasher = new Argon2PasswordHasher();
  const sessions = new DrizzleSessionStore({
    db: dbClient.db,
    clock,
    idGenerator,
  });

  const projects = new DrizzleProjectRepository(dbClient.db);
  const userDirectory = new DrizzleUserDirectory(dbClient.db);

  const s3Client = createS3Client(env);
  const fileStorage = new S3FileStorage(s3Client, env.S3_BUCKET);
  const documents = new DrizzleDocumentRepository(dbClient.db);
  const reviewRequests = new DrizzleReviewRequestRepository(dbClient.db);
  const projectAccess = new SqlProjectAccess(dbClient.sql);
  const ready = ensureBucket(s3Client, env.S3_BUCKET, env.S3_REGION);

  const app = createApp({
    getHealth,
    corsOrigin: env.CLIENT_ORIGIN,
    auth: {
      register: new RegisterUseCase({ users, hasher, idGenerator, clock }),
      login: new LoginUseCase({ users, hasher, sessions }),
      logout: new LogoutUseCase({ sessions }),
      getMe: new GetMeUseCase({ users, sessions }),
      cookieSecure: env.NODE_ENV === 'production',
    },
    project: {
      createProject: new CreateProjectUseCase({ projects, idGenerator, clock }),
      listProjects: new ListProjectsUseCase({ projects }),
      getProject: new GetProjectUseCase({ projects }),
      addMember: new AddMemberUseCase({ projects, userDirectory }),
      setMemberRole: new SetMemberRoleUseCase({ projects }),
      updateApprovalPolicy: new UpdateApprovalPolicyUseCase({ projects }),
      sessions,
      userDirectory,
    },
    document: {
      createDocument: new CreateDocumentUseCase({
        documents,
        projectAccess,
        idGenerator,
        clock,
      }),
      listDocuments: new ListDocumentsUseCase({ documents, projectAccess }),
      getDocument: new GetDocumentUseCase({ documents, projectAccess }),
      uploadVersion: new UploadVersionUseCase({
        documents,
        projectAccess,
        fileStorage,
        idGenerator,
        clock,
      }),
      getVersionFile: new GetVersionFileUseCase({
        documents,
        projectAccess,
        fileStorage,
      }),
      sessions,
    },
    review: {
      submitVersion: new SubmitVersionUseCase({
        documents,
        reviewRequests,
        projects,
        idGenerator,
        clock,
      }),
      approveVersion: new ApproveVersionUseCase({
        documents,
        reviewRequests,
        projects,
        clock,
      }),
      requestChanges: new RequestChangesUseCase({
        documents,
        reviewRequests,
        projects,
        clock,
      }),
      rejectVersion: new RejectVersionUseCase({
        documents,
        reviewRequests,
        projects,
        clock,
      }),
      publishVersion: new PublishVersionUseCase({ documents, projects }),
      sessions,
    },
  });

  return { dbClient, app, ready };
}
