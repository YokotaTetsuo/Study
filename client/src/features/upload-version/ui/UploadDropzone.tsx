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
import type { DragEvent, KeyboardEvent, ReactElement } from 'react';

import {
  ACCEPTED_MIME,
  MAX_FILE_SIZE_LABEL,
  validatePdfFile,
} from '../lib/validate-file';

interface Props {
  readonly onUpload: (file: File) => void;
  readonly pending: boolean;
  readonly succeeded: boolean;
  readonly failed: boolean;
  /**
   * 直近のアップロード結果（成功/失敗）をクリアするための導線。
   * 新しいファイル選択・選び直し時に呼び、状態の残留を防ぐ。
   */
  readonly onResetStatus: () => void;
  /**
   * 省スペース表示。ドロップゾーンの高さ・余白を詰め、説明を 1 行に
   * 簡素化する。プレビューを主役にする文書詳細の左カラム向け（既定 false）。
   */
  readonly compact?: boolean;
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
  onResetStatus,
  compact = false,
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
    // 前回の成功/失敗ステータスをクリアし、ボタン文言・Alert の残留を防ぐ。
    onResetStatus();
    const result = validatePdfFile(picked);
    if (!result.ok) {
      setFile(null);
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    setFile(picked);
  }

  function openPicker(): void {
    if (!pending) inputRef.current?.click();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragActive(false);
    if (pending) return;
    selectFile(e.dataTransfer.files[0]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  }

  function clearSelection(): void {
    setFile(null);
    setValidationError(null);
    onResetStatus();
  }

  const canUpload = file !== null && !pending;

  return (
    <Box sx={{ mb: compact ? 0 : 3 }}>
      <Paper
        variant="outlined"
        role="button"
        tabIndex={pending ? -1 : 0}
        aria-disabled={pending}
        aria-label="PDF をドラッグ&ドロップ、またはクリックして選択"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          if (!pending) setDragActive(true);
        }}
        onDragLeave={() => {
          setDragActive(false);
        }}
        onDrop={handleDrop}
        sx={{
          p: compact ? 1.5 : 4,
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
          accept={ACCEPTED_MIME}
          onChange={(e) => {
            selectFile(e.target.files?.[0]);
            // 同一ファイルの再選択でも onChange が発火するよう値をクリア。
            e.target.value = '';
          }}
        />
        {compact ? (
          <Typography variant="body2">
            PDF をドラッグ&ドロップ、またはクリックして選択（最大{' '}
            {MAX_FILE_SIZE_LABEL}）
          </Typography>
        ) : (
          <>
            <Typography sx={{ mt: 1 }}>
              PDF をドラッグ&ドロップ、またはクリックして選択
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ACCEPTED_MIME} / 最大 {MAX_FILE_SIZE_LABEL}
            </Typography>
          </>
        )}
      </Paper>

      {file !== null && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: compact ? 1 : 2 }}
        >
          <Typography
            variant={compact ? 'body2' : 'body1'}
            noWrap
            sx={{ flexGrow: 1, minWidth: 0 }}
          >
            選択中: {file.name}（{formatSize(file.size)}）
          </Typography>
          <Button
            size={compact ? 'small' : 'medium'}
            disabled={pending}
            onClick={clearSelection}
          >
            選び直す
          </Button>
          <Button
            size={compact ? 'small' : 'medium'}
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
        <Box sx={{ mt: compact ? 1 : 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            アップロード中…
          </Typography>
        </Box>
      )}

      {validationError !== null && (
        <Alert severity="warning" sx={{ mt: compact ? 1 : 2 }}>
          {validationError}
        </Alert>
      )}

      {succeeded && (
        <Alert severity="success" sx={{ mt: compact ? 1 : 2 }}>
          アップロードが完了しました。
        </Alert>
      )}

      {failed && (
        <Alert severity="error" sx={{ mt: compact ? 1 : 2 }}>
          アップロードに失敗しました。対応形式は {ACCEPTED_MIME} のみ・最大{' '}
          {MAX_FILE_SIZE_LABEL}{' '}
          です。権限・通信状況もご確認のうえ「再試行」してください。
        </Alert>
      )}
    </Box>
  );
}
