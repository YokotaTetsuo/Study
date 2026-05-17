import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Toolbar,
  Typography,
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import type { ReactElement } from 'react';

import { useLogout, useMe } from '../../../features/auth';

export function HomePage(): ReactElement {
  const navigate = useNavigate();
  const me = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (me.isError) {
      void navigate({ to: '/login' });
    }
  }, [me.isError, navigate]);

  if (me.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (me.data === undefined) {
    return <Box sx={{ py: 8 }} />;
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">PDF Review</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography>ログイン中: {me.data.displayName}</Typography>
            <Button
              color="inherit"
              variant="outlined"
              disabled={logout.isPending}
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => {
                    void navigate({ to: '/login' });
                  },
                });
              }}
            >
              ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography>
          ようこそ、{me.data.displayName} さん（{me.data.email}）。
        </Typography>
      </Container>
    </Box>
  );
}
