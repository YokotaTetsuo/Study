# テスト規約

本プロジェクト（PDF Review）のテスト方針を定める。本ドキュメントは特定のテストが書かれた経緯に依存せず、
**これからどう書くか** の規範として機能する。

## 0. 哲学

本規約の最終目的は、**未来の自分・チームメイト・LLM が読んで意図を取れるテスト** を書くこと。
そのためにテストが満たすべき要件を、目的と設計上の効用の両面から定める。

**3 つの目的** (テストが同時に果たすもの):

1. **リグレッション防止** — 回帰バグを自動検知する
2. **実行可能な仕様** — ビジネスルールを動くドキュメントとして表現する
3. **リファクタリング保護** — 内部実装が変わっても外部振る舞いが保たれることを保証する

このうち最も価値が高いのは 2 と 3。「テストが通っているからリファクタリングできる」「テストを読めば仕様が分かる」状態を目指す。1 だけを目的にすると、assertion はあるが意味を検証していないテストに陥りやすい。

**設計上の効用**: テストは **設計圧力** として機能する。テストしにくいコードはたいてい設計に問題がある (DI 不在、副作用の分散、集約境界の侵犯)。

## 1. テストサイズ分類

Google の Small / Medium / Large 分類を採用し、ファイル名サフィックスで物理分離する。現時点では Small / Medium を PR push 毎に実行する (Large / E2E は Phase 2 で追加予定。詳細は 7 章を参照)。

### Small (`*.small.test.ts(x)`)

- **実行モデル**: 単一プロセス・メモリ内完結
- **禁止事項**: Docker / ネットワーク / 実 FS / 実 DB / 実 S3 / ブラウザ起動
- **目安**: テスト 1 件あたり <100ms (純粋関数主体)、UI コンポーネントテストは 1 件あたり 1 秒未満
- **対象**: ドメイン (値オブジェクト・集約)、アプリケーション (ユースケース)、アダプター (コントローラ・モック使用のゲートウェイ単体)、純粋関数、UI コンポーネント (jsdom + Testing Library)

### Medium (`*.medium.test.ts(x)`)

- **実行モデル**: 同一マシン内の外部プロセス連携 (Postgres / S3 互換)
- **前提**: `docker compose up -d` 済みで `.env` の接続情報が有効
- **目安**: 数秒〜数十秒
- **対象**: リポジトリ実装 (実 DB)、ファイルストレージ実装 (実 S3)、マイグレーション、Hono RPC のラウンドトリップ

### Large (Playwright)

- **実行モデル**: サーバー + クライアント + 周辺サービス起動、ブラウザ駆動
- **目安**: シナリオ単位で数秒、スイート全体で数分
- **対象**: 主要ユーザーフローのハッピーパス + クリティカルな分岐のみ

### 物理分離の仕組み

Vitest の `projects` で Small / Medium を独立 project として登録する。サフィックスを付け忘れたテストファイル (`*.test.ts`) は **いずれの project の `include` にもマッチせず実行されない** ため、レビュー時にファイル名規約を確認項目とする。

```typescript
// server/vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      { test: { name: "small", include: ["src/**/*.small.test.{ts,tsx}"] } },
      { test: { name: "medium", include: ["src/**/*.medium.test.{ts,tsx}"] } },
    ],
  },
});
```

Large は Vitest 外のツール (Playwright) で扱う。

### 配置の判断フロー

1. 集約ルートの内部エンティティを単独テストしようとしていないか → 集約ルート経由でテスト
2. 実 DB / 実 S3 / Docker が必要か → Medium
3. FS 書き込み / TCP・HTTP ソケットを開くか → Medium
4. ブラウザでの UI 操作 / 複数サービス同時起動が必要か → Large
5. それ以外 → Small

迷ったら Small に倒す。実行コストが低いほうがフィードバックループを守れる。

## 2. 層別のテスト戦略

各層には **異なる質問** に答えさせる。同じ振る舞いを複数層で重ねてテストしない。

