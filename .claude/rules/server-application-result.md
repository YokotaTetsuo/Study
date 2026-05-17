---
name: Application Result DateTime Type
paths: "server/src/**/application/**/*.ts"
---

# Application 層の Result 型は Dayjs を使う

Application 層の Result / DTO 型で日時フィールドを `string` にしない。
`Dayjs` 型のまま保持し、`toISOString()` による文字列化は adapter 層（controller / `toResponse` 等）で行う。

## 理由

- Application 層のテストで dayjs の比較・操作が使える
- 層の責務が明確になる（application = ドメイン表現、adapter = シリアライズ）
- `HealthResult` で確立されたパターンとの一貫性

## 正しいパターン

**Application 層** — `Dayjs` 型を使う:

```typescript
import type { Dayjs } from "dayjs";

export interface SomeFeatureResult {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Dayjs; // Dayjs
  readonly updatedAt: Dayjs; // Dayjs
}
```

**Adapter 層** — レスポンス変換時に文字列化:

```typescript
// toResponse 関数やハンドラ内など、HTTP レスポンスへ変換する直前で文字列化する
function toResponse(result: SomeFeatureResult): SomeFeatureResponse {
  return {
    id: result.id,
    name: result.name,
    createdAt: result.createdAt.toISOString(), // ここで変換
    updatedAt: result.updatedAt.toISOString(),
  };
}
```

## アンチパターン

Application 層で `string` にしてしまう:

```typescript
// NG — Application 層で文字列化している
export interface SomeFeatureResult {
  readonly createdAt: string; // string にしない
  readonly updatedAt: string;
}

export function toSomeFeatureResult(entity: SomeEntity): SomeFeatureResult {
  return {
    createdAt: entity.createdAt.toISOString(), // ここでやらない
    updatedAt: entity.updatedAt.toISOString(),
  };
}
```

> **注**: 既存の Result 型（`ProjectResult` 等）にはまだ `string` を使っているものがある。
> 該当コードを変更する際にこのルールへ移行すること。
