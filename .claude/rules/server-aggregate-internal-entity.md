---
name: Aggregate Internal Entity Placement
paths: "server/src/**/domain/**/*.ts"
---

# 集約内部エンティティの配置

DDD の集約パターンを実装する際、**集約ルートと内部エンティティは同一ファイルに同居** させ、内部エンティティを外部から構築不可能にする。

## ルール

集約ルートのファイル（例: `version.ts`）に内部エンティティクラスを同居させ、以下を守る:

- 内部エンティティのクラス本体は `export` しない
- 代わりに **読み取り専用ビュー interface（例: `CommentReadonly`）を export** する（getter のみ、mutator は意図的に含めない）
- 内部エンティティのコンストラクタは `private`
- 集約ルートの mutator メソッド（例: `addComment` / `updateComment`）の戻り値型と `comments` getter の戻り値型は **読み取り専用 interface** を使う

これにより、外部ファイルからは内部エンティティを **コンパイラレベルで** 構築・改変できなくなる:

- `new InternalEntity(...)` → エラー（identifier がない）
- `InternalEntity.create(...)` → エラー（同上）
- `const x: InternalEntity = ...` → エラー（値・型ともに公開されていない）
- `const x: ReadonlyView = aggregate.add(...)` → OK（読み取り専用ビューは公開されている）
- `x.edit(...)` → エラー（読み取り専用 interface に mutator は含まれない）

値オブジェクトと NotFoundError は **独立ファイルで OK**:

| 種類                                       | 配置                                     | 理由                                                  |
| ------------------------------------------ | ---------------------------------------- | ----------------------------------------------------- |
| 値オブジェクト (例: `CommentId`)           | 独立ファイル、独立 export                | API 境界などから自由に生成して良い                    |
| NotFoundError (例: `CommentNotFoundError`) | 独立ファイル、独立 export                | UseCase 層でキャッチして HTTP 変換するため公開必須    |
| 内部エンティティ (例: `Comment`)           | 集約ルートに同居、クラスは export しない | 集約ルート経由のみで生成・操作                        |
| 読み取り専用ビュー (例: `CommentReadonly`) | 集約ルートと同居して export（interface） | 集約外で戻り値型として参照、ただし mutator は呼べない |

## 理由

TypeScript には `package-private` / `internal` のような「同一モジュール内のみ可視」の修飾子が無い。クラスを別ファイルに置いて `export` した時点で、外部からの `static create` 呼び出しを言語レベルで禁止できない。

集約ルートと内部エンティティを同居させることで:

- **集約境界がコンパイラ強制される** — 規約や CI ルールに頼らない
- **集約は「読み・書き・整合性の単位」** という DDD 概念がコード構造で表現される
- **Repository が内部エンティティを直接扱う設計の誘惑が消える** — `Aggregate.reconstruct` に生データを渡すパターンが自然になる

## 正しいパターン

```typescript
// version.ts (集約ルート + 内部エンティティ Comment を同居)
import type { Dayjs } from "dayjs";
import { CommentId } from "./comment-id.js";
import { CommentAuthorName } from "./comment-author-name.js";
import { CommentContent } from "./comment-content.js";
import { CommentType } from "./comment-type.js";
import { CommentNotFoundError } from "./comment-not-found-error.js";
// ... 他の import ...

class Comment {
  // export しない
  readonly id: CommentId;
  readonly authorName: CommentAuthorName;
  // ...

  private constructor(params: { /* ... */ }) {
    // ...
  }

  static create(params: { /* ... */ }): Comment {
    // ...
  }
  static reconstruct(params: { /* ... */ }): Comment {
    // ...
  }

  edit(params: { /* ... */ }): void {
    // ...
  }
}

/**
 * 集約外から内部エンティティ Comment を読み取るためのビュー型。
 * `edit()` などの mutator は意図的に含めず、集約境界をコンパイラ強制する。
 */
export interface CommentReadonly {
  readonly id: CommentId;
  readonly authorName: CommentAuthorName;
  readonly content: CommentContent;
  readonly type: CommentType;
  readonly createdAt: Dayjs;
  readonly updatedAt: Dayjs;
}

export class Version {
  // ...

  static reconstruct(params: {
    // ...
    commentsData: ReadonlyArray<{
      // 生データを受け取る
      id: string;
      authorName: string;
      content: string;
      type: string;
      createdAt: Dayjs;
      updatedAt: Dayjs;
    }>;
  }): Version {
    const comments = params.commentsData.map((d) =>
      Comment.reconstruct({
        // 同一ファイル内なので呼べる
        id: new CommentId(d.id),
        authorName: new CommentAuthorName(d.authorName),
        content: new CommentContent(d.content),
        type: new CommentType(d.type),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }),
    );
    return new Version({ /* ..., */ comments });
  }

  addComment(params: { /* ... */ }): CommentReadonly {
    const comment = Comment.create(params); // 同一ファイル内なので呼べる
    this.#comments.push(comment);
    // ...
    return comment; // Comment は CommentReadonly 互換（structural typing）
  }

  get comments(): readonly CommentReadonly[] {
    // 戻り値型は読み取り専用ビュー
    return [...this.#comments];
  }
}
```