### Domain 層

**質問**: ビジネスルールは正しく表現されているか?

- **値オブジェクト**: コンストラクタの検証ロジック (同値分割 + 境界値)、ドメイン操作 (等価性 / 正規化 / 演算)
- **エンティティ・集約ルート**: public メソッドごとの正常系・例外系・不変条件
- **集約内部エンティティ**: 単独でテストしない。集約ルート経由の振る舞い検証で網羅する (内部エンティティクラスは export されないため、そもそも単独テスト不可能 — 集約境界の compiler 強制と整合)
- **ドメインエラー**: NotFoundError 等は型ガード関数があれば Small で検証

サイズ: **すべて Small**。Domain 層は副作用ゼロが原則。

### Application 層 (UseCase)

**質問**: ドメインの組み立てとポート呼び出しは正しいオーケストレーションか?

- 正常系の一連の呼び出し (Repository の `findById` → ドメイン操作 → `save`)
- 検出可能な全エラー分岐 (`NotFoundError` / `ValidationError` / `Conflict`)
- 副作用の検証: 「呼ばれた事実」と「ドメインの重要な意思決定が引数に反映されているか」のみを検証する。詳細な書き方は 3.6 を参照
- 値オブジェクトは **本物** を使う (モックしない)

サイズ: **原則 Small**。Repository / Clock / IdGenerator はテストダブルで差し替える。
モック嘘問題 (モックの振る舞いと本物実装の食い違い) は Gateway の Medium テスト (リポジトリ契約の担保) と Large E2E (結合確認) で吸収する。

**例外的に Medium で書くケース**:

- 複数集約をアトミックに更新するユースケース (トランザクション境界の挙動はモックで再現不能)
- `SELECT FOR UPDATE` 等の同時実行制御を使うもの
- DB の特殊機能に依存するもの (advisory lock / トリガー / ltree / jsonb 演算子 等)

例外として Medium にする場合は、テストファイル冒頭に **理由をコメントで記載** すること。
判断が難しい場合は Small を選び、Gateway の Medium テストで補完できないかを先に検討する。

### Adapter 層 (Controller / Gateway)

**質問**: プロトコル変換は正しいか?

- **Controller**: HTTP プロトコル境界のみ。status code、リクエストスキーマ検証、エラー → HTTP マッピング、レスポンスシェイプ。**ビジネスルールは検証しない** (UseCase で検証済み)
- **Gateway (DB)**: ドメインオブジェクトと永続化スキーマのラウンドトリップ、unique / FK / CASCADE 制約の挙動
- **Gateway (外部 HTTP API)**: ドメイン変換・エラーマッピング・リトライ等の挙動検証 (HTTP モックで仮定の挙動を再現)
- **Gateway (外部システム実 API 検証)**: 実 API のレスポンス変動・互換性検証

サイズ:

- Controller → **Small** (UseCase をモック、`app.request()` で HTTP 境界を駆動)
- Gateway (DB / S3) → **Medium** (実 DB / 実 S3)
- Gateway (外部 HTTP API) → **原則 Small** (MSW で HTTP をモック、プロセス内完結)。実 API のレスポンス変動・互換性を確認する場合のみ Medium

### Infrastructure 層

**質問**: 設定・接続・エラー変換は正しいか?

- 設定パーサー (env): Small
- 接続クライアントの生成: Small (コンフィグからの構築だけ検証)
- ポート実装で外部 IO を伴うもの: Medium

### Client 層 (FSD)

**質問**: ユーザーが観察できる振る舞いは正しいか?

