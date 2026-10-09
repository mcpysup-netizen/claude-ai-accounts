<p align="right"><b>한국어</b> · <a href="README.en.md">English</a></p>

<p align="center">
  <img src="docs/images/hero.jpg" alt="종이로 만든 터미널 창 위에 원형 게이지 네 개가 달린 계기판 띠가 있고, 그중 하나만 주황으로 선택된 모습" width="100%">
</p>

<h1 align="center">claude-ai-accounts</h1>

<p align="center">
  <b>Claude Code</b>도 <b>Codex</b>도, 구독 계정을 <b>세션마다 골라 쓰고</b><br>
  남은 한도를 보며 <b>필요할 때 바로 바꾸는</b> 도구
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

- **Claude Code도 Codex도 세션마다 계정을 정해 띄웁니다.** `ai claude C-WORK`, `ai codex G-MAIN`처럼요. 창 A는 회사 Claude, 창 B는 개인 Claude, 창 C는 회사 GPT로 동시에 돌려도 서로 섞이지 않고, 로그아웃·로그인도 필요 없어요.
- **한도가 차면 바로 바꿉니다.** Claude Code 세션은 같은 칸에서 다른 계정으로 다시 떠서 대화가 이어지고, Claude 안에서 부르는 Codex는 다음 호출부터 바뀐 계정으로 돕니다.
- **한 표에서 두 도구 계정을 다 봅니다.** Claude 계정과 GPT 계정의 남은 한도(5시간·7일)와 리셋 시각을 `ai status`나 입력창 위 띠에서 같이 봐요.
- **설정은 같이, 로그인만 따로.** Claude의 훅·메모리·플러그인·MCP 설정, Codex의 `config.toml`·`AGENTS.md`·스킬은 모든 계정이 같이 씁니다.
- 비공식 API를 부르지 않고, 토큰을 꺼내 저장하지도 않습니다.

<p align="center">
  <img src="docs/images/band-demo.png" alt="Claude Code 입력창 위에 AI 계정 표가 뜬 화면. C-MAIN은 5시간 66%, C-WORK는 8% 남았고, G-MAIN과 G-WORK는 7일 82%와 37%가 남았다" width="100%">
  <br><sub>실제 실행 화면(시연용 가짜 계정). C-는 Claude 계정, G-는 GPT(Codex) 계정이에요. ▶는 이 세션이 쓰는 계정이고, 남은 양이 적을수록 초록에서 노랑, 빨강으로 바뀝니다.</sub>
</p>

## 빠른 시작

```bash
git clone https://github.com/mcpysup-netizen/claude-ai-accounts.git
cd claude-ai-accounts && ./install.sh

ai add claude work C-WORK company && ai login claude C-WORK   # Claude 계정 추가
ai add codex  work G-WORK company && ai login codex  G-WORK   # GPT(Codex) 계정 추가

ai claude C-WORK      # 이 세션은 회사 Claude로
ai codex  G-WORK      # 이 세션은 회사 GPT로
```

여기까지만으로 두 도구 모두 세션별 계정 지정이 됩니다. 입력창 위 띠(남은 한도 표·클릭 전환)를 원하면 tmux 안에서 `claude`를 켜고 아래 한 줄을 넣으세요(`y` → `user` 선택).

```text
/plugin install ai-accounts --marketplace mcpysup-netizen/claude-ai-accounts
```

---

## 왜 만들었나

<p align="center"><img src="docs/images/limit.jpg" alt="종이 인형이 닫힌 문 앞에서 멈춰 있고, 옆의 세로 게이지는 비어 있다. 건너편 길 끝에는 가득 찬 주황 게이지가 있지만 건너갈 다리가 없다" width="88%"></p>

Claude와 ChatGPT 구독을 여러 개 쓰면 계정을 고르고 싶은 순간이 두 가지로 생깁니다.

