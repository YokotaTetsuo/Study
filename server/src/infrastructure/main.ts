import { serve } from '@hono/node-server';

import { createContainer } from './composition/container';
import { loadEnv } from './env';

const env = loadEnv(process.env);
const { app } = createContainer(env);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  // eslint-disable-next-line no-console -- サーバ起動ログ
  console.log(`server listening on http://localhost:${String(info.port)}`);
});
