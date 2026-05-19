/**
 * 開発用シード。サンプルのユーザー / プロジェクト / 文書 / 版 /
 * コメントを投入する。usecase 経由で作成し不変条件を尊重する。
 *
 * 冪等かつ回復可能: 各エンティティの存在を都度確認して未作成のものだけ
 * 作る。途中失敗しても再実行で続きから完了できる。
 * 実行: `pnpm --filter @pdf-review/server seed`（要 DB / S3、migrate 済み）。
 */
import { Argon2PasswordHasher } from '../auth/adapters/gateways/argon2-password-hasher';
import { DrizzleUserRepository } from '../auth/adapters/gateways/drizzle-user-repository';
import { RegisterUseCase } from '../auth/application/register-usecase';
import { DrizzleDocumentRepository } from '../document/adapters/gateways/drizzle-document-repository';
import { S3FileStorage } from '../document/adapters/gateways/s3-file-storage';
import { SqlAuthorDirectory } from '../document/adapters/gateways/sql-author-directory';
import { SqlProjectAccess } from '../document/adapters/gateways/sql-project-access';
import { AddCommentUseCase } from '../document/application/add-comment-usecase';
import { CreateDocumentUseCase } from '../document/application/create-document-usecase';
import { UploadVersionUseCase } from '../document/application/upload-version-usecase';
import { DocumentId } from '../document/domain/document-id';
import { DocumentProjectId } from '../document/domain/document-project-id';
import { DrizzleProjectRepository } from '../project/adapters/gateways/drizzle-project-repository';
import { DrizzleUserDirectory } from '../project/adapters/gateways/drizzle-user-directory';
import { AddMemberUseCase } from '../project/application/add-member-usecase';
import { CreateProjectUseCase } from '../project/application/create-project-usecase';
import { UpdateApprovalPolicyUseCase } from '../project/application/update-approval-policy-usecase';
import { MemberAlreadyExistsError } from '../project/domain/member-already-exists-error';
import { MemberUserId } from '../project/domain/member-user-id';

import { SystemClock } from './clock/system-clock';
import { createDbClient } from './db/client';
import type { DbClient } from './db/client';
import { loadEnv } from './env';
import { UlidIdGenerator } from './id/ulid-id-generator';
import { createS3Client, ensureBucket } from './storage/s3-client';

/* eslint-disable no-console -- CLI スクリプトの実行ログは標準出力に出す */
const log = (message: string): void => {
  console.log(message);
};
/* eslint-enable no-console */

const PASSWORD = 'password1234';
const PROJECT_NAME = 'サンプルプロジェクト';
const DOCUMENT_NAME = '設計仕様書';
/**
 * 構造的に妥当な 1 ページ PDF を生成する（Catalog→Pages→Page の木と
 * 正しい xref バイトオフセット）。pdf.js でそのまま開けるため、シード
 * 後の README プレビュー/コメント動線が箱から出してすぐ機能する。
 * 内容は ASCII のみ（文字数=バイト数）でオフセット計算が一致する。
 */
function buildMinimalPdf(): Uint8Array {
  const header = '%PDF-1.4\n';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n',
  ];
  let body = header;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefStart = body.length;
  const total = objects.length + 1;
  let xref = `xref\n0 ${String(total)}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${String(total)} /Root 1 0 R >>\nstartxref\n${String(xrefStart)}\n%%EOF\n`;
  return new TextEncoder().encode(body + xref + trailer);
}

const MINIMAL_PDF = buildMinimalPdf();

interface SeedUser {
  readonly email: string;
  readonly displayName: string;
  readonly role: 'owner' | 'approver' | 'reviewer' | 'submitter';
}

const SEED_USERS: readonly SeedUser[] = [
  { email: 'owner@example.com', displayName: 'オーナー太郎', role: 'owner' },
  {
    email: 'approver@example.com',
    displayName: '承認者花子',
    role: 'approver',
  },
  {
    email: 'reviewer@example.com',
    displayName: 'レビュアー次郎',
    role: 'reviewer',
  },
  {
    email: 'submitter@example.com',
    displayName: '起票者三郎',
    role: 'submitter',
  },
];

