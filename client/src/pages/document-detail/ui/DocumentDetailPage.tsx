import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { useMe } from '../../../features/auth';
import {
  DeleteDocumentButton,
  DeleteDocumentDialog,
  RenameDocumentButton,
  RenameDocumentDialog,
  useDocument,
} from '../../../features/document';
import { useProject } from '../../../features/project';
import {
  UploadDropzone,
  useUploadVersion,
} from '../../../features/upload-version';
import {
  computePermissions,
  useVersionWorkflow,
} from '../../../features/version-workflow';
import { sortVersionsDesc } from '../../../shared/lib/sort-versions';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionCard } from '../../../shared/ui/SectionCard';

import { VersionHistoryList } from './VersionHistoryList';

export function DocumentDetailPage(): ReactElement {
  const { projectId, documentId } = useParams({
    from: '/projects/$projectId/documents/$documentId',
  });
  const document = useDocument(documentId);
  // 権限は URL の projectId ではなく、読み込んだ文書の実 projectId で
  // 判定する（不一致なディープリンクで誤った権限表示にならないように）。
  // 文書未取得の間は URL の projectId をフォールバックに使う。
  const project = useProject(document.data?.projectId ?? projectId);
  const me = useMe();
  const upload = useUploadVersion(documentId);
  const workflow = useVersionWorkflow(documentId);
  const navigate = useNavigate();
  // 名称変更ダイアログの open state は page が所有する（client-fsd Portal 規約）。
  const [renameOpen, setRenameOpen] = useState(false);
  // 削除確認ダイアログの open state は page が所有する
  // （client-fsd Portal 規約）。
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 現在ユーザーのプロジェクト内ロールと承認ポリシーから、提示してよい
  // 操作を導く（403 になるボタンを出さない）。未取得時は全操作不可。
  const myRole = project.data?.members.find(
    (m) => m.userId === me.data?.id,
  )?.role;
  const permissions = computePermissions(
    myRole,
    project.data?.approvalPolicy.approverRoles ?? [],
  );

  // 新しい操作の前に直前の sticky な成功/失敗をクリアし、エラー表示が
  // 最新操作のみを反映するようにする。
  const runAction = (
    mutation: { mutate: (n: number) => void },
    versionNumber: number,
  ): void => {
    workflow.reset();
    mutation.mutate(versionNumber);
  };

  const workflowPending = [
    workflow.submit,
    workflow.approve,
    workflow.requestChanges,
    workflow.reject,
    workflow.publish,
  ].some((m) => m.isPending);
  const workflowFailed = [
    workflow.submit,
    workflow.approve,
    workflow.requestChanges,
    workflow.reject,
    workflow.publish,
  ].some((m) => m.isError);

  // 版履歴は最新が上（降順）。ソートは毎レンダー再計算しないよう
  // memo 化する（workflow フラグ変化で再描画されるため）。
  const sortedVersions = useMemo(
    () => sortVersionsDesc(document.data?.versions ?? []),
    [document.data?.versions],
  );

  if (document.isPending) {
    return <Typography>読み込み中…</Typography>;
  }
  if (document.isError) {
    return <Alert severity="error">文書を取得できませんでした</Alert>;
  }

  const d = document.data;

  // 版の閲覧・コメントは専用版ビューアへ集約。文書詳細からは履歴行の
  // 「専用ビューアで開く」導線で遷移する。
  const openViewer = (versionNumber: number): void => {
    void navigate({
      to: '/projects/$projectId/documents/$documentId/versions/$versionNumber',
      params: {
        projectId: d.projectId,
        documentId,
        versionNumber: String(versionNumber),
      },
    });
  };

  return (
    <>
      <PageHeader
        title={d.name}
        subtitle={
          d.officialVersionNumber !== null ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                size="small"
                color="primary"
                label={`正式版 v${String(d.officialVersionNumber)}`}
              />
            </Stack>
          ) : (
            '版をアップロードし、各行から専用ビューアで閲覧・コメントできます'
          )
        }
        actions={
          <Stack direction="row" alignItems="center" spacing={1}>
            <RenameDocumentButton
              onClick={() => {
                setRenameOpen(true);
              }}
            />
            <DeleteDocumentButton
              onClick={() => {
                setDeleteOpen(true);
              }}
            />
          </Stack>
        }
      />

      {workflowFailed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          操作に失敗しました。状態や権限、競合（時間をおいて再試行）を
          ご確認ください。
        </Alert>
      )}

      {d.versions.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          まだ版がありません。最初の PDF をアップロードして版 1
          を作成しましょう。
        </Alert>
      )}

      <Stack spacing={3}>
        <SectionCard title="新しい版をアップロード" dense>
          <UploadDropzone
            compact
            onUpload={(f) => {
              upload.mutate(f);
            }}
            pending={upload.isPending}
            succeeded={upload.isSuccess}
            failed={upload.isError}
            onResetStatus={() => {
              upload.reset();
            }}
          />
        </SectionCard>

        <SectionCard title="版履歴">
          <VersionHistoryList
            versions={sortedVersions}
            permissions={permissions}
            workflowPending={workflowPending}
            onOpenViewer={openViewer}
            onSubmit={(n) => {
              runAction(workflow.submit, n);
            }}
            onApprove={(n) => {
              runAction(workflow.approve, n);
            }}
            onRequestChanges={(n) => {
              runAction(workflow.requestChanges, n);
            }}
            onReject={(n) => {
              runAction(workflow.reject, n);
            }}
            onPublish={(n) => {
              runAction(workflow.publish, n);
            }}
          />
        </SectionCard>
      </Stack>

      <RenameDocumentDialog
        documentId={documentId}
        currentName={d.name}
        open={renameOpen}
        onClose={() => {
          setRenameOpen(false);
        }}
      />
      <DeleteDocumentDialog
        documentId={documentId}
        documentName={d.name}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
        }}
        onDeleted={() => {
          void navigate({
            to: '/projects/$projectId/documents',
            params: { projectId: d.projectId },
          });
        }}
      />
    </>
  );
}
