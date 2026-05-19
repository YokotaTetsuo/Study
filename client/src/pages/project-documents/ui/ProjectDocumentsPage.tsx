import {
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import {
  CreateDocumentButton,
  CreateDocumentDialog,
  useDocuments,
} from '../../../features/document';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function ProjectDocumentsPage(): ReactElement {
  const { projectId } = useParams({
    from: '/projects/$projectId/documents',
  });
  const documents = useDocuments(projectId);
  const navigate = useNavigate();
  // 作成ダイアログの open state は page が所有する（client-fsd Portal 規約）。
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="文書"
        subtitle="このプロジェクトの文書一覧"
        actions={
          <CreateDocumentButton
            onClick={() => {
              setCreateOpen(true);
            }}
          />
        }
      />

      {documents.isPending && <Typography>読み込み中…</Typography>}
      {documents.isError && (
        <Alert severity="error">文書を取得できませんでした</Alert>
      )}
      {documents.data !== undefined &&
        (documents.data.length === 0 ? (
          <SectionCard>
            <Typography color="text.secondary">
              文書がありません。「＋ 追加」から作成してください。
            </Typography>
          </SectionCard>
        ) : (
          <SectionCard dense>
            <List disablePadding>
              {documents.data.map((d) => (
                <ListItem key={d.id} disablePadding>
                  <ListItemButton
                    sx={{ borderRadius: 1, py: 1.5 }}
                    onClick={() => {
                      void navigate({
                        to: '/projects/$projectId/documents/$documentId',
                        params: { projectId, documentId: d.id },
                      });
                    }}
                  >
                    <ListItemText
                      primary={d.name}
                      slotProps={{ primary: { variant: 'h6' } }}
                      secondary={`版 ${String(d.versions.length)}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </SectionCard>
        ))}

      <CreateDocumentDialog
        projectId={projectId}
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
      />
    </>
  );
}
