#!/usr/bin/env bash
# ai-accounts 설치: `ai` 명령 + 등록부 + 상태줄 기록. 모드(띠·패널)는 끝에 안내하는 /plugin 명령으로 설치.
#   ./install.sh            설치(다시 실행해도 안전, 기존 등록부·상태줄은 건드리지 않음)
#   ./install.sh --uninstall  명령·라이브러리만 제거(등록부·계정 로그인 폴더는 남김)
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
LIB="$HOME/.local/share/ai-accounts"
BIN="$HOME/.local/bin"
REG_DIR="$HOME/.config/ai-accounts"

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$BIN/ai"; rm -rf "$LIB"
  echo "제거함: $BIN/ai, $LIB"
  echo "남겨 둔 것: $REG_DIR(등록부), ~/.claude-accounts/*, ~/.codex-accounts/*(계정별 로그인). 필요하면 직접 지우세요."
  echo "모드 제거: Claude Code에서 /plugin uninstall ai-accounts"
  exit 0
fi

[ "$(uname -s)" = "Linux" ] || { echo "Linux/WSL 전용입니다(같은 칸 전환이 /proc을 씀)." >&2; exit 1; }
for c in python3 bash; do command -v "$c" >/dev/null || { echo "$c 가 필요합니다." >&2; exit 1; }; done
command -v claude >/dev/null || echo "주의: claude 명령을 PATH에서 못 찾았습니다(~/.local/bin/claude 로 시도)."
command -v tmux >/dev/null || echo "주의: tmux가 없습니다. 클릭 한 번 전환은 tmux 안에서만 동작합니다."
command -v codex >/dev/null || echo "참고: codex가 없으면 GPT 계정 기능은 건너뜁니다."

mkdir -p "$LIB" "$BIN"
install -m 755 "$SRC/bin/ai" "$SRC/bin/ai_swap.py" "$SRC/bin/ai_usage_line.py" "$LIB/"
install -m 644 "$SRC/bin/ai_usage_lib.py" "$LIB/"
install -m 755 "$SRC/statusline/ai-statusline.sh" "$LIB/"
ln -sfn "$LIB/ai" "$BIN/ai"
echo "설치: $BIN/ai → $LIB/ai"

mkdir -p "$REG_DIR"; chmod 700 "$REG_DIR"
if [ ! -f "$REG_DIR/accounts.json" ]; then
  install -m 600 "$SRC/examples/accounts.starter.json" "$REG_DIR/accounts.json"
  echo "등록부 생성: $REG_DIR/accounts.json (지금 로그인된 Claude = C-MAIN, ~/.codex = G-MAIN)"
else
  echo "등록부 유지: $REG_DIR/accounts.json"
fi

# 상태줄: 비어 있을 때만 최소 상태줄을 연결한다. 이미 있으면 덮어쓰지 않고 넣을 한 줄만 안내.
SET="$HOME/.claude/settings.json"
python3 - "$SET" "$LIB/ai-statusline.sh" <<'PY'
import json, os, shutil, sys, time
p, script = sys.argv[1:]
try:
    s = json.load(open(p))
except FileNotFoundError:
    s = {}
except Exception:
    print(f"주의: {p} 를 읽지 못해 상태줄은 건드리지 않았습니다."); sys.exit(0)
if s.get("statusLine"):
    print("상태줄이 이미 있습니다. 그 스크립트에 아래 한 줄을 넣어 주세요(남은 한도 기록용):")
    print("    printf '%s' \"$input\" | ai record 2>/dev/null     # $input = 상태줄 입력 JSON")
    sys.exit(0)
os.makedirs(os.path.dirname(p), exist_ok=True)
if os.path.exists(p):
    shutil.copy2(p, f"{p}.bak-ai-accounts-{time.strftime('%Y%m%d%H%M%S')}")
s["statusLine"] = {"type": "command", "command": script}
tmp = p + ".tmp"; json.dump(s, open(tmp, "w"), ensure_ascii=False, indent=2); os.replace(tmp, p)
print(f"상태줄 연결: {script} (원본은 .bak-ai-accounts-* 로 백업)")
PY

case ":$PATH:" in *":$BIN:"*) ;; *) echo "주의: $BIN 이 PATH에 없습니다. ~/.bashrc 에 추가: export PATH=\"\$HOME/.local/bin:\$PATH\"";; esac
cat <<'MSG'

다음 단계
  1) 계정 추가:   ai add claude work C-WORK company
                  ai add codex  work G-WORK company
  2) 로그인(1회): ai login claude C-WORK     (/login 후 /exit)
                  ai login codex  G-WORK
  3) 모드 설치:   tmux 안에서 claude 실행 → 프롬프트에 입력
                  /plugin install ai-accounts --marketplace mcpysup-netizen/claude-ai-accounts
  4) 사용:        ai claude C-WORK   또는 입력창 위 띠에서 계정 이름 클릭
MSG
