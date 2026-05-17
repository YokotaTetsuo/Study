import { defineConfig } from 'vitest/config';

/**
 * テストサイズをファイル名サフィックスで物理分離する（`.claude/rules/testing.md`）。
 * - small: 単一プロセス・メモリ内完結（Docker 不要）
 * - medium: 外部プロセス連携（Postgres / S3 互換。Docker 必要）
 *
 * サフィックス未付与の `*.test.ts` はいずれの project にもマッチせず実行されない。
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'small',
          include: [
            '{client,server,shared,infra}/src/**/*.small.test.{ts,tsx}',
          ],
        },
      },
      {
        test: {
          name: 'medium',
          include: [
            '{client,server,shared,infra}/src/**/*.medium.test.{ts,tsx}',
          ],
          setupFiles: ['./server/src/infrastructure/config/test-env-setup.ts'],
          // 共有 DB を truncate+seed で隔離するため Medium は単一フォーク直列実行。
          fileParallelism: false,
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
  },
});