| FSD レイヤー                   | サイズ        | 主役                                                                           | ツール                                 |
| ------------------------------ | ------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `shared/lib`                   | Small         | 純粋ユーティリティの入出力                                                     | Vitest                                 |
| `shared/api`, `entities/*/api` | Small         | Hono RPC コール・クエリオプション                                              | Vitest + MSW                           |
| `entities/*/ui`                | Small         | プレゼン UI のレンダリング                                                     | Vitest + jsdom + Testing Library       |
| `features/*/ui`                | Small         | ユーザー操作 → mutation 起動                                                   | Vitest + jsdom + Testing Library + MSW |
| `pages/*`                      | Small + Large | コンポーネント組み立て・状態遷移 (Small) / ルーティング含む E2E フロー (Large) | Vitest + Playwright                    |
| `routes/*`                     | Large         | ルーティング・loader                                                           | Playwright                             |

ピラミッド形を保つ: Small 多数、Large は主要フローだけ。

### Shared 層 (Zod スキーマ)

**質問**: 契約は意図通りか?

- スキーマ自体は TypeScript 型検査で十分 (テスト不要が原則)
- 変換ヘルパー・discriminated union のナローイング関数を追加したら Small でテストする

## 3. テストの品質特性

テストが満たすべき 7 項目。3.1 (FIRST) と 3.6 (テストダブル) は主に Small が対象だが、その他 (観察ベース・カバレッジ目標・AAA・Builder・失敗メッセージ) は **全サイズ共通** で適用する。

### 3.1 FIRST 原則

- **Fast** — 1 章で定めた目安を満たす
- **Isolated** — 順序非依存。グローバル状態に依存しない
- **Repeatable** — 時刻 / 乱数 / 環境差に依存しない (固定時刻・固定 ULID を使う)
- **Self-validating** — pass / fail が機械判定。stdout の目視に頼らない
- **Timely** — 仕様確定と同時に書く (後付けは「現状追認」になりがち)

### 3.2 観察ベースのテスト

集約・ユースケースの **外部から観察可能な振る舞い** だけを検証する:

- private プロパティは覗かない
- 実装詳細 (内部の data structure) には依存しない
- リーク防止のような不変条件も「getter から取得した snapshot が後の mutation で変化しない」のように **振る舞い** として書く
- これによりリファクタリング耐性が生まれる (内部実装が変わってもテストは変わらない)

### 3.3 振る舞いベースのカバレッジ目標

行カバレッジは KPI にしない。assertion のないテストでも 100% 達成可能で、貧血テストを誘発する。
代わりに **振る舞い列挙の網羅** を以下のとおり目標化する:

| 層               | 分母                                                             | 目標 |
| ---------------- | ---------------------------------------------------------------- | ---- |
| 値オブジェクト   | 構築時の有効 / 無効入力 (同値分割 + 境界値)                      | 100% |
| 集約ルート       | public メソッド × 主要分岐 + 不変条件                            | 100% |
| ユースケース     | 正常系 + 検出可能な全エラー分岐                                  | 100% |
| Controller       | HTTP プロトコル境界 (status / バリデーション / エラーマッピング) | 100% |
| Gateway (Medium) | リポジトリインターフェースの全メソッド × 主要シナリオ + 制約挙動 | 100% |
| 純粋関数         | 分岐                                                             | 100% |

層を越えた振る舞いの **重複検証は避ける**:

- Controller のテストでビジネスルールを再検証しない
- ユースケースのテストでドメイン分岐を再検証しない (`Version.create` の検証はドメインで)
- Gateway のテストでビジネスルールを再検証しない

### 3.4 AAA + 1 テスト 1 観点

- **Arrange-Act-Assert** の順で書く。セクション間に空行を入れ視覚的に分離する
- 1 つの `it` で複数の独立した振る舞いを assert しない
- 同じ振る舞いを入力違いで検証する場合は `it.each` でパラメタライズする
- 命名規約は 8 章を参照

```typescript
it.each([
  { input: "", reason: "空文字" },
  { input: "x".repeat(MAX_LENGTH + 1), reason: "最大超" },
])("should throw for invalid description ($reason)", ({ input }) => {
  expect(() => new VersionDescription(input)).toThrow();
});
```

### 3.5 テストデータは Builder で構築

