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
import { PdfViewer } from '../../../shared/ui/PdfViewer';

export function DocumentDetailPage(): ReactElement {
  const { documentId } = useParams({
    from: '/projects/$projectId/documents/$documentId',
  });
  const document = useDocument(documentId);
  const upload = useUploadVersion(documentId);
  const [selected, setSelected] = useState<number | null>(null);

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
                <TableCell>{v.status}</TableCell>
                <TableCell>
                  {new Date(v.createdAt).toLocaleString('ja-JP')}
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
