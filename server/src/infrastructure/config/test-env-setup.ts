import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Medium テスト用。リポジトリルートの .env を読み込み、
 * DB 接続情報を process.env に流し込む（無ければ既定値で動作）。
 */
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