リテラルを散在させず、Test Data Builder で「意図」を表現する:

```typescript
const version = aVersion()
  .forProject(SOME_PROJECT_ID)
  .withDescription("初回提出版")
  .build();
```

- Builder は `a<Entity>()` 形式で提供する (`aVersion()`, `aComment()`)
- `.build()` でテストに使える形を返す (集約の場合は集約インスタンス、集約のメソッド引数の場合は引数オブジェクト)
- 固定 ULID / 固定時刻はテストヘルパーモジュール (`__tests__/builders/` 等) で管理
- Mystery Guest を避けるため、なぜその値かを語る必要がある場合は named factory (`aPersistedVersion()`, `aRejectedVersion()`) で表現
- 既定値は Builder が持ち、テストは「何を変えるか」だけを書く
- Small / Medium テストで同じ Builder を共有する (Medium では `repository.save()` で永続化する)

### 3.6 テストダブルは最小限

**実物優先**。テストダブルを使う基準を明確化する:

| 対象                                                         | 扱い                                             |
| ------------------------------------------------------------ | ------------------------------------------------ |
| Repository / FileStorage / HTTP クライアントなど外部 IO 境界 | テストダブルで差し替える                         |
| Clock / IdGenerator / Random など非決定性ソース              | テストダブルで差し替える                         |
| 値オブジェクト                                               | **本物** を使う (構築時検証も含めて担保するため) |
| 集約・エンティティ                                           | **本物** を使う                                  |
| 純粋関数・エラー型                                           | **本物** を使う                                  |
| ドメインサービス                                             | 原則本物。副作用がある場合のみ検討               |

ドメインオブジェクトをモックするのはアンチパターン。「ドメインをモックしたい」と感じたら **集約境界が緩い / 副作用が分散している** のシグナルとして設計を見直す。

語彙は xUnit Test Patterns (Meszaros) に統一する:

| 種類      | 役割                         | 用例                                              |
| --------- | ---------------------------- | ------------------------------------------------- |
| **Dummy** | 引数を埋めるだけ。呼ばれない | 必要時のみ                                        |
| **Stub**  | 固定値を返す                 | `Clock`, `IdGenerator`                            |
| **Mock**  | 呼び出しを記録し検証         | `Repository` の `vi.fn()`                         |
| **Spy**   | 実装は本物 + 呼び出し記録    | 必要時のみ                                        |
| **Fake**  | 軽量な動く実装               | in-memory repository (テスト数が増えたら導入検討) |

モック呼び出しの検証は **必要な箇所だけ** 行う。

**呼ばれた事実の検証**:

- ❌ 全 `vi.fn()` に `toHaveBeenCalled` を付ける → Fragile Test
- ✅ 「呼ばれたこと」が振る舞いの一部であるものだけ検証 (e.g. エラー時に `save` が呼ばれないこと、正常時に呼ばれること)

**引数の検証**:

| 検証する                                              | 検証しない                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| ID の同一性 (間違った集約を操作していないか)          | 時刻 (Clock スタブで固定されており自明)                               |
| ドメインの新規意思決定 (採番ロジック・状態遷移の結果) | IdGenerator の戻り値の単純転記                                        |
| 「呼ばれない」が振る舞いの一部であるとき              | 入力引数の単純転記                                                    |
|                                                       | 値オブジェクトの内部フィールド全体 (値オブジェクトのテストで担保済み) |

書き方:

- `toHaveBeenCalledWith` でオブジェクト全体を完全一致検証しない (フィールド追加で壊れる)
- `expect.objectContaining({ ... })` で **ドメインの意思決定が反映された部分だけ** を取り出す
- 戻り値で代用できる検証はモックの引数検証より優先する (Result 型から検証できるなら引数検証は省略)

