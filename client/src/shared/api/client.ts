import type { AppType } from '@pdf-review/server';
import { hc } from 'hono/client';

const envBase: unknown = import.meta.env.VITE_API_BASE;
const baseUrl = typeof envBase === 'string' ? envBase : 'http://localhost:3000';

/**
 * Hono RPC クライアント。server の AppType（型のみ）から
 * エンドツーエンドの型安全性を得る。Cookie 認証のため credentials を付与。
 */
export const apiClient = hc<AppType>(baseUrl, {
  init: { credentials: 'include' },
});
