import { Container, Link as MuiLink, Typography } from '@mui/material';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { RegisterForm, useRegister } from '../../../features/auth';

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
          register.isError
            ? '登録に失敗しました（メール重複・入力不備など）'
            : undefined
        }
        onSubmit={(values) => {
          register.mutate(values, {
            onSuccess: () => {
              void navigate({ to: '/' });
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
