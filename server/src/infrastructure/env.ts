import { z } from 'zod';

/**
 * プロセス環境変数を検証して取り出す。`.env.example` 参照。
 */
/* eslint-disable @typescript-eslint/naming-convention --
   環境変数名は UPPER_SNAKE_CASE が OS/12-factor の慣習のため対象外。 */
const envSchema = z.object({
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('pdfreview'),
  DB_PASSWORD: z.string().default('pdfreview'),
  DB_NAME: z.string().default('pdfreview'),
  PORT: z.coerce.number().default(3000),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}
