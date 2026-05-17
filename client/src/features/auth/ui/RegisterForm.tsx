import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import type { RegisterRequest } from '@pdf-review/shared';
import { useState } from 'react';
import type { ReactElement } from 'react';

interface Props {
  readonly onSubmit: (values: RegisterRequest) => void;
  readonly pending: boolean;
  readonly errorMessage?: string | undefined;
}

export function RegisterForm({
  onSubmit,
  pending,
  errorMessage,
}: Props): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = (e: { preventDefault: () => void }): void => {
    e.preventDefault();
    onSubmit({ email, password, displayName });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {errorMessage !== undefined && (
          <Alert severity="error">{errorMessage}</Alert>
        )}
        <TextField
          id="displayName"
          label="表示名"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
          }}
          required
        />
        <TextField
          id="email"
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          required
        />
        <TextField
          id="password"
          label="パスワード（8文字以上）"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
        />
        <Button type="submit" variant="contained" disabled={pending}>
          登録
        </Button>
      </Stack>
    </Box>
  );
}
