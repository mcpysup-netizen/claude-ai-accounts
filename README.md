<p align="right"><b>한국어</b> · <a href="README.en.md">English</a></p>

<p align="center">
  <img src="docs/images/hero.jpg" alt="종이로 만든 터미널 창 위에 원형 게이지 네 개가 달린 계기판 띠가 있고, 그중 하나만 주황으로 선택된 모습" width="100%">
</p>

<h1 align="center">claude-ai-accounts</h1>

<p align="center">
  Claude Code와 Codex(ChatGPT) 구독 계정을 <b>세션마다 골라 쓰고</b>,<br>
  남은 한도를 입력창 바로 위에서 보며 <b>클릭 한 번으로 바꾸는</b> 도구
</p>

<p align="center">
  <img alt="Linux / WSL" src="https://img.shields.io/badge/Linux%20%2F%20WSL-1b2a4a?style=flat-square">
  <img alt="Claude Code 2.1.29x" src="https://img.shields.io/badge/Claude%20Code-2.1.29x-ff8649?style=flat-square">
  <img alt="Codex CLI" src="https://img.shields.io/badge/Codex%20CLI-supported-1b2a4a?style=flat-square">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-5b6478?style=flat-square">
  <a href="https://mcpy.kr/ko?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=badge"><img alt="made by McPY" src="https://img.shields.io/badge/made%20by-McPY-ff8649?style=flat-square"></a>
</p>

---

## 한눈에

- 로그아웃·로그인 없이 **세션 A는 회사 계정, 세션 B는 개인 계정**으로 동시에 씁니다.
- 입력창 위에 계정별 **남은 한도(5시간·7일)와 리셋 시각**이 뜨고, 이름을 누르면 **같은 칸에서 그 계정으로 다시 시작하며 대화는 이어집니다.**
- 훅·메모리·플러그인·MCP 설정은 모든 계정이 **같이 쓰고**, 계정마다 따로인 건 로그인 파일뿐이에요.
- 비공식 API를 부르지 않고, 토큰을 꺼내 저장하지도 않습니다.

<p align="center">
  <img src="docs/images/band-demo.png" alt="Claude Code 입력창 위에 AI 계정 표가 뜬 화면. C-MAIN은 5시간 66%, C-WORK는 8% 남았고, G-MAIN과 G-WORK는 7일 82%와 37%가 남았다" width="100%">
  <br><sub>실제 실행 화면(시연용 가짜 계정). ▶는 이 세션이 쓰는 계정이고, 남은 양이 적을수록 초록에서 노랑, 빨강으로 바뀝니다.</sub>
</p>

## 빠른 시작

```bash
git clone https://github.com/mcpysup-netizen/claude-ai-accounts.git
cd claude-ai-accounts && ./install.sh
ai add claude work C-WORK company && ai login claude C-WORK
```

tmux 안에서 `claude`를 켜고 프롬프트에 아래 한 줄을 넣으면 띠가 생깁니다(`y` → `user` 선택).

```text
/plugin install ai-accounts --marketplace mcpysup-netizen/claude-ai-accounts
```

---

## 왜 만들었나

<p align="center"><img src="docs/images/limit.jpg" alt="종이 인형이 닫힌 문 앞에서 멈춰 있고, 옆의 세로 게이지는 비어 있다. 건너편 길 끝에는 가득 찬 주황 게이지가 있지만 건너갈 다리가 없다" width="88%"></p>

Claude 계정 하나의 5시간 한도가 차면 그 세션은 멈춥니다. 다른 계정은 넉넉한데도 넘어가려면 `/logout`, `/login`, 브라우저 승인을 다시 거쳐야 했어요. 게다가 로그인은 PC 전체에 하나라서, 바꾸는 순간 열어 둔 다른 세션도 같이 바뀌었습니다.

Claude 2계정과 GPT 2계정을 매일 오가며 쓰려고 만든 도구를 공개용으로 정리했어요. 아래 함정은 대부분 직접 겪은 것입니다.

