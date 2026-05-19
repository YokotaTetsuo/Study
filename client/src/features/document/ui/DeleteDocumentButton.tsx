import { Button } from '@mui/material';
import type { ReactElement } from 'react';

interface DeleteDocumentButtonProps {
  /** クリックで確認ダイアログを開く（open state は呼び出し側が所有）。 */
  readonly onClick: () => void;
}

/**
 * 文書削除の確認ダイアログを開く trigger ボタン。open state は持たず、
 * Dialog の配置責任を呼び出し側（page）へ委ねる（client-fsd Portal 規約）。
 */
export function DeleteDocumentButton({
  onClick,
}: DeleteDocumentButtonProps): ReactElement {
  return (
    <Button size="small" color="error" variant="outlined" onClick={onClick}>
      削除
    </Button>
  );
}
