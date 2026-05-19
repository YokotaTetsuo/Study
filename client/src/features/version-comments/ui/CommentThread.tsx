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
  useEditComment,
} from '../model/use-comments';

interface CommentThreadProps {
  readonly documentId: string;
  readonly versionNumber: number;
  /** ログイン中ユーザー ID。自分のコメントにのみ削除を出すために使う。 */
  readonly currentUserId: string | undefined;
}

/**
 * 版に紐づくコメントスレッド。一覧（追加順）＋投稿フォーム＋
 * 著者本人のみの編集・削除を提供する。編集はインライン TextField で
 * 行う（Dialog/Popover を使わないため Portal 規約の対象外）。
 */
export function CommentThread({
  documentId,
  versionNumber,
  currentUserId,
}: CommentThreadProps): ReactElement {
  const comments = useComments(documentId, versionNumber);
  const add = useAddComment(documentId, versionNumber);
  const edit = useEditComment(documentId, versionNumber);
  const remove = useDeleteComment(documentId, versionNumber);
  const [draft, setDraft] = useState('');
  // 編集中のコメント ID と編集用ドラフト本文（null = 編集していない）。
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

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
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {c.authorId} ・{' '}
                      {new Date(c.createdAt).toLocaleString('ja-JP')}
                      {c.updatedAt !== c.createdAt && ' ・ 編集済み'}
                    </Typography>
                    {editingId === c.id ? (
                      <Box
                        component="form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          edit.mutate(
                            { commentId: c.id, content: editDraft },
                            {
                              onSuccess: () => {
                                setEditingId(null);
                              },
                            },
                          );
                        }}
                      >
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          <TextField
                            label="コメントを編集"
                            value={editDraft}
                            onChange={(e) => {
                              setEditDraft(e.target.value);
                            }}
                            multiline
                            minRows={2}
                            fullWidth
                            required
                          />
                          {edit.isError && (
                            <Alert severity="error">
                              コメントを編集できませんでした
                            </Alert>
                          )}
                          <Stack direction="row" spacing={1}>
                            <Button
                              type="submit"
                              size="small"
                              variant="contained"
                              disabled={
                                edit.isPending ||
                                editDraft.trim().length === 0 ||
                                // サーバは CommentContent を trim 正規化する
                                // ため、無変更判定も trim 基準で揃える
                                // （前後空白だけの差分は no-op になる）。
                                editDraft.trim() === c.content
                              }
                            >
                              保存
                            </Button>
                            <Button
                              size="small"
                              disabled={edit.isPending}
                              onClick={() => {
                                edit.reset();
                                setEditingId(null);
                              }}
                            >
                              キャンセル
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    ) : (
                      <Typography
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {c.content}
                      </Typography>
                    )}
                  </Box>
                  {currentUserId === c.authorId && editingId !== c.id && (
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        aria-label="コメントを編集"
                        // 編集 in-flight 中（または別コメント編集中）は
                        // 別コメントの編集開始を抑止する。
                        disabled={
                          remove.isPending ||
                          edit.isPending ||
                          editingId !== null
                        }
                        onClick={() => {
                          // 直前の編集失敗エラーを引きずらないようリセット。
                          edit.reset();
                          setEditingId(c.id);
                          setEditDraft(c.content);
                        }}
                      >
                        編集
                      </Button>
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
                    </Stack>
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
