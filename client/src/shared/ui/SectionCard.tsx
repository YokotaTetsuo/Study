import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactElement, ReactNode } from 'react';

interface SectionCardProps {
  /** セクション見出し（任意。無指定なら見出し行を描画しない）。 */
  readonly title?: ReactNode;
  /** 見出し右側に置く操作（任意）。 */
  readonly action?: ReactNode;
  /** カード本体。 */
  readonly children: ReactNode;
  /** 密度を上げたいとき内側パディングを詰める（既定 false）。 */
  readonly dense?: boolean;
  /** 縦に伸縮するレイアウト（Grid セル内で高さ 100% にする）。 */
  readonly fullHeight?: boolean;
}

/**
 * 角丸・境界線つきのコンテンツカード。ページ内の各セクションを
 * 視覚的に区切り、余白とタイポグラフィをページ横断で統一する。
 * ドメイン非依存の純粋プレゼン UI のため shared に置く。
 */
export function SectionCard({
  title,
  action,
  children,
  dense = false,
  fullHeight = false,
}: SectionCardProps): ReactElement {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: dense ? 2 : 3,
        borderRadius: 2,
        height: fullHeight ? '100%' : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title !== undefined && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {action !== undefined && <Box>{action}</Box>}
        </Stack>
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}
