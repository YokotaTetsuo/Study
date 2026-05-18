import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { DocumentDetailPage } from '../pages/document-detail';
import { HomePage } from '../pages/home';
import { LoginPage } from '../pages/login';
import { ProjectDocumentsPage } from '../pages/project-documents';
import { ProjectSettingsPage } from '../pages/project-settings';
import { ProjectsPage } from '../pages/projects';
import { RegisterPage } from '../pages/register';
import { AppShell } from '../widgets/app-layout';

// 認証画面はヘッダー / パンくず無し。それ以外は共通レイアウト（AppShell）で包む。
// pathless layout route は id が fullPath を汚すため、フラット構成のまま
// root で出し分ける（既存の `to` / `from` パスを変更せずに済む）。
const AUTH_PATHS = new Set(['/login', '/register']);

function RootLayout(): ReactElement {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  if (AUTH_PATHS.has(pathname)) {
    return <Outlet />;
  }
  return <AppShell />;
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsPage,
});

const projectSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/settings',
  component: ProjectSettingsPage,
});

const projectDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/documents',
  component: ProjectDocumentsPage,
});

const documentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/documents/$documentId',
  component: DocumentDetailPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  projectsRoute,
  projectSettingsRoute,
  projectDocumentsRoute,
  documentDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
