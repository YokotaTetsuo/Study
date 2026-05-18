import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactElement } from 'react';

import { validatePdfFile } from '../lib/validate-file';

interface Props {
  readonly onUpload: (file: File) => void;
  readonly pending: boolean;
  readonly succeeded: boolean;
  readonly failed: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

/**
 * 版アップロード用ドロップゾーン。ドラッグ&ドロップ / クリック選択を統合し、
 * クライアント側で PDF MIME・サイズ上限を事前検証して即時フィードバックする。
 * アップロードの実行（mutation）と状態は呼び出し側が所有する。
 */
export function UploadDropzone({
  onUpload,
  pending,
  succeeded,
  failed,
}: Props): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // アップロード成功後は選択をクリアし、続けて次の版を選べる状態に戻す。
  useEffect(() => {
    if (succeeded) {
      setFile(null);
      setValidationError(null);
    }
  }, [succeeded]);

  function selectFile(picked: File | undefined): void {
    if (picked === undefined) return;
    const result = validatePdfFile(picked);
    if (!result.ok) {
      setFile(null);
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    setFile(picked);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragActive(false);
    if (pending) return;
    selectFile(e.dataTransfer.files[0]);
  }

  const canUpload = file !== null && !pending;

  return (
    <Box sx={{ mb: 3 }}>
      <Paper
        variant="outlined"
        onClick={() => {
          if (!pending) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!pending) setDragActive(true);
        }}
        onDragLeave={() => {
          setDragActive(false);
        }}
        onDrop={handleDrop}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: pending ? 'default' : 'pointer',
          borderStyle: 'dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
        }}
      >
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            selectFile(e.target.files?.[0]);
            // 同一ファイルの再選択でも onChange が発火するよう値をクリア。
            e.target.value = '';
          }}
        />
        <Typography sx={{ mt: 1 }}>
          PDF をドラッグ&ドロップ、またはクリックして選択
        </Typography>
        <Typography variant="body2" color="text.secondary">
          application/pdf / 最大 50 MiB
        </Typography>
      </Paper>

      {file !== null && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ flexGrow: 1 }}>
            選択中: {file.name}（{formatSize(file.size)}）
          </Typography>
          <Button
            disabled={pending}
            onClick={() => {
              setFile(null);
              setValidationError(null);
            }}
          >
            選び直す
          </Button>
          <Button
            variant="contained"
            disabled={!canUpload}
            onClick={() => {
              onUpload(file);
            }}
          >
            {failed ? '再試行' : 'アップロード'}
          </Button>
        </Stack>
      )}

      {pending && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            アップロード中…
          </Typography>
        </Box>
      )}

      {validationError !== null && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {validationError}
        </Alert>
      )}

      {succeeded && (
        <Alert severity="success" sx={{ mt: 2 }}>
          アップロードが完了しました。
        </Alert>
      )}

      {failed && (
        <Alert severity="error" sx={{ mt: 2 }}>
          アップロードに失敗しました。対応形式は PDF のみ・最大 50 MiB
          です。権限・通信状況もご確認のうえ「再試行」してください。
        </Alert>
      )}
    </Box>
  );
}
