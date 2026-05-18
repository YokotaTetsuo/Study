import {
  Alert,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { versionFileUrl } from '../../../entities/document';
import { useMe } from '../../../features/auth';
import { useDocument } from '../../../features/document';
import { useProject } from '../../../features/project';
import {
  UploadDropzone,
  useUploadVersion,
} from '../../../features/upload-version';
import {
  computePermissions,
  useVersionWorkflow,
  VersionActions,
  VersionStatusBadge,
} from '../../../features/version-workflow';
import { PdfViewer } from '../../../shared/ui/PdfViewer';

// 行のうちプレビュー切替に使うセルの見た目（クリック可能を示す）。
const previewCellSx = { cursor: 'pointer' } as const;

/**
 * クリック/キーボード（Enter・Space）でその版のインラインプレビューに
 * 切り替えるセル。操作・表示セルとは別にすることで伝播衝突を構造で避ける。
 */
function PreviewCell({
  onSelect,
  children,
}: {
  readonly onSelect: () => void;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <TableCell
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={previewCellSx}
    >
      {children}
    </TableCell>
  );
}

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
  useEffect(() => {
    const last = versions?.at(-1);
    if (last !== undefined) {
      setSelected((prev) => prev ?? last.versionNumber);
    }
  }, [versions]);

  if (document.isPending) {
    return <Typography>読み込み中…</Typography>;
  }
  if (document.isError) {
    return <Alert severity="error">文書を取得できませんでした</Alert>;
  }

  const d = document.data;

  return (
    <>
      <Typography variant="h5" gutterBottom>
        {d.name}
      </Typography>

      {d.officialVersionNumber !== null && (
        <Alert severity="success" sx={{ mb: 2 }}>
          正式版: v{d.officialVersionNumber}
        </Alert>
      )}

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

      <UploadDropzone
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

      <Typography variant="h6" sx={{ mt: 2 }}>
        版履歴
      </Typography>
      {d.versions.length === 0 ? (
        <Typography color="text.secondary">まだ版がありません</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>版</TableCell>
              <TableCell>状態</TableCell>
              <TableCell>作成日時</TableCell>
              <TableCell>操作</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {d.versions.map((v) => {
              const selectVersion = (): void => {
                setSelected(v.versionNumber);
              };
              return (
                <TableRow
                  key={v.versionNumber}
                  selected={selected === v.versionNumber}
                >
                  <PreviewCell onSelect={selectVersion}>
                    v{v.versionNumber}
                  </PreviewCell>
                  <PreviewCell onSelect={selectVersion}>
                    <VersionStatusBadge status={v.status} />
                  </PreviewCell>
                  <PreviewCell onSelect={selectVersion}>
                    {new Date(v.createdAt).toLocaleString('ja-JP')}
                  </PreviewCell>
                  <TableCell>
                    <VersionActions
                      status={v.status}
                      pending={workflowPending}
                      permissions={permissions}
                      onSubmit={() => {
                        runAction(workflow.submit, v.versionNumber);
                      }}
                      onApprove={() => {
                        runAction(workflow.approve, v.versionNumber);
                      }}
                      onRequestChanges={() => {
                        runAction(workflow.requestChanges, v.versionNumber);
                      }}
                      onReject={() => {
                        runAction(workflow.reject, v.versionNumber);
                      }}
                      onPublish={() => {
                        runAction(workflow.publish, v.versionNumber);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        void navigate({
                          to: '/projects/$projectId/documents/$documentId/versions/$versionNumber',
                          params: {
                            projectId: d.projectId,
                            documentId,
                            versionNumber: String(v.versionNumber),
                          },
                        });
                      }}
                    >
                      表示
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {selected !== null && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            v{selected} のプレビュー
          </Typography>
          <PdfViewer src={versionFileUrl(documentId, selected)} />
        </Box>
      )}
    </>
  );
}
