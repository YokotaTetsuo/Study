import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { router } from './router';

// PC 閲覧を主対象にした一貫テーマ。角丸・余白・見出しの太さを揃え、
// 全ページのレイアウト/タイポグラフィを統一する。
const theme = createTheme({
  shape: { borderRadius: 8 },
  typography: {
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none' },
  },
});
const queryClient = new QueryClient();

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
