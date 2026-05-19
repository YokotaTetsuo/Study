import { Button } from '@mui/material';
import type { ReactElement } from 'react';

interface RenameDocumentButtonProps {
  /** クリックで名称変更ダイアログを開く（open state は呼び出し側が所有）。 */
  readonly onClick: () => void;
}

/**
 * 文書名変更ダイアログを開く trigger ボタン。open state は持たず、
 * Dialog の配置責任を呼び出し側（page）へ委ねる（client-fsd Portal 規約）。
 * clickable な祖先内に置かれてもイベントが伝播しないよう stopPropagation する。
 */
export function RenameDocumentButton({
  onClick,
}: RenameDocumentButtonProps): ReactElement {
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      名称変更
    </Button>
  );
}
