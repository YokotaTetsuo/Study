import { Button } from '@mui/material';
import type { ReactElement } from 'react';

interface DeleteProjectButtonProps {
  /** クリックで確認ダイアログを開く（open state は呼び出し側が所有）。 */
  readonly onClick: () => void;
}

/**
 * プロジェクト削除の確認ダイアログを開く trigger ボタン。open state は
 * 持たず、Dialog の配置責任を呼び出し側（page）へ委ねる
 * （client-fsd Portal 規約）。
 */
export function DeleteProjectButton({
  onClick,
}: DeleteProjectButtonProps): ReactElement {
  return (
    <Button size="small" variant="outlined" color="error" onClick={onClick}>
      削除
    </Button>
  );
}
