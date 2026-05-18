import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Link,
  Outlet,
  useMatches,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import type { ReactElement } from 'react';

import { useLogout, useMe } from '../../../features/auth';
import { isApiError } from '../../../shared/api/api-error';
import { buildBreadcrumbTrail } from '../lib/breadcrumbs';

import { AppBreadcrumbs } from './AppBreadcrumbs';

/**
 * 認証済みページ共通のレイアウト。グローバルヘッダー（タイトル / ログイン中ユーザー /
 * ログアウト）とパンくずを提供し、未認証時はログインへ誘導する。
 * 各ページはこの Outlet 配下に描画されるため、戻り動線が常に確保される。
 */
export function AppShell(): ReactElement {
  const navigate = useNavigate();
  const matches = useMatches();
  const params = useParams({ strict: false });
  const me = useMe();
  const logout = useLogout();

  const unauthenticated =
    me.isError && isApiError(me.error) && me.error.status === 401;

  useEffect(() => {
    if (unauthenticated) {
      void navigate({ to: '/login' });
    }
  }, [unauthenticated, navigate]);

  if (me.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (me.isError) {
    if (unauthenticated) {
      return <Box sx={{ py: 8 }} />;
    }
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">
          サーバーに接続できませんでした。時間をおいて再度お試しください。
        </Alert>
      </Container>
    );
  }

  const leafRouteId = matches.at(-1)?.routeId ?? '/';
  const trailParams: Record<string, string> = {};
  if (params.projectId !== undefined) {
    trailParams.projectId = params.projectId;
  }
  if (params.documentId !== undefined) {
    trailParams.documentId = params.documentId;
  }
  const trail = buildBreadcrumbTrail(leafRouteId, trailParams);

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{ color: 'inherit', textDecoration: 'none' }}
          >
            PDF Review
          </Typography>
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
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box sx={{ mb: 2 }}>
          <AppBreadcrumbs trail={trail} />
        </Box>
        <Outlet />
      </Container>
    </Box>
  );
}
