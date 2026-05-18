import {
  Alert,
  Box,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useCreateDocument, useDocuments } from '../../../features/document';

export function ProjectDocumentsPage(): ReactElement {
  const { projectId } = useParams({
    from: '/projects/$projectId/documents',
  });
  const documents = useDocuments(projectId);
  const create = useCreateDocument();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">文書</Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setShowForm((v) => !v);
          }}
        >
          ＋ 追加
        </Button>
      </Stack>

      <Collapse in={showForm} unmountOnExit>
        <Box
          component="form"
          sx={{ mb: 3 }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { projectId, name },
              {
                onSuccess: () => {
                  setName('');
                  setShowForm(false);
                },
              },
            );
          }}
        >
          <Stack direction="row" spacing={2}>
            <TextField
              id="document-name"
              label="新しい文書名"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              作成
            </Button>
          </Stack>
          {create.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              作成に失敗しました
            </Alert>
          )}
        </Box>
      </Collapse>

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
    </>
  );
}
