import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { ME_QUERY_KEY, meQueryOptions } from '../../../entities/user';
import { clearPdfCache } from '../../../shared/lib/pdf-cache';
import { loginApi, logoutApi, registerApi } from '../api/auth-api';

export function useMe(): UseQueryResult<UserResponse> {
  return useQuery(meQueryOptions);
}

export function useRegister(): UseMutationResult<
  UserResponse,
  Error,
  RegisterRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerApi,
    onSuccess: (user) => {
      // 認証主体が変わるため、前ユーザーの PDF キャッシュを破棄する。
      clearPdfCache();
      qc.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useLogin(): UseMutationResult<
  UserResponse,
  Error,
  LoginRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (user) => {
      // 認証主体が変わるため、前ユーザーの PDF キャッシュを破棄する。
      clearPdfCache();
      qc.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // 別ユーザーへ流用されないよう PDF キャッシュを破棄する。
      clearPdfCache();
      // 認証状態を未取得へ戻す（null を入れず型不整合を避ける）。
      qc.removeQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
