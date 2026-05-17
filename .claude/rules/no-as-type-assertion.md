# `as` 型アサーション禁止

TypeScript コードで `as` による型アサーション（型キャスト）を使用しない。`as const` は許可する。

`as` キャストは型安全性を下げ、手戻りの原因になるため、絶対に不可避な場合を除いて使用禁止。

## 代替手段

| やりたいこと                                 | NG                                         | OK                                      |
| -------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| `readonly T[]` に `.includes(string)` を通す | `(ARRAY as readonly string[]).includes(v)` | `ARRAY.some((item) => item === v)`      |
| バリデーション後に型を絞る                   | `value as NarrowType`                      | type guard 関数を抽出して narrowing     |
| union レスポンスから成功型を取り出す         | `response as SuccessType`                  | conditional type でジェネリクスから推論 |
| `unknown` のプロパティにアクセス             | `body as { prop: unknown }`                | `in` 演算子や `typeof` で narrowing     |

## どうしても不可避な場合

ジェネリック型パラメータの narrowing が効かない等、TypeScript の制約で回避不能な場合のみ許容する。
その場合は理由をコメントで明記すること。

```typescript
// ジェネリック R に対して .ok チェックでの narrowing が効かないため
return response.json() as Promise<ExtractSuccessBody<R>>;
```
