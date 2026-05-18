import { Button } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { crumbLabel } from '../lib/breadcrumbs';
import type { Crumb } from '../lib/breadcrumbs';

interface Props {
  /** 1 つ上の階層（パンくずの親）。最上位（親が無い）なら null。 */
  readonly parent: Crumb | null;
}

/**
 * 1 つ上の階層へ戻るボタン。ブラウザ履歴ではなく、パンくず上の
 * 親階層へ遷移する。親が無い（最上位ページ）の場合は描画しない。
 */
export function BackButton({ parent }: Props): ReactElement | null {
  const navigate = useNavigate();

  if (parent === null) {
    return null;
  }

  const go = (): void => {
    switch (parent.kind) {
      case 'home':
        void navigate({ to: '/' });
        return;
      case 'projects':
        void navigate({ to: '/projects' });
        return;
      case 'project-documents':
        void navigate({
          to: '/projects/$projectId/documents',
          params: { projectId: parent.projectId },
        });
        return;
      case 'document-detail':
        void navigate({
          to: '/projects/$projectId/documents/$documentId',
          params: {
            projectId: parent.projectId,
            documentId: parent.documentId,
          },
        });
        return;
      case 'version-viewer':
        void navigate({
          to: '/projects/$projectId/documents/$documentId/versions/$versionNumber',
          params: {
            projectId: parent.projectId,
            documentId: parent.documentId,
            versionNumber: parent.versionNumber,
          },
        });
        return;
      case 'project-settings':
        void navigate({
          to: '/projects/$projectId/settings',
          params: { projectId: parent.projectId },
        });
        return;
      default: {
        // 網羅性は Crumb の判別共用体で型的に保証される。
        const _exhaustive: never = parent;
        return _exhaustive;
      }
    }
  };

  return (
    <Button size="small" variant="outlined" onClick={go}>
      ← {crumbLabel(parent.kind)}へ戻る
    </Button>
  );
}
