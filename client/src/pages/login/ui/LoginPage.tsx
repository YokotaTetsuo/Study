import { Container, Link as MuiLink, Typography } from '@mui/material';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { LoginForm, useLogin } from '../../../features/auth';
import { isApiError } from '../../../shared/api/api-error';

function loginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) {
      return 'メールアドレスまたはパスワードが正しくありません';
    }
    if (error.status === 400) {
      return '入力内容を確認してください（パスワードは8文字以上）';
    }
  }
  return '通信エラーが発生しました。時間をおいて再度お試しください';
}

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const login = useLogin();

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" gutterBottom>
        ログイン
      </Typography>
      <LoginForm
        pending={login.isPending}
        errorMessage={
          login.isError ? loginErrorMessage(login.error) : undefined
        }
        onSubmit={(values) => {
          login.mutate(values, {
            onSuccess: () => {
              void navigate({ to: '/' });
            },
          });
        }}
      />
      <Typography sx={{ mt: 2 }}>
        アカウントが無い場合は{' '}
        <MuiLink component={Link} to="/register">
          登録
        </MuiLink>
      </Typography>
    </Container>
  );
}
