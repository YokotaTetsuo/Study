import { Button } from '@mui/material';
import type { ReactElement } from 'react';

interface RenameProjectButtonProps {
  /** クリックで編集ダイアログを開く（open state は呼び出し側が所有）。 */
  readonly onClick: () => void;
}

/**
 * プロジェクト名編集ダイアログを開く trigger ボタン。open state は持たず、
 * Dialog の配置責任を呼び出し側（page）へ委ねる（client-fsd Portal 規約）。
 */
export function RenameProjectButton({
  onClick,
}: RenameProjectButtonProps): ReactElement {
  return (
    <Button size="small" variant="outlined" onClick={onClick}>
      名前を変更
    </Button>
  );
}
