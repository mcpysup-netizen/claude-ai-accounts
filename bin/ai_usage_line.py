#!/usr/bin/env python3
"""상태줄 입력(stdin JSON)에서 이 세션 Claude 계정의 남은 한도와 프롬프트 캐시 만료를 기록한다. 화면 출력 없음.
이 세션 계정 = $AI_CLAUDE_ACCOUNT (없으면 등록부 기본값). 상태줄 스크립트에서 `ai record`로 부른다."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_usage_lib as L


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    reg = L.registry()
    cur = os.environ.get("AI_CLAUDE_ACCOUNT") or reg["claude"]["default"]
    if payload.get("rate_limits") and cur in reg["claude"]["accounts"]:
        L.record_claude(cur, payload["rate_limits"])
    pc, sid = payload.get("prompt_cache") or {}, payload.get("session_id")
    if pc.get("expires_at") and sid and all(ch.isalnum() or ch == "-" for ch in sid):
        # 세션별 프롬프트 캐시 만료 시각(모드 띠가 이 세션 것만 읽음)
        L._write(os.path.join(L.CACHE, f"cache-{sid}.json"),
                 {"ttl": pc.get("ttl"), "expires_at": pc.get("expires_at"), "updated": int(time.time())})


if __name__ == "__main__":
    main()
