import { Chip } from '@mui/material';
import type { VersionStatus } from '@pdf-review/shared';
import type { ReactElement } from 'react';

type ChipColor =
  | 'default'
  | 'info'
  | 'success'
  | 'primary'
  | 'warning'
  | 'error';

function presentation(status: VersionStatus): {
  label: string;
  color: ChipColor;
} {
  switch (status) {
    case 'draft':
      return { label: '下書き', color: 'default' };
    case 'under_review':
      return { label: 'レビュー中', color: 'info' };
    case 'approved':
      return { label: '承認済み', color: 'success' };
    case 'official':
      return { label: '正式版', color: 'primary' };
    case 'changes_requested':
      return { label: '差戻し', color: 'warning' };
    case 'rejected':
      return { label: '却下', color: 'error' };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** 版状態のバッジ表示（純粋プレゼンテーション）。 */
export function VersionStatusBadge({
  status,
}: {
  readonly status: VersionStatus;
}): ReactElement {
  const { label, color } = presentation(status);
  return <Chip size="small" label={label} color={color} />;
}
