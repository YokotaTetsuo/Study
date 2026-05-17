/**
 * API 呼び出しの失敗を HTTP ステータス付きで表現する。
 * UI 側で 401/409/400 と通信障害を出し分けるために用いる。
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API request failed (${String(status)})`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
