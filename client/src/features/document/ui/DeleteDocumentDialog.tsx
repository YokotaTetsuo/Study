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

import { useDeleteDocument } from '../model/use-documents';

interface DeleteDocumentDialogProps {
  readonly documentId: string;
  readonly documentName: string;
  readonly open: boolean;
  /** 閉じる（キャンセル / 削除成功の双方）。 */
  readonly onClose: () => void;
  /**
   * 削除成功時のコールバック（一覧への遷移など）。close() の後に
   * 呼ばれる前提で、呼び出し側は unmount 後の state 更新を避ける。
   */
  readonly onDeleted: () => void;
}

/**
 * 文書削除の確認ダイアログ。破壊的操作のため明示的な確認を挟む。
 * open state は親（page）が所有し、clickable な祖先の React 子孫に
 * ならない位置で render される前提（client-fsd Portal 規約）。
 */
export function DeleteDocumentDialog({
  documentId,
  documentName,
  open,
  onClose,
  onDeleted,
}: DeleteDocumentDialogProps): ReactElement {
  const remove = useDeleteDocument();

  const close = (): void => {
    remove.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>文書を削除</DialogTitle>
      <DialogContent>
        <DialogContentText>
          「{documentName}」を削除します。版とコメントもすべて削除され、
          元に戻せません。よろしいですか？
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
          color="error"
          variant="contained"
          disabled={remove.isPending}
          onClick={() => {
            remove.mutate(documentId, {
              onSuccess: () => {
                // 先にダイアログを閉じてから遷移する。逆順だと遷移で
                // 親が unmount された後に state 更新が走り React 警告。
                close();
                onDeleted();
              },
            });
          }}
        >
          削除
        </Button>
      </DialogActions>
    </Dialog>
  );
}
