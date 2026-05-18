import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { ReactElement } from 'react';

import {
  useAddComment,
  useComments,
  useDeleteComment,
} from '../model/use-comments';

interface CommentThreadProps {
  readonly documentId: string;
  readonly versionNumber: number;
  /** ログイン中ユーザー ID。自分のコメントにのみ削除を出すために使う。 */
  readonly currentUserId: string | undefined;
}

/**
 * 版に紐づくコメントスレッド。一覧（追加順）＋投稿フォーム＋
 * 著者本人のみの削除ボタンを提供する。Dialog/Popover を使わない
 * インライン UI のため Portal 規約の対象外。
 */
export function CommentThread({
  documentId,
  versionNumber,
  currentUserId,
}: CommentThreadProps): ReactElement {
  const comments = useComments(documentId, versionNumber);
  const add = useAddComment(documentId, versionNumber);
  const remove = useDeleteComment(documentId, versionNumber);
  const [draft, setDraft] = useState('');

  return (
    <Stack spacing={2}>
      {comments.isPending && <Typography>コメントを読み込み中…</Typography>}
      {comments.isError && (
        <Alert severity="error">コメントを取得できませんでした</Alert>
      )}
      {comments.data !== undefined &&
        (comments.data.length === 0 ? (
          <Typography color="text.secondary">
            まだコメントはありません。
          </Typography>
        ) : (
          <Stack spacing={1}>
            {comments.data.map((c) => (
              <Box
                key={c.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {c.authorId} ・{' '}
                      {new Date(c.createdAt).toLocaleString('ja-JP')}
                    </Typography>
                    <Typography
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {c.content}
                    </Typography>
                  </Box>
                  {currentUserId === c.authorId && (
                    <Button
                      size="small"
                      color="error"
                      aria-label="コメントを削除"
                      disabled={remove.isPending}
                      onClick={() => {
                        remove.mutate(c.id);
                      }}
                    >
                      削除
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        ))}

      {remove.isError && (
        <Alert severity="error">コメントを削除できませんでした</Alert>
      )}

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(draft, {
            onSuccess: () => {
              setDraft('');
            },
          });
        }}
      >
        <Stack spacing={1}>
          <TextField
            label="コメントを追加"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            multiline
            minRows={2}
            fullWidth
            required
          />
          {add.isError && (
            <Alert severity="error">コメントを投稿できませんでした</Alert>
          )}
          <Box>
            <Button
              type="submit"
              variant="contained"
              disabled={add.isPending || draft.trim().length === 0}
            >
              投稿
            </Button>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
