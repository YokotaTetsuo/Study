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
import { BackButton } from './BackButton';

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
  if (params.versionNumber !== undefined) {
    trailParams.versionNumber = params.versionNumber;
  }
  const trail = buildBreadcrumbTrail(leafRouteId, trailParams);
  // 「戻る」は履歴ではなくパンくず上の親階層（末尾の 1 つ手前）。
  // 親が無い（最上位 = trail が 1 要素）なら null。
  const parentCrumb = trail[trail.length - 2] ?? null;
  // PDF を主役にするページ（版プレビュー専用 / 文書詳細）は横方向の
  // レイアウトを活かすため幅制約を外し、画面いっぱいに広げる。
  const wide =
    leafRouteId ===
      '/projects/$projectId/documents/$documentId/versions/$versionNumber' ||
    leafRouteId === '/projects/$projectId/documents/$documentId';

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            PDF Review
          </Typography>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {me.data.displayName}（{me.data.email}）
            </Typography>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
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
      <Container maxWidth={wide ? 'xl' : 'md'} sx={{ py: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <BackButton parent={parentCrumb} />
          <AppBreadcrumbs trail={trail} />
        </Box>
        <Outlet />
      </Container>
    </Box>
  );
}
