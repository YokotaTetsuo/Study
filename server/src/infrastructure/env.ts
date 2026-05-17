import { z } from 'zod';

/**
 * プロセス環境変数を検証して取り出す。`.env.example` 参照。
 */
/* eslint-disable @typescript-eslint/naming-convention --
   環境変数名は UPPER_SNAKE_CASE が OS/12-factor の慣習のため対象外。 */
const tcpPort = z.coerce.number().int().min(1).max(65535);

const envSchema = z.object({
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: tcpPort.default(5432),
  DB_USER: z.string().min(1).default('pdfreview'),
  DB_PASSWORD: z.string().min(1).default('pdfreview'),
  DB_NAME: z.string().min(1).default('pdfreview'),
  PORT: tcpPort.default(3000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // ブラウザ Origin と一致させるため URL を origin へ正規化
  // （path/末尾スラッシュ/クエリを除去）。
  CLIENT_ORIGIN: z
    .string()
    .url()
    .transform((v) => new URL(v).origin)
    .default('http://localhost:5173'),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}
