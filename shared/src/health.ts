import { z } from 'zod';

/**
 * health エンドポイントの API コントラクト（client/server 共有）。
 */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  db: z.enum(['up', 'down']),
  checkedAt: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
