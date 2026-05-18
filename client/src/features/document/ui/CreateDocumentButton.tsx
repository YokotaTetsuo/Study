import { Button } from '@mui/material';
import type { ReactElement } from 'react';

interface CreateDocumentButtonProps {
  /** クリックでダイアログを開く（open state は呼び出し側が所有）。 */
  readonly onClick: () => void;
}

/**
 * 文書作成ダイアログを開く trigger ボタン。open state は持たず、
 * Dialog の配置責任を呼び出し側（page）へ委ねる（client-fsd Portal 規約）。
 */
export function CreateDocumentButton({
  onClick,
}: CreateDocumentButtonProps): ReactElement {
  return (
    <Button size="small" variant="outlined" onClick={onClick}>
      ＋ 追加
    </Button>
  );
}
