# 思考の席

打った言葉が生き物になって画面を漂い、放置すると枯れ、クリックで水やりすると
息を吹き返す——「考えたことの生態系」を体験する単一の TypeScript ブラウザアプリ。

**永続化しません。** リロードで思考が消えるのは仕様です（コンセプトの核）。

## セットアップ / 開発

パッケージマネージャは **pnpm**、Node.js は **v24**。

```bash
pnpm install
pnpm dev            # Vite 開発サーバ
pnpm build          # 型ビルド + Vite 本番ビルド
pnpm preview        # ビルド成果物をローカル配信
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
pnpm test           # Vitest（1回実行）
pnpm test:watch     # Vitest watch
```

## アーキテクチャ

テスト容易性のため、**純粋なシミュレーション層を描画から完全に分離**しています。

```
src/
  main.ts          # DOM/入力/RAF ループの配線のみ
  sim/             # DOM・canvas に触れない純粋ロジック（単体テスト対象）
    rng.ts         # seed 付き決定的 RNG
    hash.ts        # text → 決定的 hue
    thought.ts     # Thought 型と純粋関数（create/step/water）
    world.ts       # 思考集合の管理（spawn/step/water/link/prune）
  render/
    renderer.ts    # canvas2D 描画のみ（薄く保つ）
test/              # Vitest。sim 層を決定的にテスト
```

`sim/` は副作用なし。乱数は `rng`、時間は明示 `dt` で注入し、テストを決定的に保ちます。