## 설정은 함께, 로그인만 따로

<p align="center"><img src="docs/images/how-it-works.svg" alt="공용 ~/.claude 상자(설정·훅, 메모리·대화 기록, 플러그인·스킬, MCP 설정)를 계정 상자 C-MAIN, C-WORK, G-MAIN·G-WORK가 링크로 가리키는 구조도" width="100%"></p>

Claude Code는 `CLAUDE_CONFIG_DIR`로 설정 폴더를 바꿀 수 있어요([공식 문서](https://code.claude.com/docs/en/env-vars)). 그런데 계정마다 폴더를 통째로 나누면 **훅·메모리·플러그인·MCP 설정까지 조용히 갈라집니다.** 계정 A에서 고친 훅이 계정 B에선 안 돌고, B 세션은 지난주 메모리를 모르게 돼요.

그래서 계정 폴더엔 **로그인 파일만 진짜로 두고, 나머지는 `~/.claude`를 가리키는 링크**로 채웁니다.

```text
~/.claude-accounts/work/
├── .credentials.json     ← 이 계정 로그인 (Claude가 직접 씀)
├── .claude.json          ← 공용 설정 복사본 + 이 계정 정보 키만 보존
└── settings.json, projects/, plugins/, ...  → ~/.claude/... (링크)
```

`.claude.json`만 복사본인 이유는 MCP 서버 목록 같은 공용 설정과 "누구로 로그인했나" 같은 계정 정보가 한 파일에 섞여 있어서예요. 실행할 때마다 공용 설정을 새로 복사하고, 계정 키(`oauthAccount` 등)만 그 계정 것으로 남깁니다.

Codex도 같은 원리로 계정마다 `CODEX_HOME`을 주고([공식 문서](https://learn.chatgpt.com/docs/config-file/config-advanced)), `config.toml`·`AGENTS.md`·스킬·규칙은 `~/.codex`로 링크합니다. 평소 쓰던 기본 로그인(`~/.claude`, `~/.codex`)은 손대지 않아요.

<p align="center"><img src="docs/images/shared.jpg" alt="큰 종이 서랍장 앞에 작은 금고 세 개가 각자 열쇠를 꽂고 있고, 그중 주황 금고 하나만 열려 서랍장과 실로 이어져 있다" width="88%"></p>

## 같은 자리에서 계정만 바꿔 다시 시작

<p align="center"><img src="docs/images/swap.jpg" alt="같은 터미널 창 두 개가 원형 화살표로 이어져 있다. 대화 말풍선은 그대로인데 창 위쪽 이름표만 회색에서 주황으로 바뀌었다" width="88%"></p>

실행 중인 Claude 세션의 로그인은 밖에서 바꿀 수 없어요. 그래서 바꾸지 않고 **같은 자리에서 다시 띄웁니다.** 띠에서 다른 Claude 계정을 누르면 이렇게 돼요.

1. `ai swap`이 지금 tmux 칸의 `claude` 프로세스를 찾아 원래 실행 인자(권한 모드 등)를 읽습니다.
2. 0.5초 뒤 같은 칸을 `ai claude <새 계정> <원래 인자> --resume <이 세션>`으로 다시 띄워요.

창 배치, 권한 모드, 대화는 그대로이고 로그인만 바뀝니다. 0.5초를 기다리는 건, 지금 Claude가 "전환 시작" 응답을 받기 전에 꺼지면 실패로 보이기 때문이에요.

**GPT 계정은 다시 띄울 필요가 없어요.** 띠에서 GPT 이름을 누르면 다음 Codex 호출부터 그 계정으로 돕니다. Codex 플러그인은 같은 폴더의 세션들이 중계 프로세스 하나를 같이 써서 먼저 띄운 세션의 계정으로 돌 수 있어요. 그래서 Codex를 부르는 명령 앞에 이 세션의 `CODEX_HOME`을 붙이고, 계정마다 중계 프로세스를 따로 띄웁니다.

## 남은 한도 숫자는 어디서 오나

| | 출처 | 갱신 |
|---|---|---|
| **Claude** | 상태줄 입력의 `rate_limits` ([공식 문서](https://code.claude.com/docs/en/statusline)) | 그 계정으로 세션을 쓸 때만 |
| **Codex** | `codex app-server`의 `account/rateLimits/read` ([공식 문서](https://learn.chatgpt.com/docs/app-server)) | 1분마다, 한도 소모 없음 |

둘 다 서버가 준 **계정 전체 값**이라 다른 PC에서 쓴 양도 반영돼요. 다만 Claude는 공식 경로로 안 쓰는 계정을 물어볼 방법이 없어서 **마지막으로 본 값**을 보여 줍니다. 1시간이 지난 값은 흐리게 표시하고 이름 옆에 `3h전`처럼 경과 시간을 붙여요.

`/usage` 화면이 쓰는 비공개 주소를 토큰으로 직접 부르면 실시간이 되긴 해요. 하지만 문서에 없는 주소라 언제 바뀔지 모르고, 도구가 토큰 파일을 열어야 해서 공개판에선 뺐습니다.

---

## 설치

| 필요 | 비고 |
|---|---|
| Linux 또는 WSL | 같은 칸 전환이 `/proc`을 씁니다. macOS 미지원 |
| `python3`, `bash` | |
| [Claude Code](https://code.claude.com/docs) 2.1.29x | 모드(플러그인 훅) 기능, 2.1.295에서 확인 |
| `tmux` | 클릭 전환용. 없어도 `ai claude <계정>`은 됩니다 |
| Codex CLI (선택) | GPT 계정을 쓸 때만 |

**1. 설치.** `./install.sh`는 `~/.local/bin/ai`를 만들고 등록부(`~/.config/ai-accounts/accounts.json`)를 생성합니다. 지금 로그인된 계정은 `C-MAIN`, `G-MAIN`으로 등록돼요. 다시 실행해도 안전하고, 기존 등록부와 상태줄은 덮어쓰지 않습니다.

**2. 상태줄 한 줄.** 상태줄이 비어 있으면 설치기가 최소 상태줄을 연결해요. 이미 쓰는 상태줄이 있다면 그 스크립트에 이 한 줄만 넣어 주세요. Claude 남은 한도를 기록하는 유일한 통로입니다.

```bash
printf '%s' "$input" | ai record 2>/dev/null   # $input = 상태줄 입력 JSON
```

**3. 계정 추가·로그인.**

```bash
ai add claude work C-WORK company 'Max 20x'   # id, 표시명(영문 12자 이내), company|personal, 요금제
ai login claude C-WORK                         # Claude가 뜨면 /login → 브라우저 승인 → /exit
ai add codex work G-WORK company Pro
ai login codex G-WORK
```

**4. 모드 설치.** tmux 안 `claude`에서 위의 `/plugin install …` 한 줄을 입력하세요.

## 사용법

| 하고 싶은 것 | 명령 |
|---|---|
| 특정 Claude 계정으로 새 세션 | `ai claude C-WORK` |
| Claude는 C-WORK, Codex는 G-MAIN | `ai claude C-WORK gpt:G-MAIN` |
| 기존 대화를 다른 계정으로 이어가기 | `ai claude C-WORK --resume <세션ID>` |
| Codex를 특정 계정으로 | `ai codex G-WORK` |
| 전 계정 남은 한도 | `ai status` |
| 지금 칸을 다른 계정으로 | 띠에서 이름 클릭, 또는 `/ai C-WORK` |
| 도넛 그래프 패널 | `/ai` |

`ai claude` 뒤의 나머지 인자는 그대로 `claude`에 전달됩니다.

## 보안

| 위치 | 내용 | 비밀값 |
|---|---|---|
| `~/.config/ai-accounts/accounts.json` | 계정 id, 표시명, 회사/개인, 요금제, 폴더 경로 | 없음 |
| `~/.claude-accounts/<id>/.credentials.json` | Claude 로그인 (Claude Code가 직접 관리) | 있음, 이 도구는 열지 않음 |
| `~/.codex-accounts/<id>/auth.json` | Codex 로그인 (Codex CLI가 직접 관리) | 있음, 이 도구는 열지 않음 |
| `~/.cache/ai-usage/*.json` | 사용률(%)·리셋 시각 | 없음 |

`ai login`은 Claude의 `/login`과 `codex login`을 그대로 띄우기만 합니다. 이 도구가 직접 하는 네트워크 요청은 없고, 폴더는 `700`, 파일은 `600` 권한으로 만들어요.

## 처음 쓰면 막히는 곳

- **MCP 로그인은 계정마다 따로예요.** MCP *설정*은 공유되지만 *로그인 토큰*은 계정의 `.credentials.json`에 들어갑니다. 새 계정으로 자동화를 돌렸다가 MCP 로그인이 없어 멈춘 적이 있어요. 새 계정은 한 번 `/mcp`에서 필요한 서버에 로그인하세요.
- **claude.ai 커넥터(Gmail, Drive 등)는 계정에 붙어 있어요.** 로컬 MCP와 달리 그 계정에서 연결한 것만 보입니다.
- **띠를 눌러도 반응이 없으면** `~/.tmux.conf`에 `set -g mouse on`이 있는지 확인하세요. tmux 밖 세션은 같은 칸 전환 대신 수동 방법을 알려 줍니다.

## 한계

- macOS, Windows 네이티브는 아직 안 됩니다(WSL은 됨).
- 안 쓰는 Claude 계정의 한도는 실시간으로 못 봐요.
- Claude Code 모드 기능은 초기 단계(early access)라 버전이 오르면 깨질 수 있습니다. 이슈로 알려 주세요.

## 제거

```bash
./install.sh --uninstall      # ai 명령과 스크립트 제거
```

Claude Code에서 `/plugin uninstall ai-accounts`로 모드를 지웁니다. 등록부와 계정별 로그인 폴더는 로그인을 잃지 않도록 남겨 두니, 필요 없으면 직접 지우세요.

---

## 만든 곳: 맥피(McPY)

<a href="https://mcpy.kr/ko?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=footer"><b>맥피</b></a>는 마케팅과 비즈니스의 문제를 데이터, 코드, AI와 자동화로 풀고, 그 해결법을 제품과 지식으로 쌓는 빌더 브랜드예요. 이 도구도 실제로 쓰다가 막힌 문제를 시스템으로 바꾼 결과입니다.

같이 보면 좋은 글

- [클로드 요금제 가격 비교: 무료·프로·맥스 사용량 한도 정리](https://mcpy.kr/ko/blog/claude-plans-price-usage-limits-2026?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=related)
- [클로드 코드 토큰 사용량이 빨리 줄어드는 이유와 줄이는 법](https://mcpy.kr/ko/blog/claude-code-token-usage-guide?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=related)
- [클로드 코드 설치와 요금제, 사용량 한도 정리](https://mcpy.kr/ko/blog/claude-code-install-price-usage-limits-2026?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=related)
- [코덱스 사용법: Codex 클라우드 작업 시작 방법·요금제 조건 정리](https://mcpy.kr/ko/blog/codex-cloud-tasks-plans?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=related)

## 근거·출처

- [Claude Code, Status line](https://code.claude.com/docs/en/statusline): 상태줄 입력의 `rate_limits`
- [Claude Code, Environment variables](https://code.claude.com/docs/en/env-vars): `CLAUDE_CONFIG_DIR`
- [Claude Code, Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces): GitHub 저장소로 플러그인 설치
- [Codex, Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced): `CODEX_HOME`
- [Codex, App server](https://learn.chatgpt.com/docs/app-server): `account/rateLimits/read`

일러스트 4장은 AI로 만든 설명용 그림이고, 실행 화면은 시연용 가짜 계정으로 찍었습니다. · MIT License
