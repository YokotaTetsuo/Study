---
name: FSD Architecture Guide
paths: "client/src/**"
---

# FSD Architecture Guide

`CLAUDE.md` のクライアントアーキテクチャ方針と、将来的な `widgets/` 導入も見据えた FSD を参考にしたレイヤー構成に基づき、本ドキュメントは各レイヤーの判断基準・スライス構成・Public API ルール・依存方向を定める。

## 各レイヤーの判断基準

新しい機能やコンポーネントを追加する際、以下の判断基準で配置先を決定する。

### app/

**判断基準**: アプリ全体の初期化やセットアップに関わるか？

### pages/

**判断基準**: URL のルートに 1 対 1 で対応するか？
**注意**: ビジネスロジックや再利用可能な UI は features/ や entities/ に分離する

### widgets/（現状未使用、将来導入時の判断基準）

**ここに置くもの**: ヘッダー、サイドバー、ダッシュボードパネルなど、複数の features/entities を組み合わせた大きな UI ブロック
**判断基準**: 複数の feature や entity を合成し、自己完結した UI ブロックか？

### features/

**判断基準**: ユーザーの操作やビジネスアクションを表現しているか？ 動詞で説明できるか？（「作成する」「検索する」「認証する」）

### entities/

**判断基準**: ビジネスドメインの名詞に対応するか？（「案件」「ユーザー」「工程」）

### shared/

**判断基準**: ドメイン知識を持たず、どの機能からでも再利用可能か？

## スライス内のセグメント構成

各スライス（pages, widgets, features, entities 内のディレクトリ）は以下のセグメントで構成する:

```
features/create-project/
  ui/                  # コンポーネント
    CreateProjectForm.tsx
  model/               # ビジネスロジック、状態管理、型
    useCreateProject.ts
    types.ts
  api/                 # API リクエスト
    createProjectApi.ts
  lib/                 # スライス固有ユーティリティ（必要な場合のみ）
  config/              # 設定定数（必要な場合のみ）
  index.ts             # Public API（必須）
```

- すべてのセグメントが必要なわけではない。必要なものだけ作る
- `ui/` と `model/` が最も一般的
- `shared/` はスライスを持たず、セグメントで直接構成する（`shared/ui/`, `shared/api/` など）

## Public API ルール

各スライスの `index.ts` で外部に公開するものだけを export する:

```typescript
// features/create-project/index.ts
export { CreateProjectForm } from "./ui/CreateProjectForm";
export { useCreateProject } from "./model/useCreateProject";
```

外部からは必ずバレル経由で import する:

```typescript
// OK
import { CreateProjectForm } from "@/features/create-project";

// NG - 内部セグメントへの直接アクセス
import { CreateProjectForm } from "@/features/create-project/ui/CreateProjectForm";
```

## 依存方向ルール

```
app → pages → widgets → features → entities → shared
```

- 矢印の方向にのみ依存可能（上位から下位のみ）
- 同一レイヤー内のスライス間依存は禁止
- 共通ロジックが必要な場合は下位レイヤーに移動する
- 複数スライスの合成が必要な場合は上位レイヤーで行う

## FSD 対象外

- `routes/` — TanStack Router のファイルベースルーティング用ディレクトリ。FSD レイヤーに属さない
- `routeTree.gen.ts` — 自動生成ファイル。手動で編集しない

## Portal 系コンポーネントの配置

`<Dialog>` / `<Popover>` / `<Menu>` / `<Drawer>` などの **portal でレンダリングされる MUI コンポーネント** (および類似の React Portal を使う自前コンポーネント) には、配置に関する独自規約がある。

### 背景: React Portal のイベント伝播

React Portal は DOM 上は `<body>` 直下に切り出されるが、**Synthetic Event は React tree に沿って伝播する**（React 公式仕様）。Dialog 内の `onClick` は、Dialog を JSX 上で囲んでいる祖先 (React tree の親) にも届く。

このため、**clickable な onClick / onChange ハンドラーを持つ祖先** (例: `<AccordionSummary>`, `<ListItemButton>`, `<Card onClick>`, `<Link>`, 自前 `<div onClick>`) の React 子孫として Dialog を render すると、Dialog 内のクリックが祖先のハンドラーを発火させる。