```typescript
// ✅ ドメインの意思決定 (採番 = previous + 1) だけ検証
expect(mockVersionRepository.save).toHaveBeenCalledWith(
  expect.objectContaining({
    number: expect.objectContaining({ value: 4 }),
    projectId: expect.objectContaining({ value: PROJECT_ID }),
  }),
);

// ❌ 自明な転記まで検証 (Fragile)
expect(mockVersionRepository.save).toHaveBeenCalledWith(
  expect.objectContaining({
    createdAt: fixedTime, // Clock スタブで自明
    id: expect.objectContaining({ value: NEW_ID }), // IdGenerator スタブで自明
    description: expect.objectContaining({ value: "v4" }), // 引数転記で自明
  }),
);
```

### 3.7 失敗メッセージはドメイン語彙

`expect(x).toBe(y)` の `x` は **ドメイン用語で読める** べき:

```typescript
// ❌ 何の値か分からない
expect(result.x).toBe(1);

// ✅ ドメイン語彙で失敗メッセージが具体的
expect(version.number.value).toBe(1);
expect(version.comments).toHaveLength(2);
expect(version.comments[0]?.type.value).toBe("REJECTION");
```

テストが失敗したときログに出る式が、そのまま **何が壊れたか** を語れる状態を目指す。

## 4. JSTQB テスト技法の援用

JSTQB のブラックボックステスト技法は **適用が妥当な場面で参照** する。必須化はしない。
技法名をテスト名やコメントに書く必要もない。意識した結果としての網羅性が並んでいればよい。

| 技法               | 適用場面                                                |
| ------------------ | ------------------------------------------------------- |
| 同値分割           | 値オブジェクトの構築で有効 / 無効の代表値をサンプリング |
| 境界値分析         | 文字列長・数値範囲 (0 / 1 / MAX-1 / MAX / MAX+1)        |
| デシジョンテーブル | 複数条件の組合せ (片方必須 / 両方必須 / 排他)           |
| 状態遷移テスト     | 集約のライフサイクル (create → 変更 → 削除)             |
| エラー推測         | null / 空 / 巨大 / 特殊文字 / 重複 ID 等                |

`it.each` でパラメタライズすると境界値群・デシジョンテーブルが表として読める。

## 5. Medium テストの規約

- **隔離**: `beforeEach` でテーブル truncate + シード再投入。`afterEach` ではなく `beforeEach` を使う理由は、失敗時の状態を残して原因調査を可能にするため
- **順序非依存**: テスト同士は独立であること。並列実行可能を維持
- **接続管理**: `beforeAll` でクライアント構築、`afterAll` でクローズ
- **テストデータ**: 全テスト共通のシードは `beforeEach`、テスト固有のデータは `it` 内で投入
- **リソース名衝突回避**: S3 バケット等の共有リソースはテストスイート固有の名前を使い、他スイートと衝突しないようにする

## 6. Large テストの規約

E2E は **主要ハッピーパス + クリティカルな分岐** に限定する。網羅は単体・統合で行い、E2E は「組み合わせて動くこと」だけを保証する。

- 認証 / シード投入は API 経由で行う (UI 操作で setup しない)
- 1 テスト 1 シナリオ
- **failure retry は許容しない**: flaky と判明したら根本対処する。`flaky だから retry` は技術的負債の温床
- 並列実行可能性を維持する (テスト固有のテナント / プロジェクト ID を使う)

## 7. CI ステージング

現時点では **Small / Medium を PR push 毎に実行** する (Large / E2E は Phase 2 でフロントエンド導入時に追加予定)。
テスト数が少ないうちは、ステージング分割による恩恵よりも「PR を上げれば全部のテストが回る」というフィードバックループの単純さを優先する。

| 段階    | 実行内容                                      | 想定時間  |
| ------- | --------------------------------------------- | --------- |
| PR push | typecheck + lint + depcruise + Small + Medium | 10 分以内 |

**将来の分割トリガー**: Large 導入時、または PR push の合計時間が 10 分を恒常的に超えるようになったら、Medium / Large を PR ready 以降に分離する。その場合も Small は PR push に維持することを最優先する (Small が遅延すると開発初期のフィードバックループ全体が崩れるため)。

