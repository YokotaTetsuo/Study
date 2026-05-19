import {
  Alert,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function ProjectsPage(): ReactElement {
  const projects = useProjects();
  const navigate = useNavigate();
  // 作成ダイアログの open state は page が所有する（client-fsd Portal 規約）。
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="プロジェクト"
        subtitle="参加しているプロジェクトの一覧"
        actions={
          <CreateProjectButton
            onClick={() => {
              setCreateOpen(true);
            }}
          />
        }
      />

      {projects.isPending && <Typography>読み込み中…</Typography>}
      {projects.isError && (
        <Alert severity="error">プロジェクトを取得できませんでした</Alert>
      )}
      {projects.data !== undefined &&
        (projects.data.length === 0 ? (
          <SectionCard>
            <Typography color="text.secondary">
              プロジェクトがありません。「＋ 追加」から作成してください。
            </Typography>
          </SectionCard>
        ) : (
          <SectionCard dense>
            <List disablePadding>
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
                    sx={{ borderRadius: 1, py: 1.5 }}
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
          </SectionCard>
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
