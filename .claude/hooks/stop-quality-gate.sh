#!/bin/bash
set -uo pipefail

# このターンで TS/設定を編集していたら、停止前に typecheck / lint / test を
# 並列実行し、いずれか失敗した場合のみ Claude を block して修正させる。

INPUT=$(cat)
ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
SID=$(echo "$INPUT" | jq -r '.session_id // "default"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
FLAG="/tmp/.claude-edits-$SID"

# ループガード: フックが促した修正後の 2 周目はスキップ
if [ "$ACTIVE" = "true" ]; then
  rm -f "$FLAG"
  exit 0
fi

# このターンに編集が無ければ何もしない
[ -f "$FLAG" ] || exit 0
rm -f "$FLAG"

[ -n "$CWD" ] || exit 0

CHANGED=$(git -C "$CWD" diff --name-only HEAD 2>/dev/null)
echo "$CHANGED" | grep -qE '\.(ts|tsx|js|mjs|cjs|json)$' || exit 0

NL=$'\n'
INSTRUCTIONS=""

TC_F=$(mktemp); LINT_F=$(mktemp); DEP_F=$(mktemp); TEST_F=$(mktemp)
(cd "$CWD" && pnpm typecheck >"$TC_F" 2>&1) & TC_PID=$!
(cd "$CWD" && pnpm lint >"$LINT_F" 2>&1) & LINT_PID=$!
(cd "$CWD" && pnpm depcruise >"$DEP_F" 2>&1) & DEP_PID=$!
(cd "$CWD" && pnpm test >"$TEST_F" 2>&1) & TEST_PID=$!
wait $TC_PID;  TC_OK=$?
wait $LINT_PID; LINT_OK=$?
wait $DEP_PID; DEP_OK=$?
wait $TEST_PID; TEST_OK=$?

if [ "$TC_OK" -ne 0 ]; then
  INSTRUCTIONS="${INSTRUCTIONS}${NL}- pnpm typecheck が失敗しています。修正してください:${NL}$(tail -30 "$TC_F")"
fi
if [ "$LINT_OK" -ne 0 ]; then
  INSTRUCTIONS="${INSTRUCTIONS}${NL}- pnpm lint が失敗しています。修正してください:${NL}$(tail -30 "$LINT_F")"
fi
if [ "$DEP_OK" -ne 0 ]; then
  INSTRUCTIONS="${INSTRUCTIONS}${NL}- pnpm depcruise が失敗しています（依存方向違反）。修正してください:${NL}$(tail -30 "$DEP_F")"
fi
if [ "$TEST_OK" -ne 0 ]; then
  INSTRUCTIONS="${INSTRUCTIONS}${NL}- pnpm test が失敗しています。修正してください:${NL}$(tail -30 "$TEST_F")"
fi
rm -f "$TC_F" "$LINT_F" "$DEP_F" "$TEST_F"

[ -z "$INSTRUCTIONS" ] && exit 0

REASON="このターンでコード変更があります。停止前に以下をすべて修正してください:${INSTRUCTIONS}"
jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
