import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import type { LoginRequest } from '@pdf-review/shared';
import { useState } from 'react';
import type { ReactElement } from 'react';

interface Props {
  readonly onSubmit: (values: LoginRequest) => void;
  readonly pending: boolean;
  readonly errorMessage?: string | undefined;
}

export function LoginForm({
  onSubmit,
  pending,
  errorMessage,
}: Props): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: { preventDefault: () => void }): void => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {errorMessage !== undefined && (
          <Alert severity="error">{errorMessage}</Alert>
        )}
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
          label="パスワード"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
        />
        <Button type="submit" variant="contained" disabled={pending}>
          ログイン
        </Button>
      </Stack>
    </Box>
  );
}
