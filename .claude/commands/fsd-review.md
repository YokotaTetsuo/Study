# FSD Review

変更されたクライアントコード (`client/src/`) が Feature-Sliced Design (FSD) の規約に準拠しているかレビューする。

## レビュー手順

1. 変更されたクライアントのファイル (`client/src/` 配下) を特定する（`routes/` は対象外）
2. 変更ファイルそれぞれについて、以下のチェック項目を検証する
3. 違反があれば具体的なファイルパス・行番号とともに指摘し、修正方法を提案する
4. 違反がなければ簡潔に「FSD 規約に準拠しています」と報告する

## FSD レイヤー階層（上から下への依存のみ許可）

```
app/        — アプリ初期化、プロバイダー、ルーター設定
pages/      — ページ単位のコンポジション（widgets/features を組み合わせる）
widgets/    — 大きな複合 UI ブロック（ヘッダー、サイドバーなど）
features/   — ユーザー操作・ビジネスアクション（例: ログインフォーム、案件作成）
entities/   — ビジネスドメインオブジェクト（例: Project, User）
shared/     — ドメイン非依存の共通基盤（UI キット、API クライアント、ユーティリティ）
```

`routes/` は TanStack Router のファイルベースルーティング用で、FSD レイヤーの外に位置する。チェック対象外とする。

## チェック項目

### 1. レイヤー依存方向

- 上位レイヤーから下位レイヤーへの import のみ許可
- 下位から上位への import は違反（例: `entities/` → `features/`）
- 依存方向: `app → pages → widgets → features → entities → shared`

### 2. 同一レイヤー内のクロスインポート禁止

- 同じレイヤー内のスライス間で import してはいけない
- 例: `features/auth` → `features/cart` は違反
- 共通のロジックが必要なら下位レイヤーに移動するか、上位レイヤーで合成する

### 3. Public API（バレルエクスポート）

- 各スライスは `index.ts` で公開 API を定義する
- 外部からスライス内部のセグメントに直接アクセスしてはいけない
  - OK: `import { ProjectCard } from '@/entities/project'`
  - NG: `import { ProjectCard } from '@/entities/project/ui/ProjectCard'`

### 4. セグメント構成

各スライス内で使用可能なセグメント:

- `ui/` — コンポーネント、スタイル
- `model/` — ビジネスロジック、状態管理、型定義
- `api/` — API リクエスト
- `lib/` — スライス固有のユーティリティ
- `config/` — 設定定数

上記以外のセグメント名が使われている場合は指摘する。

### 5. shared レイヤーの制約

- `shared/` にドメイン固有のビジネスロジックを置いてはいけない
- `shared/` はスライスを持たず、セグメント（`ui/`, `api/`, `lib/`, `config/`）で直接構成する

### 6. pages レイヤーの責務

- `pages/` は主に widgets/features を組み合わせる役割
- 大量のビジネスロジックや UI コンポーネント定義を直接含むべきではない
- ロジックが大きい場合は `features/` や `entities/` への分離を提案する

### 7. Portal 系コンポーネントの配置 (Dialog / Popover / Menu / Drawer)

`.claude/rules/client-fsd.md` の「Portal 系コンポーネントの配置」セクションに準拠しているかをチェックする。新規 / 改修 feature は 7.1〜7.3 で厳格にチェックする。

#### 7.1 Trigger Button と Dialog の分離

Feature 内に Trigger Button と Dialog がある場合、以下を確認:

- [ ] Button と Dialog が **別ファイル** (例: `XxxButton.tsx` と `XxxDialog.tsx`) になっているか
- [ ] `index.ts` で **両方が Public API として export** されているか
- [ ] Button が `useState<boolean>` で Dialog の open state を内包していないか (Convenience wrapper 以外で)
- [ ] Button が `onClick: () => void` のような **trigger 専用 props** を受け取るか

違反パターン:

```typescript
// ✗ NG: Button が Dialog を内包し、open state を持つ (Convenience でない通常の Button)
export function XxxButton(props): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton onClick={() => setOpen(true)} />
      <XxxDialog open={open} ... />  {/* Button の React 子孫 */}
    </>
  );
}
```

#### 7.2 Dialog の render 位置

`<Dialog>`, `<Popover>`, `<Menu>`, `<Drawer>` などが、**clickable な祖先** (`<Accordion>`, `<AccordionSummary>`, `<ListItemButton>`, `<Card onClick>`, `<Link>`, 自前 `<div onClick>` 等) の **React 子孫として render されていないか** を確認する。

検出方法 (heuristic):

1. 変更 diff 内で新規追加された `<Dialog`, `<Popover`, `<Menu`, `<Drawer` を grep
2. その JSX が含まれる component の利用箇所 (import chain) を辿る
3. 利用箇所の祖先に `<Accordion>` `<AccordionSummary>` `<ListItemButton>` 等が無いか確認

違反検出時:

- ✗ NG: Dialog が clickable な祖先の React 子孫として render されている
- ✓ OK: Dialog が pages / widgets レベルで render され、Button だけが祖先内にある

#### 7.3 `onClick={(e) => e.stopPropagation()}` の検出

Dialog / Modal 系コンポーネントに `onClick={(e) => e.stopPropagation()}` が付いている場合、**構造的解決の機会** を逃している可能性がある。

- Dialog 全体に `onClick={stopPropagation}` が付いている → 「7.1 / 7.2 の規約に従って Button と Dialog を分離し、Dialog を state 所有者で render してください」と提案
- IconButton 等の trigger 自体に `onClick={(e) => { e.stopPropagation(); ... }}` が付いているのは **OK** (Trigger は clickable な祖先内に置かれることを想定して問題ない)

## 出力形式

違反ごとに以下の形式で報告する:

```
### [違反種別] ファイルパス:行番号

**問題**: 具体的な違反内容
**修正案**: どう直すべきか
```

最後に違反数のサマリーを付ける。
