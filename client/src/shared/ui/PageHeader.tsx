import { Box, Stack, Typography } from '@mui/material';
import type { ReactElement, ReactNode } from 'react';

interface PageHeaderProps {
  /** ページの主見出し。 */
  readonly title: ReactNode;
  /** 見出し下の補足説明（任意）。 */
  readonly subtitle?: ReactNode;
  /** 右側に置く操作（作成ボタン等、任意）。 */
  readonly actions?: ReactNode;
}

/**
 * 各ページ共通の見出しブロック。タイトル / 補足 / 右寄せアクションを
 * 一定の余白とタイポグラフィで揃え、ページ間の一貫性を担保する。
 * ドメイン知識を持たない純粋なプレゼン UI のため shared に置く。
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: PageHeaderProps): ReactElement {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
        >
          {title}
        </Typography>
        {subtitle !== undefined && (
          // subtitle は ReactNode（Stack 等のブロック要素も来る）。
          // 既定の <p> だと <p> 内ブロック要素となり不正な HTML に
          // なるため component="div" でラップ要素を div にする。
          <Typography
            variant="body2"
            color="text.secondary"
            component="div"
            sx={{ mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions !== undefined && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Stack>
  );
}
