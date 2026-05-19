import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  addMemberRequestSchema,
  createProjectRequestSchema,
  problemDetailSchema,
  projectResponseSchema,
  renameProjectRequestSchema,
  setMemberRoleRequestSchema,
  updateApprovalPolicyRequestSchema,
} from '@pdf-review/shared';
import type { ProjectResponse } from '@pdf-review/shared';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

import type { SessionStore } from '../../../auth/application/session-store';
import type { AddMemberUseCase } from '../../application/add-member-usecase';
import type { CreateProjectUseCase } from '../../application/create-project-usecase';
import type { DeleteProjectUseCase } from '../../application/delete-project-usecase';
import type { GetProjectUseCase } from '../../application/get-project-usecase';
import type { ListProjectsUseCase } from '../../application/list-projects-usecase';
import type { ProjectResult } from '../../application/project-result';
import type { RenameProjectUseCase } from '../../application/rename-project-usecase';
import type { SetMemberRoleUseCase } from '../../application/set-member-role-usecase';
import type { UpdateApprovalPolicyUseCase } from '../../application/update-approval-policy-usecase';
import type { UserDirectory } from '../../application/user-directory';

import { toProblem } from './problem';
import {
  MemberProfileMissingError,
  ResponseSerializationError,
} from './serialization-errors';

const SESSION_COOKIE = 'sid';

const UNAUTHORIZED_BODY = {
  type: 'about:blank',
  title: 'Unauthorized',
  status: 401,
  detail: '認証が必要です',
} as const;

interface ProjectDeps {
  readonly createProject: Pick<CreateProjectUseCase, 'execute'>;
  readonly listProjects: Pick<ListProjectsUseCase, 'execute'>;
  readonly getProject: Pick<GetProjectUseCase, 'execute'>;
  readonly addMember: Pick<AddMemberUseCase, 'execute'>;
  readonly setMemberRole: Pick<SetMemberRoleUseCase, 'execute'>;
  readonly updateApprovalPolicy: Pick<UpdateApprovalPolicyUseCase, 'execute'>;
  readonly renameProject: Pick<RenameProjectUseCase, 'execute'>;
  readonly deleteProject: Pick<DeleteProjectUseCase, 'execute'>;
  readonly sessions: SessionStore;
  readonly userDirectory: UserDirectory;
}

type ProfileMap = ReadonlyMap<
  string,
  { readonly email: string; readonly displayName: string }
>;

function serializeProject(
  result: ProjectResult,
  profiles: ProfileMap,
): ProjectResponse {
  const members = result.members.map((m) => {
    const profile = profiles.get(m.userId);
    if (profile === undefined) {
      throw new MemberProfileMissingError();
    }
    return {
      userId: m.userId,
      email: profile.email,
      displayName: profile.displayName,
      role: m.role,
    };
  });
  const parsed = projectResponseSchema.safeParse({
    id: result.id,
    name: result.name,
    createdAt: result.createdAt.toISOString(),
    approvalPolicy: {
      requiredApprovals: result.approvalPolicy.requiredApprovals,
      approverRoles: [...result.approvalPolicy.approverRoles],
    },
    members,
  });
  if (!parsed.success) {
    throw new ResponseSerializationError();
  }
  return parsed.data;
}

async function toProjectResponse(
  result: ProjectResult,
  directory: UserDirectory,
): Promise<ProjectResponse> {
  const profiles = await directory.findProfiles(
    result.members.map((m) => m.userId),
  );
  return serializeProject(result, profiles);
}

async function toProjectResponses(
  results: readonly ProjectResult[],
  directory: UserDirectory,
): Promise<ProjectResponse[]> {
  const ids = [
    ...new Set(results.flatMap((r) => r.members.map((m) => m.userId))),
  ];
  const profiles = await directory.findProfiles(ids);
  return results.map((r) => serializeProject(r, profiles));
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
  500: { description: 'サーバエラー' as const, content: problemContent },
};
const projectContent = {
  'application/json': { schema: projectResponseSchema },
};
const projectListContent = {
  'application/json': { schema: z.array(projectResponseSchema) },
};
const PROBLEM_HEADERS = {
  'content-type': 'application/problem+json',
} as const;

const projectIdParam = z.object({ projectId: z.string() });

const listRouteDef = createRoute({
  method: 'get',
  path: '/projects',
  responses: {
    ...errorResponses,
    200: { description: '一覧' as const, content: projectListContent },
  },
});

