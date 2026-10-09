#!/usr/bin/env python3
"""지금 tmux 칸(pane)에서 돌고 있는 Claude를 같은 자리에서 다른 구독으로 다시 띄운다(대화는 --resume으로 이어감).
사용: ai swap <계정 id> <세션 id> <tmux 칸 id(%N) | auto> [GPT 계정 id] [--dry-run]
- 칸은 모드가 Claude 프로세스 환경의 TMUX_PANE으로 넘긴다(못 받는 버전은 auto: 부모 프로세스를 거슬러 찾음).
- 칸 안 claude 프로세스의 원래 실행 인자(권한 모드 등)는 유지하고 --resume/--continue만 정리한다.
- 대화 기록이 아직 없으면(첫 질문 전, /clear 직후) 새 대화로 시작한다.
- Linux 전용(/proc 사용). 칸을 못 찾으면 실패 코드 2."""
import glob, os, re, shlex, subprocess, sys

if len(sys.argv) < 4:
    sys.exit(__doc__)
acc, sid, pane = sys.argv[1], sys.argv[2], sys.argv[3]
AI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai")
# 4번째 인자(선택): 모드가 기억하는 이 세션의 GPT 계정(띠에서 바꾼 값). 없으면 프로세스 환경값.
GPT_ARG = sys.argv[4] if len(sys.argv) > 4 and re.fullmatch(r"[a-z0-9][a-z0-9_-]*", sys.argv[4]) else None
BG_STOP = None
if not (re.fullmatch(r"[a-z0-9_-]+", acc) and re.fullmatch(r"[A-Za-z0-9-]+", sid) and re.fullmatch(r"%\d+|auto", pane)):
    sys.exit("잘못된 인자")

if pane == "auto":
    # 일부 Claude 버전은 모드에 TMUX_PANE을 안 넘긴다. 이 스크립트는 그 Claude의 자식이므로 부모를 거슬러 칸을 찾는다.
    chain, p = set(), str(os.getppid())
    while p and p not in ("0", "1"):
        chain.add(p)
        try:
            p = open(f"/proc/{p}/stat").read().rsplit(")", 1)[1].split()[1]
        except OSError:
            break
    rows = subprocess.run(["tmux", "list-panes", "-a", "-F", "#{pane_id} #{pane_pid}"], capture_output=True, text=True).stdout.split("\n")
    pane = next((r.split()[0] for r in rows if len(r.split()) == 2 and r.split()[1] in chain), None)
    if not pane:
        # 백그라운드 세션(claude --bg, 에이전트 보기): 대화는 tmux 밖 백그라운드 프로세스가 돌린다.
        # → 그 세션을 멈추고(대화 보존) 지금 보고 있는 칸(활성 칸)에서 앞쪽 세션으로 이어간다.
        bg_dir = None
        for f in glob.glob(os.path.expanduser("~/.claude/sessions/*.json")) + glob.glob(os.path.expanduser("~/.claude-accounts/*/sessions/*.json")):
            try:
                d = __import__("json").load(open(f))
            except Exception:
                continue
            if d.get("sessionId") == sid and d.get("kind") == "bg":
                bg_dir = os.path.dirname(os.path.dirname(f))
                break
        if not bg_dir:
            sys.exit("tmux 칸을 찾지 못함(tmux 밖에서 실행 중인 세션)")
        BG_STOP = (bg_dir, sid)
        pane = subprocess.run(["tmux", "display", "-p", "#{pane_id}"], capture_output=True, text=True).stdout.strip()
        if not re.fullmatch(r"%\d+", pane):
            sys.exit("백그라운드 세션: 활성 tmux 칸을 찾지 못함")

# 칸 안의 claude 프로세스 찾기
pp = subprocess.run(["tmux", "display", "-p", "-t", pane, "#{pane_pid}"], capture_output=True, text=True).stdout.strip()
if not pp.isdigit():
    sys.exit(2)


def children(p):
    try:
        return open(f"/proc/{p}/task/{p}/children").read().split()
    except OSError:
        return []


pid, todo = None, [pp]
while todo and not pid:
    p = todo.pop(0)
    try:
        argv0 = os.path.basename(open(f"/proc/{p}/cmdline", "rb").read().split(b"\0")[0].decode())
        exe = os.readlink(f"/proc/{p}/exe")
        if argv0 == "claude" or "/claude/versions/" in exe:  # 버전 파일로 직접 실행된 경우도 인식
            pid = p
            break
    except OSError:
        pass
    todo += children(p)
if not pid:
    sys.exit(2)

args = [a.decode() for a in open(f"/proc/{pid}/cmdline", "rb").read().split(b"\0") if a][1:]
keep, skip = [], False
for a in args:
    if skip:
        skip = False
        continue
    if a in ("--resume", "-r", "--session-id"):
        skip = True
        continue
    if a in ("--continue", "-c", "--bg", "--background") or a.startswith("--resume="):
        continue
    keep.append(a)
env = dict(x.split("=", 1) for x in open(f"/proc/{pid}/environ", "rb").read().decode(errors="ignore").split("\0") if "=" in x)
gpt = GPT_ARG or env.get("AI_CODEX_ACCOUNT")
cwd = os.readlink(f"/proc/{pid}/cwd")

has_history = bool(glob.glob(os.path.expanduser(f"~/.claude/projects/*/{sid}.jsonl")))
cmd = [AI, "claude", acc] + ([f"gpt:{gpt}"] if gpt else []) + keep + (["--resume", sid] if has_history else [])
line = " ".join(shlex.quote(c) for c in cmd)
# 끝나면 칸이 닫히지 않도록 셸로 돌아간다.
# 다시 띄우기는 0.5초 뒤 분리된 프로세스로: 지금 Claude가 이 결과를 받기 전에 꺼지면 전환 실패로 보인다.
if "--dry-run" in sys.argv:
    print(pane, pid, ("[bg stop] " if BG_STOP else "") + line); sys.exit(0)
pre = ""
if BG_STOP:
    # 백그라운드 세션 멈춤(대화 보존). 그 세션을 돌리던 설정 폴더 기준으로 실행.
    d, s_ = BG_STOP
    envp = "" if d == os.path.expanduser("~/.claude") else f"CLAUDE_CONFIG_DIR={shlex.quote(d)} "
    pre = f"{envp}claude stop {shlex.quote(s_)} >/dev/null 2>&1; sleep 1; "
    has_history = True
    cmd = [AI, "claude", acc] + ([f"gpt:{gpt}"] if gpt else []) + keep + ["--resume", sid]
    line = " ".join(shlex.quote(c) for c in cmd)
respawn = ["tmux", "respawn-pane", "-k", "-t", pane, "-c", cwd, f"bash -lc {shlex.quote(line + '; exec bash -l')}"]
subprocess.Popen(["sh", "-c", "sleep 0.5; " + pre + "exec " + " ".join(shlex.quote(x) for x in respawn)],
                 start_new_session=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
sys.exit(0)
