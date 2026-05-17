import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { healthResponseSchema } from '@pdf-review/shared';
import type { HealthResponse } from '@pdf-review/shared';

import type { GetHealthUseCase } from '../../application/get-health-usecase';
import type { HealthResult } from '../../application/health-result';

function toResponse(result: HealthResult): HealthResponse {
  return {
    status: result.status,
    db: result.db,
    checkedAt: result.checkedAt.toISOString(),
  };
}

/* eslint-disable @typescript-eslint/naming-convention --
   OpenAPI 仕様で決まる外部識別子（HTTP ステータスコード・MIME タイプ）のため
   camelCase 規約の対象外。 */
const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      description: 'ヘルスチェック' as const,
      content: { 'application/json': { schema: healthResponseSchema } },
    },
  },
});
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono のメソッドチェーン/ハンドラの型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createHealthApp(deps: { getHealth: GetHealthUseCase }) {
  return new OpenAPIHono().openapi(healthRoute, async (c) => {
    const result = await deps.getHealth.execute();
    return c.json(toResponse(result), 200);
  });
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */
