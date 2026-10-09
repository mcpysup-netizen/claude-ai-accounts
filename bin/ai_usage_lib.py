"""AI 구독 계정 남은 한도 공용 모듈: 등록부·캐시 읽기/쓰기, Codex 한도 조회.
비밀값(토큰·이메일)은 읽지도, 캐시에 쓰지도 않는다.

- Claude: 공식 상태줄 입력의 rate_limits(그 계정으로 세션을 쓸 때 들어옴)를 계정별로 기록해 둔 마지막 관측값.
- Codex: 공식 CLI `codex app-server`의 account/rateLimits/read(모델 호출 없음, 한도 소모 없음).
  실패하면 그 계정 실행 기록(rollout)의 마지막 값.
"""
import glob, json, os, sys, time

REG = os.path.expanduser("~/.config/ai-accounts/accounts.json")
CACHE = os.path.expanduser("~/.cache/ai-usage")
CODEX_THROTTLE = 60  # Codex 조회 간격(초) = 띠 갱신 주기


def registry():
    with open(REG, encoding="utf-8") as f:
        return json.load(f)


def codex_home(acc):
    return os.path.expanduser(acc.get("home", "~/.codex"))


def claude_dir(acc):
    return os.path.expanduser(acc["dir"]) if acc.get("auth") == "configdir" else os.path.expanduser("~/.claude")


def _write(path, data):
    os.makedirs(CACHE, mode=0o700, exist_ok=True)
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


