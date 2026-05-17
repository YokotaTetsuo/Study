import { z } from 'zod';

/**
 * RFC 7807 Problem Details（`application/problem+json`）の最小コントラクト。
 */
export const problemDetailSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional(),
});

export type ProblemDetail = z.infer<typeof problemDetailSchema>;
