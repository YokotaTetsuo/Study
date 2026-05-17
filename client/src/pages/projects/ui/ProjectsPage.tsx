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
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useCreateProject, useProjects } from '../../../features/project';

export function ProjectsPage(): ReactElement {
  const projects = useProjects();
  const create = useCreateProject();
  const [name, setName] = useState('');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        プロジェクト
      </Typography>

      <Box
        component="form"
        sx={{ mb: 4 }}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { name },
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
            id="project-name"
            label="新しいプロジェクト名"
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

      {projects.isPending && <Typography>読み込み中…</Typography>}
      {projects.isError && (
        <Alert severity="error">プロジェクトを取得できませんでした</Alert>
      )}
      {projects.data !== undefined && (
        <List>
          {projects.data.map((p) => (
            <li key={p.id}>
              <Link
                to="/projects/$projectId/settings"
                params={{ projectId: p.id }}
              >
                {p.name}（メンバー {p.members.length} 名）
              </Link>
            </li>
          ))}
        </List>
      )}
    </Container>
  );
}
