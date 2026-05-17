import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { apiClient } from '../shared/api/client';

type Status = 'loading' | 'ok' | 'error';

export function App(): ReactElement {
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    apiClient.health
      .$get()
      .then(async (res) => {
        // Hono RPC の型は 200 固定だが、実行時はサーバ障害/プロキシ等で
        // 非 2xx が返り得る。型より広い実行時挙動への防御チェック。
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 型(200固定)より実行時挙動が広いため
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const body = await res.json();
        setStatus('ok');
        setDetail(`db=${body.db} checkedAt=${body.checkedAt}`);
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  const label = status === 'loading' ? '…' : status;

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>PDF Review</h1>
      <p>API: {label}</p>
      {detail !== '' && <p style={{ color: '#888' }}>{detail}</p>}
    </main>
  );
}
