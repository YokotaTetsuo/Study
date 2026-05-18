import {
  Alert,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import {
  CreateProjectButton,
  CreateProjectDialog,
  useProjects,
} from '../../../features/project';

export function ProjectsPage(): ReactElement {
  const projects = useProjects();
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
        <Typography variant="h5">プロジェクト</Typography>
        <CreateProjectButton
          onClick={() => {
            setCreateOpen(true);
          }}
        />
      </Stack>

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

      <CreateProjectDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
      />
    </>
  );
}