const getRouteDef = createRoute({
  method: 'get',
  path: '/projects/{projectId}',
  request: { params: projectIdParam },
  responses: {
    ...errorResponses,
    200: { description: '取得成功' as const, content: projectContent },
  },
});

const createRouteDef = createRoute({
  method: 'post',
  path: '/projects',
  request: {
    body: {
      content: { 'application/json': { schema: createProjectRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    201: { description: '作成成功' as const, content: projectContent },
  },
});

const addMemberRouteDef = createRoute({
  method: 'post',
  path: '/projects/{projectId}/members',
  request: {
    params: projectIdParam,
    body: {
      content: { 'application/json': { schema: addMemberRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    200: { description: '更新成功' as const, content: projectContent },
  },
});

const setRoleRouteDef = createRoute({
  method: 'put',
  path: '/projects/{projectId}/members/{userId}',
  request: {
    params: z.object({ projectId: z.string(), userId: z.string() }),
    body: {
      content: { 'application/json': { schema: setMemberRoleRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    200: { description: '更新成功' as const, content: projectContent },
  },
});

const updatePolicyRouteDef = createRoute({
  method: 'put',
  path: '/projects/{projectId}/approval-policy',
  request: {
    params: projectIdParam,
    body: {
      content: {
        'application/json': { schema: updateApprovalPolicyRequestSchema },
      },
    },
  },
  responses: {
    ...errorResponses,
    200: { description: '更新成功' as const, content: projectContent },
  },
});
const renameRouteDef = createRoute({
  method: 'put',
  path: '/projects/{projectId}/name',
  request: {
    params: projectIdParam,
    body: {
      content: { 'application/json': { schema: renameProjectRequestSchema } },
    },
  },
  responses: {
    ...errorResponses,
    200: { description: '更新成功' as const, content: projectContent },
  },
});

const deleteRouteDef = createRoute({
  method: 'delete',
  path: '/projects/{projectId}',
  request: { params: projectIdParam },
  responses: {
    ...errorResponses,
    204: { description: '削除成功' as const },
  },
});
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC の型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createProjectApp(deps: ProjectDeps) {
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
    .openapi(listRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const results = await deps.listProjects.execute({ actingUserId });
        const body = await toProjectResponses(results, deps.userDirectory);
        return c.json(body, 200);
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
        const result = await deps.getProject.execute({
          projectId: c.req.valid('param').projectId,
          actingUserId,
        });
        return c.json(await toProjectResponse(result, deps.userDirectory), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(createRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const result = await deps.createProject.execute({
          name: c.req.valid('json').name,
          ownerUserId: actingUserId,
        });
        return c.json(await toProjectResponse(result, deps.userDirectory), 201);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(addMemberRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const body = c.req.valid('json');
        const result = await deps.addMember.execute({
          projectId: c.req.valid('param').projectId,
          actingUserId,
          email: body.email,
          role: body.role,
        });
        return c.json(await toProjectResponse(result, deps.userDirectory), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(setRoleRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const params = c.req.valid('param');
        const result = await deps.setMemberRole.execute({
          projectId: params.projectId,
          actingUserId,
          userId: params.userId,
          role: c.req.valid('json').role,
        });
        return c.json(await toProjectResponse(result, deps.userDirectory), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(updatePolicyRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        const body = c.req.valid('json');
        const result = await deps.updateApprovalPolicy.execute({
          projectId: c.req.valid('param').projectId,
          actingUserId,
          requiredApprovals: body.requiredApprovals,
          approverRoles: body.approverRoles,
        });
        return c.json(await toProjectResponse(result, deps.userDirectory), 200);
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
        const result = await deps.renameProject.execute({
          projectId: c.req.valid('param').projectId,
          actingUserId,
          name: c.req.valid('json').name,
        });
        return c.json(await toProjectResponse(result, deps.userDirectory), 200);
      } catch (e) {
        const p = toProblem(e);
        return c.json(p.body, p.status, PROBLEM_HEADERS);
      }
    })
    .openapi(deleteRouteDef, async (c) => {
      try {
        const actingUserId = await resolveUserId(c);
        if (actingUserId === null) {
          return c.json(UNAUTHORIZED_BODY, 401, PROBLEM_HEADERS);
        }
        await deps.deleteProject.execute({
          projectId: c.req.valid('param').projectId,
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
