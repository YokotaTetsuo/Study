import { userResponseSchema } from '@pdf-review/shared';
import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '@pdf-review/shared';

import { apiClient } from '../../../shared/api/client';

async function unwrap(
  res: { status: number; json: () => Promise<unknown> },
  okStatus: number,
): Promise<UserResponse> {
  if (res.status !== okStatus) {
    throw new Error(`request failed (${String(res.status)})`);
  }
  return userResponseSchema.parse(await res.json());
}

export async function registerApi(
  input: RegisterRequest,
): Promise<UserResponse> {
  return unwrap(await apiClient.auth.register.$post({ json: input }), 201);
}

export async function loginApi(input: LoginRequest): Promise<UserResponse> {
  return unwrap(await apiClient.auth.login.$post({ json: input }), 200);
}

export async function logoutApi(): Promise<void> {
  await apiClient.auth.logout.$post();
}
