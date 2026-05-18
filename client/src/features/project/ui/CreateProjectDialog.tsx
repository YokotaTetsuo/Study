import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useCreateProject } from '../model/use-projects';

interface CreateProjectDialogProps {
  readonly open: boolean;
  /** 閉じる（キャンセル / 作成成功の双方）。 */
  readonly onClose: () => void;
}

/**
 * プロジェクト作成ダイアログ。open state は親（page）が所有し、
 * clickable な祖先の React 子孫にならない位置で render される前提
 * （client-fsd Portal 規約）。
 */
export function CreateProjectDialog({
  open,
  onClose,
}: CreateProjectDialogProps): ReactElement {
  const create = useCreateProject();
  const [name, setName] = useState('');

  const close = (): void => {
    setName('');
    create.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { name },
            {
              onSuccess: () => {
                close();
              },
            },
          );
        }}
      >
        <DialogTitle>プロジェクトを作成</DialogTitle>
        <DialogContent>
          <TextField
            id="project-name"
            label="新しいプロジェクト名"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
          />
          {create.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              作成に失敗しました
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={create.isPending}>
            作成
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
