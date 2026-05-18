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

import { useCreateDocument } from '../model/use-documents';

interface CreateDocumentDialogProps {
  readonly projectId: string;
  readonly open: boolean;
  /** 閉じる（キャンセル / 作成成功の双方）。 */
  readonly onClose: () => void;
}

/**
 * 文書作成ダイアログ。open state は親（page）が所有し、
 * clickable な祖先の React 子孫にならない位置で render される前提
 * （client-fsd Portal 規約）。
 */
export function CreateDocumentDialog({
  projectId,
  open,
  onClose,
}: CreateDocumentDialogProps): ReactElement {
  const create = useCreateDocument();
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
            { projectId, name },
            {
              onSuccess: () => {
                close();
              },
            },
          );
        }}
      >
        <DialogTitle>文書を作成</DialogTitle>
        <DialogContent>
          <TextField
            id="document-name"
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