### 規約

#### 1. feature は Button と Dialog を別々に export する

`feature` 内に Trigger Button と Dialog がある場合、両方を **個別に Public API として export** する。これにより呼び出し側は state の所有者を選択できる。

```typescript
// features/edit-something/index.ts
export { EditSomethingButton } from "./ui/EditSomethingButton";
export { EditSomethingDialog } from "./ui/EditSomethingDialog";
```

#### 2. Button は trigger only、open state は持たない

`Button` コンポーネントは `onClick: () => void` を受け取るだけにし、Dialog の open state は内部に持たない。

```typescript
// ✓ OK
interface ButtonProps {
  onClick: () => void;
}
export function EditSomethingButton({ onClick }: ButtonProps): ReactNode {
  return <IconButton onClick={(e) => { e.stopPropagation(); onClick(); }}><EditIcon /></IconButton>;
}

// ✗ NG (Dialog を内包すると、Accordion 内などに置けない / 配置責任が消費側に隠れる)
export function EditSomethingButton(props): ReactNode {
  const [open, setOpen] = useState(false);
  return <><IconButton onClick={() => setOpen(true)} /><EditSomethingDialog open={open} ... /></>;
}
```

#### 3. Dialog は state の所有者で render する

Dialog は、開閉 state (`isOpen` や `editingTarget`) を保持する**親コンポーネント** (typically `pages/` または `widgets/` 配下) で直接 render する。

```typescript
// ✓ OK — pages/project-detail/ui/VersionListSection.tsx
export function VersionListSection(): ReactNode {
  const [editingVersion, setEditingVersion] = useState<VersionResponse | null>(null);
  return (
    <Box>
      {versions.map((v) => (
        <Accordion key={v.id}>
          <AccordionSummary>
            <EditVersionDescriptionButton onClick={() => setEditingVersion(v)} />
          </AccordionSummary>
        </Accordion>
      ))}
      {editingVersion !== null && (
        <EditVersionDescriptionDialog
          versionId={editingVersion.id}
          open
          onClose={() => setEditingVersion(null)}
        />
      )}
    </Box>
  );
}
```

#### 4. Button と Dialog を統合した Convenience Component を作る場合

「Accordion 等の clickable な祖先の中に置かないことが明確」なケースで、呼び出しを簡潔にしたい場合のみ、Convenience wrapper を併設してよい。命名は `XxxWidget` 等で区別する。

```typescript
// features/edit-something/index.ts
export { EditSomethingButton } from "./ui/EditSomethingButton";
export { EditSomethingDialog } from "./ui/EditSomethingDialog";
export { EditSomethingWidget } from "./ui/EditSomethingWidget"; // Convenience
```

ただし、**Convenience wrapper の利用は clickable な祖先がないことを保証できる場合のみ**。Accordion 等の中で使うと再び伝播問題が起きる。

### 適用範囲

本規約は **新規追加・改修時に最初から適用** する。Button は trigger only (`onClick: () => void`)、Dialog は別ファイルで Public API として export、Convenience が必要なら `XxxWidget` 命名で別途併設すること。

> 出典: 本規約は tokyogas-tech/panoptiplan-web の `.claude/rules/client-fsd.md` を基にしている。
> 当該リポにあった既存実装の移行状況テーブル（特定 Issue・特定 feature 一覧）は
> 本プロジェクトには該当しないため取り込んでいない。

### 違反例とアンチパターン

```typescript
// ✗ NG: Dialog が AccordionSummary の React 子孫として render される
<Accordion>
  <AccordionSummary>
    <EditXxxButton>  {/* この中に Dialog を内包 */}
      <Dialog open={open}>...</Dialog>
    </EditXxxButton>
  </AccordionSummary>
</Accordion>
// → Dialog 内クリックが AccordionSummary に伝播 → Accordion が開閉してしまう
```

### `onClick={(e) => e.stopPropagation()}` での回避は最後の手段

どうしても構造変更ができない場合、Dialog 全体に `onClick={(e) => e.stopPropagation()}` を入れることで対症療法的に防衛できるが、**本来の規約は構造で防ぐ** こと。`stopPropagation` は他のクリックイベント (Tooltip 等) との相性が悪く、副作用が読みづらい。
