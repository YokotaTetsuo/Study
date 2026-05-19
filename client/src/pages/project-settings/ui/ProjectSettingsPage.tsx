import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { projectRoleSchema } from '@pdf-review/shared';
import type { ProjectRole } from '@pdf-review/shared';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { useMe } from '../../../features/auth';
import {
  DeleteProjectButton,
  DeleteProjectDialog,
  RenameProjectButton,
  RenameProjectDialog,
  useAddMember,
  useProject,
  useSetMemberRole,
  useUpdateApprovalPolicy,
} from '../../../features/project';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionCard } from '../../../shared/ui/SectionCard';

const ROLES = projectRoleSchema.options;

export function ProjectSettingsPage(): ReactElement {
  const { projectId } = useParams({
    from: '/projects/$projectId/settings',
  });
  const navigate = useNavigate();
  const project = useProject(projectId);
  const me = useMe();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const addMember = useAddMember(projectId);
  const setRole = useSetMemberRole(projectId);
  const updatePolicy = useUpdateApprovalPolicy(projectId);

  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<ProjectRole>('reviewer');
  const [required, setRequired] = useState(1);
  const [approverRoles, setApproverRoles] = useState<ProjectRole[]>(['owner']);

  const policy = project.data?.approvalPolicy;
  useEffect(() => {
    if (policy !== undefined) {
      setRequired(policy.requiredApprovals);
      setApproverRoles([...policy.approverRoles]);
    }
  }, [policy]);

  if (project.isPending) {
    return <Typography>読み込み中…</Typography>;
  }
  if (project.isError) {
    return <Alert severity="error">プロジェクトを取得できませんでした</Alert>;
  }

  const p = project.data;

  // メンバー追加・ロール変更・承認ポリシー更新はサーバー上オーナー専用。
  // 非オーナーには 403 になる操作を提示せず、無効化＋理由を併記する。
  const isOwner =
    p.members.find((m) => m.userId === me.data?.id)?.role === 'owner';

  return (
    <>
      <PageHeader
        title={`${p.name} の設定`}
        subtitle="メンバーと承認ポリシーを管理します"
      />

      {!isOwner && (
        <Alert severity="info" sx={{ mb: 3 }}>
          メンバーと承認ポリシーの変更はプロジェクトのオーナーのみ可能です。
        </Alert>
      )}

      {isOwner && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <RenameProjectButton
            onClick={() => {
              setRenameOpen(true);
            }}
          />
          <DeleteProjectButton
            onClick={() => {
              setDeleteOpen(true);
            }}
          />
        </Stack>
      )}

      <Stack spacing={3}>
        <SectionCard title="メンバー">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>表示名</TableCell>
                <TableCell>メール</TableCell>
                <TableCell>ロール</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {p.members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>{m.displayName}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      disabled={!isOwner}
                      value={m.role}
                      onChange={(e) => {
                        setRole.mutate({
                          userId: m.userId,
                          body: {
                            role: projectRoleSchema.parse(e.target.value),
                          },
                        });
                      }}
                    >
                      {ROLES.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box
            component="form"
            sx={{ mt: 3 }}
            onSubmit={(e) => {
              e.preventDefault();
              addMember.mutate(
                { email, role: newRole },
                {
                  onSuccess: () => {
                    setEmail('');
                  },
                },
              );
            }}
          >
            <Stack direction="row" spacing={2}>
              <TextField
                id="member-email"
                label="追加するメールアドレス"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                required
                disabled={!isOwner}
              />
              <TextField
                select
                label="ロール"
                value={newRole}
                onChange={(e) => {
                  setNewRole(projectRoleSchema.parse(e.target.value));
                }}
                sx={{ minWidth: 140 }}
                disabled={!isOwner}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                type="submit"
                variant="contained"
                disabled={!isOwner || addMember.isPending}
              >
                メンバー追加
              </Button>
            </Stack>
            {addMember.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                メンバー追加に失敗しました
              </Alert>
            )}
          </Box>
        </SectionCard>

        <SectionCard title="承認ポリシー">
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              updatePolicy.mutate({
                requiredApprovals: required,
                approverRoles,
              });
            }}
          >
            <Stack spacing={1} sx={{ maxWidth: 360 }}>
              <TextField
                id="required-approvals"
                label="必要承認数"
                type="number"
                value={required}
                onChange={(e) => {
                  setRequired(Number(e.target.value));
                }}
                slotProps={{ htmlInput: { min: 1 } }}
                disabled={!isOwner}
              />
              <Box>
                {ROLES.map((r) => (
                  <FormControlLabel
                    key={r}
                    control={
                      <Checkbox
                        disabled={!isOwner}
                        checked={approverRoles.includes(r)}
                        onChange={(e) => {
                          setApproverRoles((prev) =>
                            e.target.checked
                              ? [...prev, r]
                              : prev.filter((x) => x !== r),
                          );
                        }}
                      />
                    }
                    label={r}
                  />
                ))}
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  !isOwner ||
                  updatePolicy.isPending ||
                  approverRoles.length === 0
                }
              >
                ポリシー更新
              </Button>
              <Typography variant="body2" color="text.secondary">
                現在: 必要承認 {p.approvalPolicy.requiredApprovals} / 承認ロール{' '}
                {p.approvalPolicy.approverRoles.join(', ')}
              </Typography>
            </Stack>
          </Box>
        </SectionCard>
      </Stack>

      <RenameProjectDialog
        projectId={projectId}
        currentName={p.name}
        open={renameOpen}
        onClose={() => {
          setRenameOpen(false);
        }}
      />
      <DeleteProjectDialog
        projectId={projectId}
        projectName={p.name}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
        }}
        onDeleted={() => {
          // 削除後はプロジェクト一覧へ。'/' は welcome 表示のみで
          // 一覧ではないため要件に合わせ /projects へ遷移する。
          void navigate({ to: '/projects' });
        }}
      />
    </>
  );
}
