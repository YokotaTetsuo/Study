import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  addCommentRequestSchema,
  commentListResponseSchema,
  commentSchema,
  createDocumentRequestSchema,
  documentResponseSchema,
  problemDetailSchema,
  renameDocumentRequestSchema,
  versionStatusSchema,
} from '@pdf-review/shared';
import type { Comment, DocumentResponse } from '@pdf-review/shared';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie } from 'hono/cookie';

import type { SessionStore } from '../../../auth/application/session-store';
import type { AddCommentUseCase } from '../../application/add-comment-usecase';
import type { CommentResult } from '../../application/comment-result';
import type { CreateDocumentUseCase } from '../../application/create-document-usecase';
import type { DeleteCommentUseCase } from '../../application/delete-comment-usecase';
import type { DocumentResult } from '../../application/document-result';
import type { GetDocumentUseCase } from '../../application/get-document-usecase';
import type { GetVersionFileUseCase } from '../../application/get-version-file-usecase';
import type { ListCommentsUseCase } from '../../application/list-comments-usecase';
import type { ListDocumentsUseCase } from '../../application/list-documents-usecase';
import type { RenameDocumentUseCase } from '../../application/rename-document-usecase';
import type { UploadVersionUseCase } from '../../application/upload-version-usecase';

import { toProblem } from './problem';

const SESSION_COOKIE = 'sid';
/** 版ファイルの上限。MVP では 50 MiB。 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const PDF_CONTENT_TYPE = 'application/pdf';

const UNAUTHORIZED_BODY = {
  type: 'about:blank',
  title: 'Unauthorized',
  status: 401,
  detail: '認証が必要です',
} as const;

const BAD_VERSION_BODY = {
  type: 'about:blank',
  title: 'Bad Request',
  status: 400,
  detail: 'versionNumber が不正です',
} as const;

/**
 * パス上の versionNumber を正の整数へ。先頭ゼロ・指数表記・安全整数
 * 超過を弾き（"1e2" や 9007199254740993 等の誤解釈防止）、不正なら null。
 */
function parseVersionNumber(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) {
    return null;
  }
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

interface DocumentDeps {
  readonly createDocument: Pick<CreateDocumentUseCase, 'execute'>;
  readonly listDocuments: Pick<ListDocumentsUseCase, 'execute'>;
  readonly getDocument: Pick<GetDocumentUseCase, 'execute'>;
  readonly renameDocument: Pick<RenameDocumentUseCase, 'execute'>;
  readonly uploadVersion: Pick<UploadVersionUseCase, 'execute'>;
  readonly getVersionFile: Pick<GetVersionFileUseCase, 'execute'>;
  readonly addComment: Pick<AddCommentUseCase, 'execute'>;
  readonly listComments: Pick<ListCommentsUseCase, 'execute'>;
  readonly deleteComment: Pick<DeleteCommentUseCase, 'execute'>;
  readonly sessions: SessionStore;
}