def read_cache(tool, acc_id):
    try:
        with open(os.path.join(CACHE, f"{tool}-{acc_id}.json"), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def record_claude(acc_id, rate_limits):
    """상태줄 입력의 rate_limits에서 사용률·리셋 시각만 저장."""
    windows = {}
    for key in ("five_hour", "seven_day"):
        w = (rate_limits or {}).get(key) or {}
        if w.get("used_percentage") is not None:
            windows[key] = {"pct": float(w["used_percentage"]), "resets_at": w.get("resets_at")}
    if windows:
        # 리셋 직후 한쪽 창이 잠깐 빠져 오는 경우 이전 값 유지(띠가 '-'로 깜빡이지 않게)
        prev = (read_cache("claude", acc_id) or {}).get("windows") or {}
        _write(os.path.join(CACHE, f"claude-{acc_id}.json"), {"observed_at": int(time.time()), "windows": {**prev, **windows}})


def _newest_rollouts(home, n=3):
    files = glob.glob(os.path.join(home, "sessions", "*", "*", "*", "rollout-*.jsonl"))
    return sorted(files, key=os.path.getmtime, reverse=True)[:n]


def _last_rate_limits(path):
    """실행 기록 끝부분에서 마지막 rate_limits 객체를 찾는다."""
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        f.seek(max(0, size - 400_000))
        lines = f.read().decode("utf-8", "ignore").splitlines()
    for line in reversed(lines):
        if '"rate_limits"' not in line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        stack = [obj]
        while stack:
            cur = stack.pop()
            if isinstance(cur, dict):
                rl = cur.get("rate_limits")
                if isinstance(rl, dict) and rl.get("primary"):
                    return rl
                stack.extend(cur.values())
            elif isinstance(cur, list):
                stack.extend(cur)
    return None


def _live_codex(home, timeout=12):
    """codex app-server에 현재 한도를 묻는다(account/rateLimits/read). 실패 시 None."""
    import select, subprocess
    env = dict(os.environ, CODEX_HOME=home)
    try:
        p = subprocess.Popen(["codex", "app-server"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL, text=True, env=env)
    except Exception:
        return None
    try:
        for msg in ({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"clientInfo": {"name": "ai-accounts", "version": "0.2"}}},
                    {"jsonrpc": "2.0", "method": "initialized"},
                    {"jsonrpc": "2.0", "id": 2, "method": "account/rateLimits/read"}):
            p.stdin.write(json.dumps(msg) + "\n")
        p.stdin.flush()
        end = time.time() + timeout
        while time.time() < end:
            r, _, _ = select.select([p.stdout], [], [], 0.5)
            if not r:
                continue
            line = p.stdout.readline()
            if not line:
                break
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("id") == 2:
                return (d.get("result") or {}).get("rateLimits")
    except Exception:
        return None
    finally:
        p.kill()
    return None


def _win_name(mins):
    return {300: "five_hour", 10080: "seven_day"}.get(mins, f"{mins}m")


def refresh_codex(acc_id, acc, force=False):
    path = os.path.join(CACHE, f"codex-{acc_id}.json")
    if not force and os.path.exists(path) and time.time() - os.path.getmtime(path) < CODEX_THROTTLE:
        return read_cache("codex", acc_id)
    home = codex_home(acc)
    data = {"observed_at": None, "windows": {}, "plan": None, "logged_in": os.path.exists(os.path.join(home, "auth.json"))}
    live = _live_codex(home) if data["logged_in"] else None
    if live and live.get("primary"):
        data.update(observed_at=int(time.time()), plan=live.get("planType"), source="live")
        for key in ("primary", "secondary"):
            w = live.get(key)
            if w and w.get("usedPercent") is not None:
                data["windows"][_win_name(w.get("windowDurationMins"))] = {"pct": float(w["usedPercent"]), "resets_at": w.get("resetsAt")}
    else:
        for f in _newest_rollouts(home):  # 조회 실패 시 이 PC 실행 기록의 마지막 값
            rl = _last_rate_limits(f)
            if rl:
                data.update(observed_at=int(os.path.getmtime(f)), plan=rl.get("plan_type"))
                for key in ("primary", "secondary"):
                    w = rl.get(key)
                    if w and w.get("used_percent") is not None:
                        data["windows"][_win_name(w.get("window_minutes"))] = {"pct": float(w["used_percent"]), "resets_at": w.get("resets_at")}
                break
    _write(path, data)
    return data


def _prune_session_caches(max_age=86400):
    for f in glob.glob(os.path.join(CACHE, "cache-*.json")):
        try:
            if time.time() - os.path.getmtime(f) > max_age:
                os.remove(f)
        except OSError:
            pass


def snapshot():
    """전 계정 현재 값 묶음(모드·ai status 공용). 비밀값 없음."""
    _prune_session_caches()
    reg = registry()
    out = []
    for acc_id, acc in reg["claude"]["accounts"].items():
        c = read_cache("claude", acc_id) or {}
        logged = os.path.exists(os.path.join(claude_dir(acc), ".credentials.json")) if acc.get("auth") == "configdir" else True
        out.append({"tool": "claude", "id": acc_id, "name": acc["name"], "owner": acc.get("owner", "personal"), **c,
                    "logged_in": logged, "plan_label": acc.get("plan"), "is_default": acc_id == reg["claude"]["default"]})
    for acc_id, acc in reg["codex"]["accounts"].items():
        c = refresh_codex(acc_id, acc) or {}
        out.append({"tool": "codex", "id": acc_id, "name": acc["name"], "owner": acc.get("owner", "personal"), **c,
                    "plan_label": acc.get("plan"), "home": codex_home(acc), "is_default": acc_id == reg["codex"]["default"],
                    "ever_used": bool(glob.glob(os.path.join(codex_home(acc), "sessions", "*", "*", "*", "rollout-*.jsonl")))})
    return out


def _status():
    now = int(time.time())
    for r in snapshot():
        ws = r.get("windows") or {}

        def f(k):
            w = ws.get(k)
            if not w:
                return "-"
            if w.get("resets_at") and w["resets_at"] < now:
                return "리셋됨"
            left = f"{max(0, 100 - w['pct']):.0f}% 남음"
            return f"{left} (리셋 {time.strftime('%m/%d %H:%M', time.localtime(w['resets_at']))})" if w.get("resets_at") else left

        seen = time.strftime('%m/%d %H:%M', time.localtime(r['observed_at'])) if r.get("observed_at") else "-"
        extra = "" if r.get("logged_in", True) else "  [미로그인]"
        print(f"{r['tool']:6} {r['name']:12} 5h {f('five_hour'):26} 7d {f('seven_day'):26} 관측 {seen}{extra}")


if __name__ == "__main__":
    if sys.argv[1:] == ["json"]:
        print(json.dumps(snapshot(), ensure_ascii=False))
    elif sys.argv[1:] == ["status"]:
        _status()
