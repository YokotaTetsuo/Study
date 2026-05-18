/**
 * 開発用シード。サンプルのユーザー / プロジェクト / 文書 / 版 /
 * コメントを投入する。usecase 経由で作成し不変条件を尊重する。
 *
 * 冪等: 先頭ユーザー（owner@example.com）が既に居れば何もしない。
 * 実行: `pnpm --filter @pdf-review/server seed`（要 DB / S3、migrate 済み）。
 */
import { Argon2PasswordHasher } from '../auth/adapters/gateways/argon2-password-hasher';
import { DrizzleUserRepository } from '../auth/adapters/gateways/drizzle-user-repository';
import { RegisterUseCase } from '../auth/application/register-usecase';
import { DrizzleDocumentRepository } from '../document/adapters/gateways/drizzle-document-repository';
import { S3FileStorage } from '../document/adapters/gateways/s3-file-storage';
import { SqlProjectAccess } from '../document/adapters/gateways/sql-project-access';
import { AddCommentUseCase } from '../document/application/add-comment-usecase';
import { CreateDocumentUseCase } from '../document/application/create-document-usecase';
import { UploadVersionUseCase } from '../document/application/upload-version-usecase';
import { DrizzleProjectRepository } from '../project/adapters/gateways/drizzle-project-repository';
import { DrizzleUserDirectory } from '../project/adapters/gateways/drizzle-user-directory';
import { AddMemberUseCase } from '../project/application/add-member-usecase';
import { CreateProjectUseCase } from '../project/application/create-project-usecase';

import { SystemClock } from './clock/system-clock';
import { createDbClient } from './db/client';
import { loadEnv } from './env';
import { UlidIdGenerator } from './id/ulid-id-generator';
import { createS3Client, ensureBucket } from './storage/s3-client';

/* eslint-disable no-console -- CLI スクリプトの実行ログは標準出力に出す */
const log = (message: string): void => {
  console.log(message);
};
/* eslint-enable no-console */

const PASSWORD = 'password1234';
const MINIMAL_PDF = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const dbClient = createDbClient(env);
  const clock = new SystemClock();
  const idGenerator = new UlidIdGenerator();

  const existing = await dbClient.sql`
    select 1 from users where email = 'owner@example.com' limit 1
  `;
  if (existing.length > 0) {
    log('シード済みのためスキップします。');
    await dbClient.sql.end();
    return;
  }

  const users = new DrizzleUserRepository(dbClient.db);
  const hasher = new Argon2PasswordHasher();
  const projects = new DrizzleProjectRepository(dbClient.db);
  const userDirectory = new DrizzleUserDirectory(dbClient.db);
  const documents = new DrizzleDocumentRepository(dbClient.db);
  const projectAccess = new SqlProjectAccess(dbClient.sql);
  const s3Client = createS3Client(env);
  const fileStorage = new S3FileStorage(s3Client, env.S3_BUCKET);
  await ensureBucket(s3Client, env.S3_BUCKET, env.S3_REGION);

  const register = new RegisterUseCase({ users, hasher, idGenerator, clock });
  const createProject = new CreateProjectUseCase({
    projects,
    idGenerator,
    clock,
  });
  const addMember = new AddMemberUseCase({ projects, userDirectory });
  const createDocument = new CreateDocumentUseCase({
    documents,
    projectAccess,
    idGenerator,
    clock,
  });
  const uploadVersion = new UploadVersionUseCase({
    documents,
    projectAccess,
    fileStorage,
    idGenerator,
    clock,
  });
  const addComment = new AddCommentUseCase({
    documents,
    projectAccess,
    idGenerator,
    clock,
  });

  const owner = await register.execute({
    email: 'owner@example.com',
    password: PASSWORD,
    displayName: 'オーナー太郎',
  });
  await register.execute({
    email: 'approver@example.com',
    password: PASSWORD,
    displayName: '承認者花子',
  });
  await register.execute({
    email: 'reviewer@example.com',
    password: PASSWORD,
    displayName: 'レビュアー次郎',
  });
  const submitter = await register.execute({
    email: 'submitter@example.com',
    password: PASSWORD,
    displayName: '起票者三郎',
  });

  const project = await createProject.execute({
    name: 'サンプルプロジェクト',
    ownerUserId: owner.id,
  });
  for (const [email, role] of [
    ['approver@example.com', 'approver'],
    ['reviewer@example.com', 'reviewer'],
    ['submitter@example.com', 'submitter'],
  ] as const) {
    await addMember.execute({
      projectId: project.id,
      actingUserId: owner.id,
      email,
      role,
    });
  }

  const document = await createDocument.execute({
    projectId: project.id,
    name: '設計仕様書',
    actingUserId: submitter.id,
  });
  await uploadVersion.execute({
    documentId: document.id,
    actingUserId: submitter.id,
    data: MINIMAL_PDF,
    contentType: 'application/pdf',
  });
  await addComment.execute({
    documentId: document.id,
    versionNumber: 1,
    actingUserId: owner.id,
    content: '初版を確認しました。体裁を整えてください。',
  });

  log('シード完了:');
  log('  ログイン: owner@example.com / approver@example.com /');
  log('            reviewer@example.com / submitter@example.com');
  log(`  パスワード（共通）: ${PASSWORD}`);
  log(`  プロジェクト「サンプルプロジェクト」/ 文書「設計仕様書」v1`);
  await dbClient.sql.end();
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- CLI スクリプトの失敗ログ
  console.error('シードに失敗しました:', error);
  process.exitCode = 1;
});