function serialize(result: DocumentResult): DocumentResponse {
  return {
    id: result.id,
    projectId: result.projectId,
    name: result.name,
    createdAt: result.createdAt.toISOString(),
    officialVersionNumber: result.officialVersionNumber,
    versions: result.versions.map((v) => ({
      versionNumber: v.versionNumber,
      // 契約スキーマで版状態の型を確定させる（不正値は parse で弾く）。
      status: versionStatusSchema.parse(v.status),
      uploadedBy: v.uploadedBy,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

function serializeComment(result: CommentResult): Comment {
  return {
    id: result.id,
    authorId: result.authorId,
    content: result.content,
    createdAt: result.createdAt.toISOString(),
  };
}

/* eslint-disable @typescript-eslint/naming-convention --
   HTTP ステータス・MIME・ヘッダ名は外部仕様で決まる識別子のため対象外。 */
const problemContent = {
  'application/problem+json': { schema: problemDetailSchema },
};
const errorResponses = {
  400: { description: 'リクエストが不正' as const, content: problemContent },
  401: { description: '認証が必要' as const, content: problemContent },
  403: { description: '権限がない' as const, content: problemContent },
  404: { description: '対象が存在しない' as const, content: problemContent },
  409: { description: '競合' as const, content: problemContent },
  413: { description: 'ペイロード過大' as const, content: problemContent },
  415: { description: '非対応の形式' as const, content: problemContent },
  500: { description: 'サーバエラー' as const, content: problemContent },
};
const documentContent = {
  'application/json': { schema: documentResponseSchema },
};
const documentListContent = {
  'application/json': { schema: z.array(documentResponseSchema) },
};
const PROBLEM_HEADERS = {
  'content-type': 'application/problem+json',
} as const;
const PDF_HEADERS = { 'content-type': PDF_CONTENT_TYPE } as const;

const projectIdParam = z.object({ projectId: z.string() });
const documentIdParam = z.object({ documentId: z.string() });

const createRouteDef = createRoute({
  method: 'post',
  path: '/documents',
  request: {
    body: {
      content: { 'application/json': { schema: createDocumentRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    201: { description: '作成成功' as const, content: documentContent },
  },
});

const listRouteDef = createRoute({
  method: 'get',
  path: '/projects/{projectId}/documents',
  request: { params: projectIdParam },
  responses: {
    ...errorResponses,
    200: { description: '一覧' as const, content: documentListContent },
  },
});

const getRouteDef = createRoute({
  method: 'get',
  path: '/documents/{documentId}',
  request: { params: documentIdParam },
  responses: {
    ...errorResponses,
    200: { description: '取得成功' as const, content: documentContent },
  },
});

const renameRouteDef = createRoute({
  method: 'put',
  path: '/documents/{documentId}',
  request: {
    params: documentIdParam,
    body: {
      content: { 'application/json': { schema: renameDocumentRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    200: { description: '変更成功' as const, content: documentContent },
  },
});

const uploadBodySchema = z.object({
  file: z.any().openapi({ type: 'string', format: 'binary' as const }),
});

const uploadRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions',
  // multipart をパースする前にボディサイズ上限を強制する（メモリ保護）。
  middleware: [
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: (c) =>
        c.json(
          {
            type: 'about:blank',
            title: 'Payload Too Large',
            status: 413,
            detail: 'ファイルサイズが上限を超えています',
          },
          413,
          PROBLEM_HEADERS,
        ),
    }),
  ] as const,
  request: {
    params: documentIdParam,
    body: {
      content: { 'multipart/form-data': { schema: uploadBodySchema } },
      description: `PDF（最大 ${String(MAX_UPLOAD_BYTES)} バイト）を file フィールドで送る`,
    },
  },
  responses: {
    ...errorResponses,
    201: { description: 'アップロード成功' as const, content: documentContent },
  },
});

const downloadRouteDef = createRoute({
  method: 'get',
  path: '/documents/{documentId}/versions/{versionNumber}/file',
  request: {
    params: z.object({ documentId: z.string(), versionNumber: z.string() }),
  },
  responses: {
    ...errorResponses,
    200: {
      description: 'PDF バイト列' as const,
      content: {
        'application/pdf': {
          schema: z.string().openapi({ type: 'string', format: 'binary' }),
        },
      },
    },
  },
});
const commentContent = {
  'application/json': { schema: commentSchema },
};
const commentListContent = {
  'application/json': { schema: commentListResponseSchema },
};
const versionParam = z.object({
  documentId: z.string(),
  versionNumber: z.string(),
});

const addCommentRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions/{versionNumber}/comments',
  request: {
    params: versionParam,
    body: {
      content: { 'application/json': { schema: addCommentRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    201: { description: 'コメント追加成功' as const, content: commentContent },
  },
});

const listCommentsRouteDef = createRoute({
  method: 'get',
  path: '/documents/{documentId}/versions/{versionNumber}/comments',
  request: { params: versionParam },
  responses: {
    ...errorResponses,
    200: { description: 'コメント一覧' as const, content: commentListContent },
  },
});

const deleteCommentRouteDef = createRoute({
  method: 'delete',
  path: '/documents/{documentId}/versions/{versionNumber}/comments/{commentId}',
  request: {
    params: z.object({
      documentId: z.string(),
      versionNumber: z.string(),
      commentId: z.string(),
    }),
  },
  responses: {
    ...errorResponses,
    204: { description: '削除成功' as const },
  },
});
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC の型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createDocumentApp(deps: DocumentDeps) {
  const resolveUserId = async (c: Context): Promise<string | null> => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId === undefined) {
      return null;
    }
    const userId = await deps.sessions.findUserId(sessionId);
    return userId === null ? null : userId.value;
  };

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
    .openapi(createRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const body = c.req.valid('json');
        const result = await deps.createDocument.execute({
          projectId: body.projectId,
          name: body.name,
          actingUserId,
        });
        return c.json(serialize(result), 201);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(listRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const results = await deps.listDocuments.execute({
          projectId: c.req.valid('param').projectId,
          actingUserId,
        });
        return c.json(results.map(serialize), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(getRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const result = await deps.getDocument.execute({
          documentId: c.req.valid('param').documentId,
          actingUserId,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(renameRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const result = await deps.renameDocument.execute({
          documentId: c.req.valid('param').documentId,
          actingUserId,
          name: c.req.valid('json').name,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(uploadRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const form = await c.req.parseBody();
        const file = form.file;
        if (!(file instanceof File)) {
          return c.json(
            {
              type: 'about:blank',
              title: 'Bad Request',
              status: 400,
              detail: 'file フィールド（PDF）が必要です',
            },
            400,
            PROBLEM_HEADERS,
          );
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          return c.json(
            {
              type: 'about:blank',
              title: 'Payload Too Large',
              status: 413,
              detail: 'ファイルサイズが上限を超えています',
            },
            413,
            PROBLEM_HEADERS,
          );
        }
        // バイト列を読む前に Content-Type を弾き、415 ケースの I/O を避ける。
        if (file.type.trim().toLowerCase() !== PDF_CONTENT_TYPE) {
          return c.json(
            {
              type: 'about:blank',
              title: 'Unsupported Media Type',
              status: 415,
              detail: 'PDF のみアップロードできます',
            },
            415,
            PROBLEM_HEADERS,
          );
        }
        const data = new Uint8Array(await file.arrayBuffer());
        const result = await deps.uploadVersion.execute({
          documentId: c.req.valid('param').documentId,
          actingUserId,
          data,
          contentType: file.type,
        });
        return c.json(serialize(result), 201);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(downloadRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const params = c.req.valid('param');
        const versionNumber = parseVersionNumber(params.versionNumber);
        if (versionNumber === null) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.getVersionFile.execute({
          documentId: params.documentId,
          versionNumber,
          actingUserId,
        });
        // コピーせずに返す（大きい PDF でメモリを倍に使わない）。
        // 単一チャンクの ReadableStream にして c.body の型と整合させる。
        const stream = new ReadableStream<Uint8Array>({
          start(controller): void {
            controller.enqueue(result.data);
            controller.close();
          },
        });
        return c.body(stream, 200, PDF_HEADERS);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(addCommentRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const params = c.req.valid('param');
        const versionNumber = parseVersionNumber(params.versionNumber);
        if (versionNumber === null) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.addComment.execute({
          documentId: params.documentId,
          versionNumber,
          actingUserId,
          content: c.req.valid('json').content,
        });
        return c.json(serializeComment(result), 201);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(listCommentsRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const params = c.req.valid('param');
        const versionNumber = parseVersionNumber(params.versionNumber);
        if (versionNumber === null) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const results = await deps.listComments.execute({
          documentId: params.documentId,
          versionNumber,
          actingUserId,
        });
        return c.json(results.map(serializeComment), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(deleteCommentRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const params = c.req.valid('param');
        const versionNumber = parseVersionNumber(params.versionNumber);
        if (versionNumber === null) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        await deps.deleteComment.execute({
          documentId: params.documentId,
          versionNumber,
          commentId: params.commentId,
          actingUserId,
        });
        return c.body(null, 204);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    });
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */
