import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { ME_QUERY_KEY, meQueryOptions } from '../../../entities/user';
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
      qc.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      qc.setQueryData(ME_QUERY_KEY, null);
      void qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
