import { Button } from '@mui/material';
import { useCanGoBack, useRouter } from '@tanstack/react-router';
import type { ReactElement } from 'react';

/**
 * 直前の画面へ戻るボタン。履歴が無い（アプリ初回エントリ等で戻る先が
 * 無い）場合は描画しない。パンくずと併設して上位/直前への動線を補う。
 */
export function BackButton(): ReactElement | null {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  if (!canGoBack) {
    return null;
  }

  return (
    <Button
      size="small"
      variant="outlined"
      onClick={() => {
        router.history.back();
      }}
    >
      ← 戻る
    </Button>
  );
}
