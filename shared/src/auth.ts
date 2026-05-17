import { z } from 'zod';

/**
 * 認証の API コントラクト（client/server 共有）。
 * shared はシリアライズ後の境界表現のため日時は ISO 文字列。
 */

export const registerRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(64),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** 認証済みユーザーの公開表現（パスワードは含めない）。 */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