## 8. 命名規約

- `describe`: 対象を名指す (`Version`, `AddVersionUseCase`, `POST /api/v1/projects`)
- `it`: 振る舞いを宣言する (`should assign number 1 when no previous version exists`)
- 形式: `should <expected> when <condition>` or `should <expected> for <input>`
- 言語は **英語に統一** する (`should X when Y` / `should X for Y` 形式を踏襲)

`describe` / `it` の文字列を上から読んだとき、対象クラスの仕様書として通読できることを目指す。

## 9. テストファイルの配置とデータ管理

**テストファイルの配置 (コロケーション)**:

- テスト本体は **対象ファイルと同じディレクトリに隣接配置** する (例: `version.ts` と `version.small.test.ts` を同居)
- `__tests__/` ディレクトリは **テストヘルパー専用** とする (Builder / 固定値 / モックファクトリ)
- 対象コードとテストを離さない理由: リファクタ時にテストを見落とさないため、該当ファイルを開けば仕様が同時に視野に入るため

**テストデータ・固定値の管理**:

- ULID は `01H...` で始まるテスト用固定値を使い、`__tests__/fixtures/ids.ts` のような場所で `const` 宣言する
- 時刻は `dayjs.utc("2026-04-15T00:00:00.000Z")` のような UTC 固定値
- 環境変数は `process.env` を直接書き換えない (snapshot / restore のヘルパーを経由)
- Builder は `__tests__/builders/` 配下に集約する

## 10. 避けるべきテストの臭い

- **Conditional Test Logic** — テスト内に `if` / `for` の枝分かれ。assert が実行されたか分からなくなる
- **Mystery Guest** — 由来不明な固定値や外部ファイル依存。Builder の named factory で意図を語る
- **Fragile Test** — private プロパティ / 実装詳細に依存。観察可能な振る舞いだけで検証する
- **Eager Test** — 1 テストで複数の独立観点を欲張る
- **Test Code Duplication** — Builder / Object Mother / 共通モックファクトリで吸収する
- **Slow Test in Small** — 1 章の目安を超えるなら **構造を見直す** (過剰な setup・不要な依存・粒度の細かすぎを疑う)。Medium 化しても速くはならない
- **Hidden Dependencies** — `setupFiles` 以外でグローバル状態を変える
- **Test Interference** — 順序に依存する pass / fail
- **Eager Mock Verification** — 全 `vi.fn()` の呼び出し引数を完全一致検証する。フィールド追加で壊れる Fragile Test を生む。`expect.objectContaining` で「ドメインの意思決定が反映された部分」だけを取り出し、時刻・ID 等の単純転記は検証しない (詳細は 3.6 を参照)

## 11. アンチパターン具体例

本章は 10 章「避けるべきテストの臭い」のうち、**詳細な説明や反例で補強が必要なもの** を抜粋する。短い警告だけで十分なものは 10 章のみに記載する。

### 内部エンティティの単独テスト

集約ルートのファイルに同居している内部エンティティ (クラスは `export` されない) を単独でテストしようとする。
集約境界の compiler 強制と矛盾し、そもそも単独構築できない。集約ルート経由でテストする。

### Small テスト内の実 IO

`new pg.Client()` や `new S3Client()` の実体を Small テスト内で構築する。Docker なしで `pnpm test:small` が回らなくなる。境界をモック (Stub / Mock / Fake) で差し替える。

### Controller でのビジネスルール検証

「project_id が空のときどう振る舞うか」を Controller のテストで検証する。
ビジネスルールは UseCase / Domain で検証済み。Controller は HTTP マッピング (400 を返す、エラーボディの shape) だけを検証する。

### ドメインオブジェクトのモック

`vi.mock("./version.js")` で `Version` をモックする。集約境界・不変条件のテストの意味が消える。
**ドメインは本物を使う**。「モックしたい」と感じたら設計のシグナル。