async function run(dbClient: DbClient): Promise<void> {
  const env = loadEnv(process.env);
  const clock = new SystemClock();
  const idGenerator = new UlidIdGenerator();

  const users = new DrizzleUserRepository(dbClient.db);
  const hasher = new Argon2PasswordHasher();
  const projects = new DrizzleProjectRepository(dbClient.db);
  const userDirectory = new DrizzleUserDirectory(dbClient.db);
  const documents = new DrizzleDocumentRepository(dbClient.db);
  const projectAccess = new SqlProjectAccess(dbClient.sql);
  const authorDirectory = new SqlAuthorDirectory(dbClient.sql);
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
  const updatePolicy = new UpdateApprovalPolicyUseCase({ projects });
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
    authorDirectory,
    idGenerator,
    clock,
  });

  // ユーザー: 既存ならその id、無ければ登録（再実行で重複登録しない）。
  // 既存アカウントのパスワードは変更しない（このスクリプトが新規作成
  // したものだけが共通パスワードを持つ）。
  const userIdByEmail = new Map<string, string>();
  const createdEmails: string[] = [];
  for (const u of SEED_USERS) {
    const rows = await dbClient.sql<{ id: string }[]>`
      select id from users where email = ${u.email} limit 1
    `;
    const existingId = rows[0]?.id;
    if (existingId !== undefined) {
      userIdByEmail.set(u.email, existingId);
      continue;
    }
    const created = await register.execute({
      email: u.email,
      password: PASSWORD,
      displayName: u.displayName,
    });
    userIdByEmail.set(u.email, created.id);
    createdEmails.push(u.email);
  }
  const ownerId = userIdByEmail.get('owner@example.com');
  if (ownerId === undefined) {
    throw new Error('owner user could not be resolved');
  }

  // プロジェクト: 名前一致かつ ownerId が owner ロールのものだけ再利用
  // する（owner でない同名プロジェクトを掴むと以降の owner 専用操作が
  // 失敗するため）。無ければ作成。
  const ownerProjects = await projects.listByMember(new MemberUserId(ownerId));
  const existingProject = ownerProjects.find(
    (p) =>
      p.name.value === PROJECT_NAME &&
      p.members.some((m) => m.userId.value === ownerId && m.role.isOwner()),
  );
  const projectId =
    existingProject?.id.value ??
    (
      await createProject.execute({
        name: PROJECT_NAME,
        ownerUserId: ownerId,
      })
    ).id;

  // メンバー追加（既存は MemberAlreadyExistsError を握り潰して継続）。
  for (const u of SEED_USERS) {
    if (u.role === 'owner') {
      continue;
    }
    try {
      await addMember.execute({
        projectId,
        actingUserId: ownerId,
        email: u.email,
        role: u.role,
      });
    } catch (error) {
      if (!(error instanceof MemberAlreadyExistsError)) {
        throw error;
      }
    }
  }

  // 承認ポリシー: approver も承認できるようにする（README の確認フロー前提）。
  // 冪等な上書き操作。
  await updatePolicy.execute({
    projectId,
    actingUserId: ownerId,
    requiredApprovals: 1,
    approverRoles: ['owner', 'approver'],
  });

  const submitterId = userIdByEmail.get('submitter@example.com');
  if (submitterId === undefined) {
    throw new Error('submitter user could not be resolved');
  }

  // 文書: 同名が無ければ作成。
  const projectDocs = await documents.listByProject(
    new DocumentProjectId(projectId),
  );
  const existingDoc = projectDocs.find((d) => d.name.value === DOCUMENT_NAME);
  const documentId =
    existingDoc?.id.value ??
    (
      await createDocument.execute({
        projectId,
        name: DOCUMENT_NAME,
        actingUserId: submitterId,
      })
    ).id;

  // 版: まだ無ければ v1 をアップロード。
  const docForVersion = await documents.findById(new DocumentId(documentId));
  if (docForVersion === null) {
    throw new Error('seeded document not found after creation');
  }
  if (docForVersion.versions.length === 0) {
    await uploadVersion.execute({
      documentId,
      actingUserId: submitterId,
      data: MINIMAL_PDF,
      contentType: 'application/pdf',
    });
  }

  // コメント: v1 に未投稿なら 1 件追加。
  const docForComment = await documents.findById(new DocumentId(documentId));
  if (docForComment !== null && docForComment.commentsOf(1).length === 0) {
    await addComment.execute({
      documentId,
      versionNumber: 1,
      actingUserId: ownerId,
      content: '初版を確認しました。体裁を整えてください。',
    });
  }

  log('シード完了:');
  log('  対象アカウント: owner@example.com / approver@example.com /');
  log('                  reviewer@example.com / submitter@example.com');
  if (createdEmails.length > 0) {
    log(
      `  今回新規作成（パスワード ${PASSWORD}）: ${createdEmails.join(', ')}`,
    );
  }
  const reused = SEED_USERS.map((u) => u.email).filter(
    (e) => !createdEmails.includes(e),
  );
  if (reused.length > 0) {
    log(`  既存のため再利用（パスワードは従来のまま）: ${reused.join(', ')}`);
  }
  log(`  プロジェクト「${PROJECT_NAME}」/ 文書「${DOCUMENT_NAME}」v1`);
}

async function main(): Promise<void> {
  const dbClient = createDbClient(loadEnv(process.env));
  try {
    await run(dbClient);
  } finally {
    // 成功・失敗いずれでも接続プールを閉じ、プロセスが残らないようにする。
    await dbClient.sql.end();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- CLI スクリプトの失敗ログ
  console.error('シードに失敗しました:', error);
  process.exitCode = 1;
});