```typescript
// list-comments-usecase.ts (集約外)
import type { CommentReadonly } from "../domain/version.js"; // 読み取り専用ビューを import (OK)
// import { Comment } from "../domain/version.js";   // ← エラー: Comment は値・型とも export されていない

const comments: readonly CommentReadonly[] = version.comments; // OK
const added: CommentReadonly = version.addComment({
  /* ... */
}); // OK
// added.edit(...);  // ← エラー: CommentReadonly に edit() は無い（集約境界をコンパイラ強制）
// const c = Comment.create(...);                    // ← エラー: identifier 'Comment' がない
```

### なぜ `export type { Comment }` ではなく `export interface CommentReadonly` か

`export type { Comment }` だと **クラス全体の型シグネチャ** が公開される。Comment クラスに mutator (`edit()`) があれば、それも型として公開される:

```typescript
// 危険なパターン
export type { Comment }; // ← edit() も型として公開される

// 集約外で
const added: Comment = version.addComment({ /* ... */ });
added.edit({ content: ... }); // ← 型レベルで通ってしまう（実行時にも動く）
// → Version.updatedAt の同期が壊れる、集約境界の侵犯
```

専用の `CommentReadonly` interface を export することで、**mutator を型レベルで隠蔽** できる。集約ルートの mutator メソッド経由でしか Comment を改変できない、という不変条件をコンパイラ強制する。

## アンチパターン

内部エンティティを別ファイルに切り出して `export` する:

```typescript
// comment.ts ← このファイル自体がアンチパターン
export class Comment {
  static create(/* ... */) {
    /* ... */
  } // 外部から自由に呼べてしまう
  // ...
}
```

この場合、「`Comment.create` を集約外から呼ばない」というルールが **コードレビュー依存** になり、誤用の門が開く。

## Repository への影響

集約のロード/保存は **集約ルート経由** で行う。Repository は内部エンティティクラスを `import` できないため、**生データの配列を集約ルートに渡し、内部エンティティの構築は集約に委ねる**:

```typescript
// drizzle-version-repository.ts
async findById(id: VersionId): Promise<Version | null> {
  const versionRow = await /* DB から versions 行を取得 */;
  if (!versionRow) return null;
  const commentRows = await /* DB から comments 行を取得 */;

  return Version.reconstruct({
    // ... Version の値オブジェクト群
    commentsData: commentRows.map((r) => ({ // 生データのまま渡す
      id: r.id,
      authorName: r.authorName,
      content: r.content,
      type: r.type,
      createdAt: dayjs(r.createdAt),
      updatedAt: dayjs(r.updatedAt),
    })),
  });
}
```

これにより Repository が集約境界を侵犯しない設計になる。

## テスト

内部エンティティ単体のテストファイル（例: `comment.small.test.ts`）は **作らない**。テストは集約ルート単位で行う:

- 集約全体の振る舞いを集約ルートのテスト（例: `version.small.test.ts`）で網羅
- 内部エンティティの不変条件（例: `Comment.authorName` 編集不可）も集約ルートのメソッド経由で検証

これは「集約は集約ルート経由でしかアクセスしない」という DDD 原則と整合する。
