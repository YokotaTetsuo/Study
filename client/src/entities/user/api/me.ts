import { userResponseSchema } from '@pdf-review/shared';
import type { UserResponse } from '@pdf-review/shared';
import { queryOptions } from '@tanstack/react-query';

import { ApiError } from '../../../shared/api/api-error';
import { apiClient } from '../../../shared/api/client';

export const ME_QUERY_KEY = ['me'] as const;

async function fetchMe(): Promise<UserResponse> {
  const res = await apiClient.auth.me.$get();
  if (res.status !== 200) {
    // 401=未認証 / それ以外=障害。呼び出し側が status で出し分ける。
    throw new ApiError(res.status);
  }
  return userResponseSchema.parse(await res.json());
}

export const meQueryOptions = queryOptions({
  queryKey: ME_QUERY_KEY,
  queryFn: fetchMe,
  retry: false,
});
