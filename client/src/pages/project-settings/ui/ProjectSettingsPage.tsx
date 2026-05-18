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
import { useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { useMe } from '../../../features/auth';
import {
  useAddMember,
  useProject,
  useSetMemberRole,
  useUpdateApprovalPolicy,
} from '../../../features/project';

const ROLES = projectRoleSchema.options;

export function ProjectSettingsPage(): ReactElement {
  const { projectId } = useParams({
    from: '/projects/$projectId/settings',
  });
  const project = useProject(projectId);
  const me = useMe();
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
      <Typography variant="h5" gutterBottom>
        {p.name} の設定
      </Typography>

      {!isOwner && (
        <Alert severity="info" sx={{ mb: 2 }}>
          メンバーと承認ポリシーの変更はプロジェクトのオーナーのみ可能です。
        </Alert>
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>
        メンバー
      </Typography>
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
                      body: { role: projectRoleSchema.parse(e.target.value) },
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
        sx={{ mt: 2 }}
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

      <Typography variant="h6" sx={{ mt: 4 }}>
        承認ポリシー
      </Typography>
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
              !isOwner || updatePolicy.isPending || approverRoles.length === 0
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
    </>
  );
}
