import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
// Vite: ワーカーを URL として解決し GlobalWorkerOptions に設定する。
// eslint-disable-next-line import-x/default -- Vite の ?url は文字列を default export する
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  /** Cookie 認証付きで取得する PDF の URL。 */
  readonly src: string;
}

export function PdfViewer({ src }: PdfViewerProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    // クロージャ越しの再代入が CFA で追えないため holder で boolean を保つ。
    const token = { cancelled: false };
    let loaded: PDFDocumentProxy | null = null;
    setError(false);
    setDoc(null);
    setPage(1);
    const task = pdfjsLib.getDocument({ url: src, withCredentials: true });
    task.promise.then(
      (pdf) => {
        if (token.cancelled) {
          void pdf.destroy();
          return;
        }
        loaded = pdf;
        setDoc(pdf);
      },
      () => {
        if (!token.cancelled) {
          setError(true);
        }
      },
    );
    return (): void => {
      token.cancelled = true;
      void task.destroy();
      if (loaded !== null) {
        void loaded.destroy();
      }
    };
  }, [src]);

  useEffect(() => {
    if (doc === null) {
      return;
    }
    const token = { cancelled: false };
    let renderTask: RenderTask | null = null;
    void (async (): Promise<void> => {
      try {
        const pdfPage = await doc.getPage(page);
        if (token.cancelled) {
          return;
        }
        const canvas = canvasRef.current;
        if (canvas === null) {
          return;
        }
        const context = canvas.getContext('2d');
        if (context === null) {
          return;
        }
        const viewport = pdfPage.getViewport({ scale: 1.3 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        renderTask = pdfPage.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (e) {
        // ページ切替/アンマウントの cancel 例外のみ無視。
        // それ以外（破損 PDF / CORS 等）はユーザーに失敗を伝える。
        const cancelled =
          token.cancelled ||
          (e instanceof Error && e.name === 'RenderingCancelledException');
        if (!cancelled) {
          setError(true);
        }
      }
    })();
    return (): void => {
      token.cancelled = true;
      if (renderTask !== null) {
        renderTask.cancel();
      }
    };
  }, [doc, page]);

  if (error) {
    return <Alert severity="error">PDF を読み込めませんでした</Alert>;
  }
  if (doc === null) {
    return <Typography>PDF を読み込み中…</Typography>;
  }

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          variant="outlined"
          disabled={page <= 1}
          onClick={() => {
            setPage((p) => Math.max(1, p - 1));
          }}
        >
          前へ
        </Button>
        <Typography variant="body2">
          {page} / {doc.numPages}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={page >= doc.numPages}
          onClick={() => {
            setPage((p) => Math.min(doc.numPages, p + 1));
          }}
        >
          次へ
        </Button>
      </Stack>
      <Box
        sx={{ border: '1px solid', borderColor: 'divider', maxWidth: '100%' }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', maxWidth: '100%' }}
        />
      </Box>
    </Stack>
  );
}
