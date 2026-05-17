import type { UserResponse } from '@pdf-review/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '../../../shared/api/client';

export const ME_QUERY_KEY = ['me'] as const;

async function fetchMe(): Promise<UserResponse> {
  const res = await apiClient.auth.me.$get();
  if (res.status !== 200) {
    throw new Error('unauthenticated');
  }
  return res.json();
}

export const meQueryOptions = queryOptions({
  queryKey: ME_QUERY_KEY,
  queryFn: fetchMe,
  retry: false,
});
