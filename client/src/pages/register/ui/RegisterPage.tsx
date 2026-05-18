import { Container, Link as MuiLink, Typography } from '@mui/material';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { RegisterForm, useRegister } from '../../../features/auth';
import { isApiError } from '../../../shared/api/api-error';

function registerErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 409) {
      return 'このメールアドレスは既に使用されています';
    }
    if (error.status === 400) {
      return '入力内容を確認してください（パスワードは8文字以上）';
    }
  }
  return '通信エラーが発生しました。時間をおいて再度お試しください';
}

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const register = useRegister();

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" gutterBottom>
        アカウント登録
      </Typography>
      <RegisterForm
        pending={register.isPending}
        errorMessage={
          register.isError ? registerErrorMessage(register.error) : undefined
        }
        onSubmit={(values) => {
          register.mutate(values, {
            onSuccess: () => {
              // 認証画面を履歴に残さない（戻るボタンで /register に戻れない）。
              void navigate({ to: '/', replace: true });
            },
          });
        }}
      />
      <Typography sx={{ mt: 2 }}>
        既にアカウントがある場合は{' '}
        <MuiLink component={Link} to="/login">
          ログイン
        </MuiLink>
      </Typography>
    </Container>
  );
}
