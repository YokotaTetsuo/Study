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
  readonly selected: number | null;
  readonly permissions: WorkflowPermissions;
  readonly workflowPending: boolean;
  readonly onSelect: (versionNumber: number) => void;
  readonly onOpenViewer: (versionNumber: number) => void;
  readonly onSubmit: (versionNumber: number) => void;
  readonly onApprove: (versionNumber: number) => void;
  readonly onRequestChanges: (versionNumber: number) => void;
  readonly onReject: (versionNumber: number) => void;
  readonly onPublish: (versionNumber: number) => void;
}

/**
 * 版履歴の縦リスト（左カラム用）。各行はクリックで右の
 * インラインプレビューに切り替わり、状態バッジ・操作・専用
 * ビューアへの導線をまとめる。ロジックは持たず callback を上げるだけ。
 */
export function VersionHistoryList({
  versions,
  selected,
  permissions,
  workflowPending,
  onSelect,
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
      {versions.map((v) => {
        const isSelected = selected === v.versionNumber;
        return (
          <Box
            key={v.versionNumber}
            sx={{
              border: 1,
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
            }}
          >
            <ListItemButton
              selected={isSelected}
              onClick={() => {
                onSelect(v.versionNumber);
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
        );
      })}
    </List>
  );
}
