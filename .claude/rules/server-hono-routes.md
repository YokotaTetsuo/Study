---
name: Hono Route Type Inference
paths: 'server/src/**/adapters/controllers/**/*.ts,server/src/infrastructure/composition/app.ts'
---

# Hono ルート定義の型推論保護

Hono RPC のエンドツーエンド型安全性は `AppType = ReturnType<typeof createApp>` に依存しており、
型推論が崩壊するとクライアント側で `never` 型になる。コンパイルエラーにならずサイレントに壊れるため、以下を厳守する。

## メソッドチェーンで返す

`createApp` / `createXxxApp` は `return new OpenAPIHono().openapi(...).openapi(...)` のようにメソッドチェーンで返し、
明示的な戻り値型アノテーションを付けない。型推論を保持するため `explicit-function-return-type` の eslint-disable-next-line を理由コメント付きで記載する。

```typescript
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Hono のメソッドチェーンによる型推論を保持するため
export function createProjectApp(deps: ProjectRouteDeps, defaultHook: ...) {
  return new OpenAPIHono({ defaultHook })
    .openapi(createRoute, handler)
    .openapi(listRoute, handler);
}
```

## `as const` は `description` のみ

共通レスポンス定義でオブジェクト全体に `as const` を付けると `content` プロパティが `readonly` になり、
`@hono/zod-openapi` のチェーン時に型が `never` に崩壊する。`as const` は `description` プロパティのみに付ける。

```typescript
// OK
const badRequestResponse = {
  description: 'リクエストが不正' as const,
  content: { 'application/problem+json': { schema: problemDetailSchema } },
};

// NG — content が readonly になり型が never に崩壊する
const badRequestResponse = {
  description: 'リクエストが不正',
  content: { 'application/problem+json': { schema: problemDetailSchema } },
} as const;
```
