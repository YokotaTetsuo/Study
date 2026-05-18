import {
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">文書</Typography>
        <CreateDocumentButton
          onClick={() => {
            setCreateOpen(true);
          }}
        />
      </Stack>

      {documents.isPending && <Typography>読み込み中…</Typography>}
      {documents.isError && (
        <Alert severity="error">文書を取得できませんでした</Alert>
      )}
      {documents.data !== undefined &&
        (documents.data.length === 0 ? (
          <Typography color="text.secondary">
            文書がありません。「＋ 追加」から作成してください。
          </Typography>
        ) : (
          <List>
            {documents.data.map((d) => (
              <ListItem key={d.id} disablePadding>
                <ListItemButton
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
