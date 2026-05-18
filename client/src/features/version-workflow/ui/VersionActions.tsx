import { Button, Stack } from '@mui/material';
import type { VersionStatus } from '@pdf-review/shared';
import type { ReactElement } from 'react';

import type { WorkflowPermissions } from '../lib/permissions';

interface Props {
  readonly status: VersionStatus;
  readonly pending: boolean;
  readonly permissions: WorkflowPermissions;
  readonly onSubmit: () => void;
  readonly onApprove: () => void;
  readonly onRequestChanges: () => void;
  readonly onReject: () => void;
  readonly onPublish: () => void;
}

/**
 * 版状態と現在ユーザーの権限に応じた操作ボタン群（トリガーのみ）。
 * 状態機械上有効、かつサーバ認可で許可される操作だけを表示し、
 * 403 になるボタンを出さない。
 *   draft        → 提出（メンバー）
 *   under_review → 承認（承認可能ロール）/ 差戻し・却下（reviewer|owner）
 *   approved     → 正式版にする（owner）
 *   official / rejected / changes_requested → 操作なし
 */
export function VersionActions({
  status,
  pending,
  permissions,
  onSubmit,
  onApprove,
  onRequestChanges,
  onReject,
  onPublish,
}: Props): ReactElement {
  return (
    <Stack direction="row" spacing={1}>
      {status === 'draft' && permissions.canSubmit && (
        <Button size="small" disabled={pending} onClick={onSubmit}>
          提出
        </Button>
      )}
      {status === 'under_review' && (
        <>
          {permissions.canApprove && (
            <Button
              size="small"
              color="success"
              disabled={pending}
              onClick={onApprove}
            >
              承認
            </Button>
          )}
          {permissions.canReview && (
            <>
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
        </>
      )}
      {status === 'approved' && permissions.canPublish && (
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
