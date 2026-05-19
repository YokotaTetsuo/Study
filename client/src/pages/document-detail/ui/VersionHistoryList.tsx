import {
  Box,
  Button,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import type { DocumentVersion } from '@pdf-review/shared';
import type { ReactElement } from 'react';

import {
  VersionActions,
  VersionStatusBadge,
} from '../../../features/version-workflow';
import type { WorkflowPermissions } from '../../../features/version-workflow';

interface VersionHistoryListProps {
  readonly versions: readonly DocumentVersion[];
  readonly permissions: WorkflowPermissions;
  readonly workflowPending: boolean;
  readonly onOpenViewer: (versionNumber: number) => void;
  readonly onSubmit: (versionNumber: number) => void;
  readonly onApprove: (versionNumber: number) => void;
  readonly onRequestChanges: (versionNumber: number) => void;
  readonly onReject: (versionNumber: number) => void;
  readonly onPublish: (versionNumber: number) => void;
}

/**
 * 版履歴の縦リスト。各行は状態バッジ・承認系操作と、PDF 閲覧・
 * コメントを担う専用版ビューアへの遷移導線をまとめる。行自体の
 * クリックでも専用ビューアへ遷移する（プレビューは文書詳細から
 * 撤去し専用ビューアへ集約）。ロジックは持たず callback を上げるだけ。
 */
export function VersionHistoryList({
  versions,
  permissions,
  workflowPending,
  onOpenViewer,
  onSubmit,
  onApprove,
  onRequestChanges,
  onReject,
  onPublish,
}: VersionHistoryListProps): ReactElement {
  if (versions.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        まだ版がありません
      </Typography>
    );
  }

  return (
    <List
      disablePadding
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      {versions.map((v) => (
        <Box
          key={v.versionNumber}
          component="li"
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            overflow: 'hidden',
          }}
        >
          <ListItemButton
            onClick={() => {
              onOpenViewer(v.versionNumber);
            }}
            sx={{ display: 'block', py: 1.25 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography sx={{ fontWeight: 600 }}>
                v{v.versionNumber}
              </Typography>
              <VersionStatusBadge status={v.status} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {new Date(v.createdAt).toLocaleString('ja-JP')}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {v.latestCommentAt !== null
                ? `最終コメント: ${new Date(v.latestCommentAt).toLocaleString(
                    'ja-JP',
                  )}`
                : 'コメントなし'}
            </Typography>
          </ListItemButton>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              px: 1.5,
              py: 1,
              borderTop: 1,
              borderColor: 'divider',
              flexWrap: 'wrap',
            }}
          >
            <VersionActions
              status={v.status}
              pending={workflowPending}
              permissions={permissions}
              onSubmit={() => {
                onSubmit(v.versionNumber);
              }}
              onApprove={() => {
                onApprove(v.versionNumber);
              }}
              onRequestChanges={() => {
                onRequestChanges(v.versionNumber);
              }}
              onReject={() => {
                onReject(v.versionNumber);
              }}
              onPublish={() => {
                onPublish(v.versionNumber);
              }}
            />
            <Button
              size="small"
              onClick={() => {
                onOpenViewer(v.versionNumber);
              }}
            >
              専用ビューアで開く
            </Button>
          </Stack>
        </Box>
      ))}
    </List>
  );
}
