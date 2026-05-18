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
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useCreateProject, useProjects } from '../../../features/project';

export function ProjectsPage(): ReactElement {
  const projects = useProjects();
  const create = useCreateProject();
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
        <Typography variant="h5">プロジェクト</Typography>
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
              { name },
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
              id="project-name"
              label="新しいプロジェクト名"
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

      {projects.isPending && <Typography>読み込み中…</Typography>}
      {projects.isError && (
        <Alert severity="error">プロジェクトを取得できませんでした</Alert>
      )}
      {projects.data !== undefined &&
        (projects.data.length === 0 ? (
          <Typography color="text.secondary">
            プロジェクトがありません。「＋ 追加」から作成してください。
          </Typography>
        ) : (
          <List>
            {projects.data.map((p) => (
              <ListItem
                key={p.id}
                disablePadding
                secondaryAction={
                  <Button
                    size="small"
                    onClick={() => {
                      void navigate({
                        to: '/projects/$projectId/settings',
                        params: { projectId: p.id },
                      });
                    }}
                  >
                    設定
                  </Button>
                }
              >
                <ListItemButton
                  onClick={() => {
                    void navigate({
                      to: '/projects/$projectId/documents',
                      params: { projectId: p.id },
                    });
                  }}
                >
                  <ListItemText
                    primary={p.name}
                    slotProps={{ primary: { variant: 'h6' } }}
                    secondary={`メンバー ${String(p.members.length)} 名`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ))}
    </>
  );
}
