import { Container, Link as MuiLink, Typography } from '@mui/material';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { LoginForm, useLogin } from '../../../features/auth';

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
          login.isError
            ? 'メールアドレスまたはパスワードが正しくありません'
            : undefined
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