**하나는 세션마다 쓸 계정이 정해져 있을 때예요.** 회사 저장소 작업은 회사 계정으로, 개인 프로젝트는 개인 계정으로 돌리고 싶죠. 그런데 Claude Code도 Codex도 로그인은 PC 전체에 하나(`~/.claude`, `~/.codex`)라서, 바꾸는 순간 열어 둔 다른 세션까지 같이 바뀌었습니다. 세션마다 계정을 나눠 둘 방법이 없었어요.

**다른 하나는 한도가 찼을 때예요.** Claude도 Codex도 5시간·주간 한도가 있고, 차면 그 세션은 멈춥니다. 다른 계정은 넉넉한데도 넘어가려면 로그아웃, 로그인, 브라우저 승인을 다시 거쳐야 했어요.

이 도구는 두 경우를 같은 방식으로 풉니다. 세션을 띄울 때 `ai claude <계정>`이나 `ai codex <계정>`으로 계정을 정하고, 도중에 바꿔야 하면 띠에서 이름을 누르면 돼요. Claude 2계정과 GPT 2계정을 매일 이렇게 나눠 쓰려고 만든 도구를 공개용으로 정리했고, 아래 함정은 대부분 직접 겪은 것입니다.

## 설정은 함께, 로그인만 따로

<p align="center"><img src="docs/images/how-it-works.svg" alt="구조도. 위 줄은 Claude Code: 공용 ~/.claude(설정·훅, 메모리, 플러그인, MCP 설정)를 C-MAIN과 C-WORK가 가리킨다. 아래 줄은 Codex: 공용 ~/.codex(config.toml, AGENTS.md, 스킬)를 G-MAIN과 G-WORK가 가리킨다. 계정 폴더엔 로그인만 따로 있다" width="100%"></p>

