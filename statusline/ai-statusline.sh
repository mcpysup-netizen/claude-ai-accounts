#!/usr/bin/env bash
# 최소 상태줄: 이 세션 계정의 남은 한도를 기록(ai record)하고, 모델·폴더만 한 줄로 보여 준다.
# 이미 쓰는 상태줄이 있다면 이 파일 대신 그 스크립트에 아래 한 줄만 넣으면 된다:
#   printf '%s' "$input" | ai record 2>/dev/null
input="$(cat)"
printf '%s' "$input" | ai record 2>/dev/null
printf '%s' "$input" | python3 -c '
import json, os, sys
try: d = json.load(sys.stdin)
except Exception: d = {}
m = (d.get("model") or {}).get("display_name", "")
cwd = os.path.basename((d.get("workspace") or {}).get("current_dir", "") or "")
acc = os.environ.get("AI_CLAUDE_ACCOUNT", "")
print(" | ".join(x for x in (m, cwd, acc and f"계정 {acc}") if x))'
