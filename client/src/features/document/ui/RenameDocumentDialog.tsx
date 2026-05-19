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

import { useRenameDocument } from '../model/use-documents';

interface RenameDocumentDialogProps {
  readonly documentId: string;
  /** 変更前の現在名（入力初期値）。 */
  readonly currentName: string;
  readonly open: boolean;
  /** 閉じる（キャンセル / 変更成功の双方）。 */
  readonly onClose: () => void;
}

/**
 * 文書名変更ダイアログ。open state は親（page）が所有し、
 * clickable な祖先の React 子孫にならない位置で render される前提
 * （client-fsd Portal 規約）。
 */
export function RenameDocumentDialog({
  documentId,
  currentName,
  open,
  onClose,
}: RenameDocumentDialogProps): ReactElement {
  const rename = useRenameDocument(documentId);
  const [name, setName] = useState(currentName);

  const close = (): void => {
    setName(currentName);
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
        <DialogTitle>文書名を変更</DialogTitle>
        <DialogContent>
          <TextField
            id="rename-document-name"
            label="新しい文書名"
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
              変更に失敗しました。権限や競合（時間をおいて再試行）を
              ご確認ください。
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
