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
import { useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { versionFileUrl } from '../../../entities/document';
import { useDocument } from '../../../features/document';
import {
  UploadDropzone,
  useUploadVersion,
} from '../../../features/upload-version';
import {
  useVersionWorkflow,
  VersionActions,
  VersionStatusBadge,
} from '../../../features/version-workflow';
import { PdfViewer } from '../../../shared/ui/PdfViewer';

export function DocumentDetailPage(): ReactElement {
  const { documentId } = useParams({
    from: '/projects/$projectId/documents/$documentId',
  });
  const document = useDocument(documentId);
  const upload = useUploadVersion(documentId);
  const workflow = useVersionWorkflow(documentId);
  const [selected, setSelected] = useState<number | null>(null);

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
            {d.versions.map((v) => (
              <TableRow
                key={v.versionNumber}
                selected={selected === v.versionNumber}
              >
                <TableCell>v{v.versionNumber}</TableCell>
                <TableCell>
                  <VersionStatusBadge status={v.status} />
                </TableCell>
                <TableCell>
                  {new Date(v.createdAt).toLocaleString('ja-JP')}
                </TableCell>
                <TableCell>
                  <VersionActions
                    status={v.status}
                    pending={workflowPending}
                    onSubmit={() => {
                      workflow.submit.mutate(v.versionNumber);
                    }}
                    onApprove={() => {
                      workflow.approve.mutate(v.versionNumber);
                    }}
                    onRequestChanges={() => {
                      workflow.requestChanges.mutate(v.versionNumber);
                    }}
                    onReject={() => {
                      workflow.reject.mutate(v.versionNumber);
                    }}
                    onPublish={() => {
                      workflow.publish.mutate(v.versionNumber);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelected(v.versionNumber);
                    }}
                  >
                    表示
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
