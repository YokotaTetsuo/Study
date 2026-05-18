import { Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { Link } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';

import { crumbLabel } from '../lib/breadcrumbs';
import type { Crumb } from '../lib/breadcrumbs';

interface Props {
  readonly trail: readonly Crumb[];
}

// パラメータ付きルートは TanStack Link を直接使う（MuiLink へ component 注入すると
// 型付き params が失われるため。既存ページ実装と同じ方針）。
const paramLinkStyle = { color: 'inherit' } as const;

function CrumbLink({ crumb }: { crumb: Crumb }): ReactNode {
  const label = crumbLabel(crumb.kind);
  switch (crumb.kind) {
    case 'home':
      return (
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          {label}
        </MuiLink>
      );
    case 'projects':
      return (
        <MuiLink
          component={Link}
          to="/projects"
          underline="hover"
          color="inherit"
        >
          {label}
        </MuiLink>
      );
    case 'project-documents':
      return (
        <Link
          to="/projects/$projectId/documents"
          params={{ projectId: crumb.projectId }}
          style={paramLinkStyle}
        >
          {label}
        </Link>
      );
    case 'project-settings':
      return (
        <Link
          to="/projects/$projectId/settings"
          params={{ projectId: crumb.projectId }}
          style={paramLinkStyle}
        >
          {label}
        </Link>
      );
    case 'document-detail':
      return (
        <Link
          to="/projects/$projectId/documents/$documentId"
          params={{
            projectId: crumb.projectId,
            documentId: crumb.documentId,
          }}
          style={paramLinkStyle}
        >
          {label}
        </Link>
      );
    case 'version-viewer':
      return (
        <Link
          to="/projects/$projectId/documents/$documentId/versions/$versionNumber"
          params={{
            projectId: crumb.projectId,
            documentId: crumb.documentId,
            versionNumber: crumb.versionNumber,
          }}
          style={paramLinkStyle}
        >
          {label}
        </Link>
      );
    default: {
      // 網羅性は Crumb の判別共用体で型的に保証される。
      const _exhaustive: never = crumb;
      return _exhaustive;
    }
  }
}

/**
 * パンくず表示。末尾（現在ページ）はリンクにせず、それ以外は上位階層への
 * 戻り動線としてリンク化する。
 */
export function AppBreadcrumbs({ trail }: Props): ReactElement {
  return (
    <Breadcrumbs aria-label="パンくず">
      {trail.map((crumb, index) => {
        const isCurrent = index === trail.length - 1;
        const key = `${crumb.kind}:${String(index)}`;
        if (isCurrent) {
          return (
            <Typography key={key} color="text.primary">
              {crumbLabel(crumb.kind)}
            </Typography>
          );
        }
        return <CrumbLink key={key} crumb={crumb} />;
      })}
    </Breadcrumbs>
  );
}
