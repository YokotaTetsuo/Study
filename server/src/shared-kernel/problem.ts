import type { ProblemDetail } from '@pdf-review/shared';

/**
 * 全モジュール共通の RFC7807（application/problem+json）本体ビルダー。
 * 本体の形（type/title/status/detail）だけを一元化する。`status` は
 * リテラル型を保持したまま返すため、各モジュールは自分のルートが宣言
 * する範囲の狭い ProblemStatus を維持でき、Hono のルート型推論
 * （.claude/rules/server-hono-routes.md）を壊さない。
 */
export function makeProblem<S extends number>(
  status: S,
  title: string,
  detail: string,
): { readonly status: S; readonly body: ProblemDetail } {
  return { status, body: { type: 'about:blank', title, status, detail } };
}
