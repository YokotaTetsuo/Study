import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { useRenameProject } from '../model/use-projects';

interface RenameProjectDialogProps {
  readonly projectId: string;
  readonly currentName: string;
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * プロジェクト名編集ダイアログ。open state は親（page）が所有し、
 * clickable な祖先の React 子孫にならない位置で render される前提
 * （client-fsd Portal 規約）。
 */
export function RenameProjectDialog({
  projectId,
  currentName,
  open,
  onClose,
}: RenameProjectDialogProps): ReactElement {
  const rename = useRenameProject(projectId);
  const [name, setName] = useState(currentName);

  // 開く度に現在名へ初期化する。
  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const close = (): void => {
    rename.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          rename.mutate(
            { name },
            {
              onSuccess: () => {
                close();
              },
            },
          );
        }}
      >
        <DialogTitle>プロジェクト名を変更</DialogTitle>
        <DialogContent>
          <TextField
            id="rename-project"
            label="プロジェクト名"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
          />
          {rename.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              変更に失敗しました
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={rename.isPending}>
            変更
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
