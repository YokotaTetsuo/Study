import { Button, Stack } from '@mui/material';
import type { VersionStatus } from '@pdf-review/shared';
import type { ReactElement } from 'react';

interface Props {
  readonly status: VersionStatus;
  readonly pending: boolean;
  readonly onSubmit: () => void;
  readonly onApprove: () => void;
  readonly onRequestChanges: () => void;
  readonly onReject: () => void;
  readonly onPublish: () => void;
}

/**
 * 版状態に応じた操作ボタン群（トリガーのみ。状態機械上有効な操作だけ表示）。
 *   draft        → 提出
 *   under_review → 承認 / 差戻し / 却下
 *   approved     → 正式版にする
 *   official / rejected / changes_requested → 操作なし
 */
export function VersionActions({
  status,
  pending,
  onSubmit,
  onApprove,
  onRequestChanges,
  onReject,
  onPublish,
}: Props): ReactElement {
  return (
    <Stack direction="row" spacing={1}>
      {status === 'draft' && (
        <Button size="small" disabled={pending} onClick={onSubmit}>
          提出
        </Button>
      )}
      {status === 'under_review' && (
        <>
          <Button
            size="small"
            color="success"
            disabled={pending}
            onClick={onApprove}
          >
            承認
          </Button>
          <Button
            size="small"
            color="warning"
            disabled={pending}
            onClick={onRequestChanges}
          >
            差戻し
          </Button>
          <Button
            size="small"
            color="error"
            disabled={pending}
            onClick={onReject}
          >
            却下
          </Button>
        </>
      )}
      {status === 'approved' && (
        <Button
          size="small"
          variant="contained"
          disabled={pending}
          onClick={onPublish}
        >
          正式版にする
        </Button>
      )}
    </Stack>
  );
}
