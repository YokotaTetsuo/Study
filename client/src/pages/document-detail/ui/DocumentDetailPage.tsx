import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
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
import { useDocument, useUploadVersion } from '../../../features/document';
import { PdfViewer } from '../../../shared/ui/PdfViewer';

export function DocumentDetailPage(): ReactElement {
  const { documentId } = useParams({
    from: '/projects/$projectId/documents/$documentId',
  });
  const document = useDocument(documentId);
  const upload = useUploadVersion(documentId);
  const [file, setFile] = useState<File | null>(null);
  // input を再マウントして同一ファイルの再選択でも onChange を発火させる。
  const [inputKey, setInputKey] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const versions = document.data?.versions;
  useEffect(() => {
    const last = versions?.at(-1);
    if (last !== undefined) {
      setSelected((prev) => prev ?? last.versionNumber);
    }
  }, [versions]);

  if (document.isPending) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>読み込み中…</Typography>
      </Container>
    );
  }
  if (document.isError) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">文書を取得できませんでした</Alert>
      </Container>
    );
  }

  const d = document.data;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        {d.name}
      </Typography>

      <Box
        component="form"
        sx={{ mb: 3 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (file !== null) {
            upload.mutate(file, {
              onSuccess: () => {
                setFile(null);
                setInputKey((k) => k + 1);
              },
            });
          }
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Button component="label" variant="outlined">
            {file !== null ? file.name : 'PDF を選択'}
            <input
              key={inputKey}
              hidden
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
              }}
            />
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={file === null || upload.isPending}
          >
            版をアップロード
          </Button>
        </Stack>
        {upload.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            アップロードに失敗しました（PDF のみ）
          </Alert>
        )}
      </Box>

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
    </Container>
  );
}
