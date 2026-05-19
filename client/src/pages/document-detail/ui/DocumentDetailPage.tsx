import { Alert, Box, Chip, Grid2, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { versionFileUrl } from '../../../entities/document';
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
import { CommentThread } from '../../../features/version-comments';
import {
  computePermissions,
  useVersionWorkflow,
} from '../../../features/version-workflow';
import { prefetchPdf } from '../../../shared/lib/pdf-cache';
import { sortVersionsDesc } from '../../../shared/lib/sort-versions';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PdfViewer } from '../../../shared/ui/PdfViewer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { reconcileSelectedVersion } from '../lib/select-version';

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
  const [selected, setSelected] = useState<number | null>(null);
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

  const versions = document.data?.versions;
  // 同一ルートで documentId だけが変わる遷移ではコンポーネントが
  // アンマウントされず、前の文書で選んだ版番号が selected に残る。
  // versions（文書切替で参照が変わる）に追従して整合させ、別文書に
  // 存在しない版で PdfViewer/CommentThread を開かないようにする。
  // setSelected の関数更新で prev を参照するため依存に selected は不要。
  // 整合済み（prev を維持）のときは同一値を返し React がバイパスする
  // ため無限ループにはならない。
  useEffect(() => {
    setSelected((prev) => reconcileSelectedVersion(prev, versions));
  }, [versions]);

  // 版切替を即時化するため近傍版のみ事前読み込みする。全版一括だと
  // 版数が多い文書で同時 DL/パースが過多になりキャッシュ上限も超えるため、
  // 選択中とその前後 2 版＋最新版に限定（選択変更で追従して温める）。
  useEffect(() => {
    if (versions === undefined || versions.length === 0) {
      return;
    }
    const numbers = versions.map((v) => v.versionNumber);
    const last = numbers[numbers.length - 1];
    const center = selected ?? last ?? 1;
    const window = new Set<number>();
    for (let n = center - 2; n <= center + 2; n += 1) {
      window.add(n);
    }
    if (last !== undefined) {
      window.add(last);
    }
    for (const n of numbers) {
      if (window.has(n)) {
        prefetchPdf(versionFileUrl(documentId, n));
      }
    }
  }, [versions, documentId, selected]);

  if (document.isPending) {
    return <Typography>読み込み中…</Typography>;
  }
  if (document.isError) {
    return <Alert severity="error">文書を取得できませんでした</Alert>;
  }

  const d = document.data;

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
            '版を選択するとプレビューとコメントが右側に表示されます'
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

      <Grid2 container spacing={3} alignItems="stretch">
        {/* 左カラム: アップロード + 版履歴/操作 */}
        <Grid2 size={{ xs: 12, lg: 4 }}>
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
                versions={sortVersionsDesc(d.versions)}
                selected={selected}
                permissions={permissions}
                workflowPending={workflowPending}
                onSelect={setSelected}
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
        </Grid2>

        {/* 右カラム: プレビュー（主役）+ コメント */}
        <Grid2 size={{ xs: 12, lg: 8 }}>
          {selected === null ? (
            <SectionCard fullHeight>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 320,
                  color: 'text.secondary',
                }}
              >
                <Typography>
                  左の版履歴から版を選ぶとプレビューを表示します
                </Typography>
              </Box>
            </SectionCard>
          ) : (
            <Stack spacing={3}>
              <SectionCard title={`v${String(selected)} のプレビュー`}>
                <PdfViewer
                  src={versionFileUrl(documentId, selected)}
                  fitToWidth
                />
              </SectionCard>
              <SectionCard title={`v${String(selected)} のコメント`}>
                <CommentThread
                  documentId={documentId}
                  versionNumber={selected}
                  currentUserId={me.data?.id}
                />
              </SectionCard>
            </Stack>
          )}
        </Grid2>
      </Grid2>

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