두 도구 모두 로그인 폴더를 환경변수로 옮길 수 있어요. Claude Code는 `CLAUDE_CONFIG_DIR`([공식 문서](https://code.claude.com/docs/en/env-vars)), Codex는 `CODEX_HOME`([공식 문서](https://learn.chatgpt.com/docs/config-file/config-advanced))입니다. 그런데 계정마다 폴더를 통째로 나누면 **설정까지 조용히 갈라집니다.** 계정 A에서 고친 훅이나 `AGENTS.md`가 계정 B에선 안 먹고, B 세션은 지난주 메모리를 모르게 돼요.

그래서 계정 폴더엔 **로그인 파일만 진짜로 두고, 나머지는 원래 폴더를 가리키는 링크**로 채웁니다.

```text
~/.claude-accounts/work/                      ~/.codex-accounts/work/
├── .credentials.json   ← Claude 로그인        ├── auth.json        ← Codex 로그인
├── .claude.json        ← 계정 키만 보존        ├── sessions/        ← 이 계정 대화 기록
└── settings.json, projects/, plugins/ ...    └── config.toml, AGENTS.md, skills/ ...
      → ~/.claude/... (링크)                         → ~/.codex/... (링크)
```

Claude 쪽 `.claude.json`만 복사본인 이유는 MCP 서버 목록 같은 공용 설정과 "누구로 로그인했나" 같은 계정 정보가 한 파일에 섞여 있어서예요. 실행할 때마다 공용 설정을 새로 복사하고, 계정 키(`oauthAccount` 등)만 그 계정 것으로 남깁니다. Codex는 대화 기록(`sessions/`)이 계정 폴더마다 따로 쌓여요. 평소 쓰던 기본 로그인(`~/.claude`, `~/.codex`)은 손대지 않습니다.

<p align="center"><img src="docs/images/shared.jpg" alt="큰 종이 서랍장 앞에 작은 금고 세 개가 각자 열쇠를 꽂고 있고, 그중 주황 금고 하나만 열려 서랍장과 실로 이어져 있다" width="88%"></p>

## 도중에 계정 바꾸기

<p align="center"><img src="docs/images/swap.jpg" alt="같은 터미널 창 두 개가 원형 화살표로 이어져 있다. 대화 말풍선은 그대로인데 창 위쪽 이름표만 회색에서 주황으로 바뀌었다" width="88%"></p>

실행 중인 세션의 로그인은 밖에서 바꿀 수 없어요. 그래서 도구마다 방법이 다릅니다.

**Claude Code 세션: 같은 칸에서 다시 띄우고 대화를 이어 갑니다.** 띠에서 다른 Claude 계정을 누르면 `ai swap`이 지금 tmux 칸의 `claude` 프로세스에서 원래 실행 인자(권한 모드 등)를 읽고, 0.5초 뒤 그 칸을 `ai claude <새 계정> <원래 인자> --resume <이 세션>`으로 다시 띄워요. 창 배치, 권한 모드, 대화는 그대로이고 로그인만 바뀝니다.

**Claude 안에서 부르는 Codex: 다시 띄울 필요도 없어요.** 띠에서 GPT 이름을 누르면 다음 Codex 호출부터 그 계정으로 돕니다. Codex 플러그인은 같은 폴더의 세션들이 중계 프로세스 하나를 같이 써서 먼저 띄운 세션의 계정으로 돌 수 있거든요. 그래서 Codex를 부르는 명령 앞에 이 세션의 `CODEX_HOME`을 붙이고, 계정마다 중계 프로세스를 따로 띄웁니다.

**따로 띄운 Codex 세션: 새 계정으로 다시 띄웁니다.** `/exit` 후 `ai codex <새 계정>`으로 열면 돼요. 다만 대화 기록이 계정 폴더마다 따로라서, 다른 계정으로 옮기면 하던 대화를 이어받지 못하고 새로 시작합니다. 같은 계정 안에서는 `ai codex G-WORK resume`으로 이어 갈 수 있어요.

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
| `tmux` | 클릭 전환용. 없어도 `ai claude`·`ai codex`는 됩니다 |
| Codex CLI | GPT 계정을 쓸 때 |

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

| 하고 싶은 것 | Claude Code | Codex |
|---|---|---|
| 이 세션은 처음부터 회사 계정으로 | `ai claude C-WORK` | `ai codex G-WORK` |
| 기존 대화 이어가기 | `ai claude C-WORK --resume <세션ID>` | `ai codex G-WORK resume` |
| Claude 안에서 부를 Codex 계정도 같이 정하기 | `ai claude C-WORK gpt:G-MAIN` | |
| 도중에 다른 계정으로 | 띠에서 이름 클릭, 또는 `/ai C-WORK` | Claude 안: 띠에서 G- 이름 클릭 / 단독: `ai codex <계정>`으로 다시 |

두 도구 공통으로 `ai status`는 전 계정 남은 한도를 표로, `/ai`는 도넛 그래프 패널을 보여 줘요. `ai claude`·`ai codex` 뒤의 나머지 인자는 그대로 `claude`·`codex`에 전달됩니다.

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
- **따로 띄운 Codex는 계정을 옮기면 대화가 안 이어져요.** 대화 기록이 계정 폴더(`~/.codex-accounts/<id>/sessions`)마다 따로라서입니다. 긴 작업은 시작할 때 계정을 정해 두세요.
- **띠를 눌러도 반응이 없으면** `~/.tmux.conf`에 `set -g mouse on`이 있는지 확인하세요. tmux 밖 세션은 같은 칸 전환 대신 수동 방법을 알려 줍니다.

## 한계

- macOS, Windows 네이티브는 아직 안 됩니다(WSL은 됨).
- 안 쓰는 Claude 계정의 한도는 실시간으로 못 봐요(Codex는 1분마다 실시간).
- 띠·클릭 전환은 Claude Code 화면에만 붙어요. Codex 단독 화면에는 띠가 없어서 `ai status`로 확인합니다.
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

- [클로드 코드·코덱스 계정 여러 개, 세션마다 골라 쓰고 한도 차면 전환](https://mcpy.kr/ko/blog/claude-code-account-switch-guide?utm_source=github&utm_medium=referral&utm_campaign=claude-ai-accounts&utm_content=related_intro) (이 도구 소개 글)
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
