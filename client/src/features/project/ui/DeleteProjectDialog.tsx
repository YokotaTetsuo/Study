import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { ReactElement } from 'react';

import { useDeleteProject } from '../model/use-projects';

interface DeleteProjectDialogProps {
  readonly projectId: string;
  readonly projectName: string;
  readonly open: boolean;
  readonly onClose: () => void;
  /** 削除成功後（page 側で一覧へ遷移するなど）。 */
  readonly onDeleted: () => void;
}

/**
 * プロジェクト削除の確認ダイアログ。破壊的操作のため明示確認する。
 * open state は親（page）が所有し、clickable な祖先の React 子孫に
 * ならない位置で render される前提（client-fsd Portal 規約）。
 */
export function DeleteProjectDialog({
  projectId,
  projectName,
  open,
  onClose,
  onDeleted,
}: DeleteProjectDialogProps): ReactElement {
  const remove = useDeleteProject();

  const close = (): void => {
    remove.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>プロジェクトを削除</DialogTitle>
      <DialogContent>
        <DialogContentText>
          「{projectName}」を削除します。プロジェクト内の文書・版・コメントの
          登録データもすべて削除され、元に戻せません。よろしいですか？
        </DialogContentText>
        {remove.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            削除に失敗しました
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>キャンセル</Button>
        <Button
          variant="contained"
          color="error"
          disabled={remove.isPending}
          onClick={() => {
            remove.mutate(projectId, {
              onSuccess: () => {
                // 先に close（親 state 更新）してから onDeleted（遷移=unmount）。
                // 逆順だと unmount 後に state 更新が走り React 警告になる。
                close();
                onDeleted();
              },
            });
          }}
        >
          削除する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
