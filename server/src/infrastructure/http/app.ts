import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

import { createHealthApp } from '../../health/adapters/controllers/health-controller';
import type { GetHealthUseCase } from '../../health/application/get-health-usecase';

/* eslint-disable @typescript-eslint/explicit-function-return-type --
   Hono RPC のエンドツーエンド型推論を保持するため戻り値型を明示しない
   （.claude/rules/server-hono-routes.md）。 */
export function createApp(deps: { getHealth: GetHealthUseCase }) {
  const health = createHealthApp({ getHealth: deps.getHealth });
  return new OpenAPIHono().use('*', cors()).route('/', health);
}
/* eslint-enable @typescript-eslint/explicit-function-return-type */

export type AppType = ReturnType<typeof createApp>;
