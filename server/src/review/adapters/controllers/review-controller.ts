import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  documentResponseSchema,
  problemDetailSchema,
  versionStatusSchema,
} from '@pdf-review/shared';
import type { DocumentResponse } from '@pdf-review/shared';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

import type { SessionStore } from '../../../auth/application/session-store';
import type { DocumentResult } from '../../../document/application/document-result';
import type { ApproveVersionUseCase } from '../../application/approve-version-usecase';
import type { PublishVersionUseCase } from '../../application/publish-version-usecase';
import type { RejectVersionUseCase } from '../../application/reject-version-usecase';
import type { RequestChangesUseCase } from '../../application/request-changes-usecase';
import type { SubmitVersionUseCase } from '../../application/submit-version-usecase';

import { toProblem } from './problem';

const SESSION_COOKIE = 'sid';

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

interface ReviewDeps {
  readonly submitVersion: Pick<SubmitVersionUseCase, 'execute'>;
  readonly approveVersion: Pick<ApproveVersionUseCase, 'execute'>;
  readonly requestChanges: Pick<RequestChangesUseCase, 'execute'>;
  readonly rejectVersion: Pick<RejectVersionUseCase, 'execute'>;
  readonly publishVersion: Pick<PublishVersionUseCase, 'execute'>;
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
      status: versionStatusSchema.parse(v.status),
      uploadedBy: v.uploadedBy,
      createdAt: v.createdAt.toISOString(),
      latestCommentAt: v.latestCommentAt?.toISOString() ?? null,
    })),
  };
}

/* eslint-disable @typescript-eslint/naming-convention --
   HTTP ステータス・ヘッダ名は外部仕様で決まる識別子のため対象外。 */
const problemContent = {
  'application/problem+json': { schema: problemDetailSchema },
};
const errorResponses = {
  400: { description: 'リクエストが不正' as const, content: problemContent },
  401: { description: '認証が必要' as const, content: problemContent },
  403: { description: '権限がない' as const, content: problemContent },
  404: { description: '対象が存在しない' as const, content: problemContent },
  409: { description: '競合' as const, content: problemContent },
  500: { description: 'サーバエラー' as const, content: problemContent },
};
const documentContent = {
  'application/json': { schema: documentResponseSchema },
};
const PROBLEM_HEADERS = {
  'content-type': 'application/problem+json',
} as const;

const versionParam = z.object({
  documentId: z.string(),
  versionNumber: z.string(),
});
const okResponses = {
  ...errorResponses,
  200: { description: '更新後の文書' as const, content: documentContent },
};

// ルート定義はファクトリ関数にすると Hono の型推論が崩れるため、
// document-controller と同じく個別の const として定義する。
const submitRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions/{versionNumber}/submit',
  request: { params: versionParam },
  responses: okResponses,
});
const approveRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions/{versionNumber}/approve',
  request: { params: versionParam },
  responses: okResponses,
});
const requestChangesRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions/{versionNumber}/request-changes',
  request: { params: versionParam },
  responses: okResponses,
});
const rejectRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions/{versionNumber}/reject',
  request: { params: versionParam },
  responses: okResponses,
});
const publishRouteDef = createRoute({
  method: 'post',
  path: '/documents/{documentId}/versions/{versionNumber}/publish',
  request: { params: versionParam },
  responses: okResponses,
});
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC の型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createReviewApp(deps: ReviewDeps) {
  const resolveUserId = async (c: Context): Promise<string | null> => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId === undefined) {
      return null;
    }
    const userId = await deps.sessions.findUserId(sessionId);
    return userId === null ? null : userId.value;
  };

  // ハンドラ本体は型推論保持のため各 openapi 呼び出しにインラインする
  // （.claude/rules/server-hono-routes.md）。共通部はコマンド整形のみ。
  const parseCommand = (
    c: Context,
  ):
    | { ok: true; documentId: string; versionNumber: number }
    | { ok: false } => {
    const documentId = c.req.param('documentId');
    const versionNumber = Number(c.req.param('versionNumber'));
    if (
      documentId === undefined ||
      !Number.isInteger(versionNumber) ||
      versionNumber < 1
    ) {
      return { ok: false };
    }
    return { ok: true, documentId, versionNumber };
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
    .openapi(submitRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const cmd = parseCommand(c);
        if (!cmd.ok) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.submitVersion.execute({
          documentId: cmd.documentId,
          versionNumber: cmd.versionNumber,
          actingUserId,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(approveRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const cmd = parseCommand(c);
        if (!cmd.ok) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.approveVersion.execute({
          documentId: cmd.documentId,
          versionNumber: cmd.versionNumber,
          actingUserId,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(requestChangesRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const cmd = parseCommand(c);
        if (!cmd.ok) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.requestChanges.execute({
          documentId: cmd.documentId,
          versionNumber: cmd.versionNumber,
          actingUserId,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(rejectRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const cmd = parseCommand(c);
        if (!cmd.ok) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.rejectVersion.execute({
          documentId: cmd.documentId,
          versionNumber: cmd.versionNumber,
          actingUserId,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(publishRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const cmd = parseCommand(c);
        if (!cmd.ok) {
          return c.json(BAD_VERSION_BODY, 400, PROBLEM_HEADERS);
        }
        const result = await deps.publishVersion.execute({
          documentId: cmd.documentId,
          versionNumber: cmd.versionNumber,
          actingUserId,
        });
        return c.json(serialize(result), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    });
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */
