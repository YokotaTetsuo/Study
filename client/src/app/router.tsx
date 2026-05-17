import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';

import { DocumentDetailPage } from '../pages/document-detail';
import { HomePage } from '../pages/home';
import { LoginPage } from '../pages/login';
import { ProjectDocumentsPage } from '../pages/project-documents';
import { ProjectSettingsPage } from '../pages/project-settings';
import { ProjectsPage } from '../pages/projects';
import { RegisterPage } from '../pages/register';

const rootRoute = createRootRoute({ component: Outlet });

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
