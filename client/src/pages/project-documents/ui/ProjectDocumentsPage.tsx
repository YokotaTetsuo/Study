import {
  Alert,
  Box,
  Button,
  Container,
  List,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useCreateDocument, useDocuments } from '../../../features/document';

export function ProjectDocumentsPage(): ReactElement {
  const { projectId } = useParams({
    from: '/projects/$projectId/documents',
  });
  const documents = useDocuments(projectId);
  const create = useCreateDocument();
  const [name, setName] = useState('');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        文書
      </Typography>

      <Box
        component="form"
        sx={{ mb: 4 }}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { projectId, name },
            {
              onSuccess: () => {
                setName('');
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
          <Button type="submit" variant="contained" disabled={create.isPending}>
            作成
          </Button>
        </Stack>
        {create.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            作成に失敗しました
          </Alert>
        )}
      </Box>

      {documents.isPending && <Typography>読み込み中…</Typography>}
      {documents.isError && (
        <Alert severity="error">文書を取得できませんでした</Alert>
      )}
      {documents.data !== undefined && (
        <List>
          {documents.data.map((d) => (
            <li key={d.id}>
              <Link
                to="/projects/$projectId/documents/$documentId"
                params={{ projectId, documentId: d.id }}
              >
                {d.name}（版 {d.versions.length}）
              </Link>
            </li>
          ))}
        </List>
      )}
    </Container>
  );
}
