// AI 구독 계정 띠·패널 + /ai 전환. 데이터 = `ai json`(비밀값 없음).
// 실행 중인 세션의 로그인은 못 바꾸므로, Claude 전환 = 같은 tmux 칸에서 `ai claude <계정> --resume <이 세션>`으로 다시 띄우기.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AccountRow, Current, SessionCacheInfo, UsageWindow } from '../types'

const PANE = 'ai-accounts'
const rows = atom({ plugin: 'ai-accounts', key: 'rows' } as const, [] as AccountRow[])
const current = atom({ plugin: 'ai-accounts', key: 'current' } as const, { claude: '', codex: '' } as Current)
const note = atom({ plugin: 'ai-accounts', key: 'note' } as const, '')
const cacheAtom = atom({ plugin: 'ai-accounts', key: 'cache' } as const, null as SessionCacheInfo | null)

const ID = /^[a-z0-9_-]+$/
const RING_COLS = 17
/** 터미널 칸이 세로로 길어 반칸 픽셀도 세로가 약 1.16배: 가로를 늘려 원으로 보정. */
const ASPECT = 1.16
const RING_ROWS = 7
const DEFAULT = 0x01000000
const TRACK = 0x4a4a4a

function ringColor(used: number) {
  return used >= 80 ? 0xf87171 : used >= 50 ? 0xfbbf24 : 0x34d399
}

/** 남은 한도 도넛(18x18 픽셀, 칸당 위아래 2픽셀). 위에서 시계방향으로 남은 만큼 칠한다.
 *  빈 픽셀은 공백·반칸 글자로 비워 패널 배경이 그대로 보이게 한다(기본색으로 칠하면 줄무늬가 생김). */
function donut(left: number | null, used: number) {
  const W = RING_COLS
  const cx = (W - 1) / 2
  const c0 = (RING_ROWS * 2 - 1) / 2
  const color = ringColor(used)
  const px = (x: number, y: number) => {
    const dx = (x - cx) / ASPECT
    const d = Math.hypot(dx, y - c0)
    if (d > 6.8 || d < 4.3) return DEFAULT
    if (left === null) return TRACK
    const turn = ((Math.atan2(dx, c0 - y) / (2 * Math.PI)) + 1) % 1
    return turn <= left / 100 ? color : TRACK
  }
  const words = new Uint32Array(RING_COLS * RING_ROWS * 3)
  for (let r = 0; r < RING_ROWS; r++) {
    for (let c = 0; c < W; c++) {
      const i = (r * W + c) * 3
      const top = px(c, r * 2)
      const bot = px(c, r * 2 + 1)
      let cell: [number, number, number]
      if (top === DEFAULT && bot === DEFAULT) cell = [0x20, DEFAULT, DEFAULT]
      else if (top === bot) cell = [0x2588, top, DEFAULT]
      else if (bot === DEFAULT) cell = [0x2580, top, DEFAULT]
      else if (top === DEFAULT) cell = [0x2584, bot, DEFAULT]
      else cell = [0x2580, top, bot]
      words.set(cell, i)
    }
  }
  // toBase64는 런타임에 있으나 es2023 lib 타입에 없음
  return (new Uint8Array(words.buffer) as Uint8Array & { toBase64(): string }).toBase64()
}

function fmtReset(sec: number) {
  const d = new Date(sec * 1000)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function tone(used: number) {
  return used >= 80 ? 'error' : used >= 50 ? 'warning' : 'success'
}

/** 이 세션의 프롬프트 캐시 만료(상태줄 스크립트가 기록). 없으면 null. */
async function sessionCache($: EngineInterface) {
  try {
    const home = await $.env.get('HOME')
    const sid = await $.session.id()
    if (!home || !/^[A-Za-z0-9-]+$/.test(sid)) return null
    const c = JSON.parse(await $.fs.read(`${home}/.cache/ai-usage/cache-${sid}.json`)) as { ttl?: string; expires_at?: number }
    return c.expires_at ? { ttl: c.ttl ?? '', expiresAt: c.expires_at } : null
  } catch {
    return null
  }
}

async function refresh($: EngineInterface) {
  const { exitCode, stdout } = await $.process.run(['bash', '-lc', 'ai json'], { timeoutMs: 15000 })
  if (exitCode === 0) await update($, rows, () => JSON.parse(stdout) as AccountRow[])
  // 캐시 만료 시각은 상태줄이 응답 직후 기록하므로 주기 갱신 때 같이 읽어 띠를 다시 그리게 한다
  const c = await sessionCache($)
  await update($, cacheAtom, () => c)
}

/** tmux 새 창에서 명령 실행. 계정 id는 등록부에 있는 것만 통과. */
async function openWindow($: EngineInterface, name: string, cmd: string) {
  const { stdout: cwd } = await $.process.run(['pwd'])
  const r = await $.process.run(['tmux', 'new-window', '-n', name, '-c', cwd.trim(), 'bash', '-lc', cmd])
  // TMUX 변수가 없는 세션도 tmux 서버가 떠 있으면 마지막 세션에 창이 열린다. 서버가 없으면 직접 실행 안내.
  return r.exitCode === 0 ? '' : `tmux 창을 열 수 없습니다. 터미널에서 직접: ${cmd}`
}

/** 계정 id 또는 표시명(C-WORK 등, 대소문자 무시)을 id로. 등록부에 없으면 null. */
async function resolveAcc($: EngineInterface, tool: 'claude' | 'codex', acc: string) {
  const list = (await read($, rows)).filter(r => r.tool === tool)
  const hit = list.find(r => r.id === acc || r.name.toLowerCase() === acc.toLowerCase())
  return hit && ID.test(hit.id) ? hit.id : null
}

async function known($: EngineInterface, tool: 'claude' | 'codex', acc: string) {
  if (await resolveAcc($, tool, acc)) return ''
  const names = (await read($, rows)).filter(r => r.tool === tool).map(r => r.name).join(', ')
  return `없는 ${tool} 계정: ${acc} (있는 것: ${names})`
}

async function switchTo($: EngineInterface, tool: 'claude' | 'codex', name: string) {
  const acc = await resolveAcc($, tool, name)
  if (!acc) return await known($, tool, name)
  const sid = await $.session.id()
  if (tool === 'claude') {
    // 지금 칸에서 그대로 다시 띄우기(원래 실행 인자·GPT 계정 유지). 실패하면 새 창을 열지 않고 이유를 남긴다.
    const home = await $.env.get('HOME')
    const pane = await $.env.get('TMUX_PANE')
    let why = ''
    if (!home) why = 'HOME 없음'
    else {
      // TMUX_PANE을 못 받는 Claude 버전은 'auto'로 넘겨 스크립트가 부모 프로세스로 칸을 찾게 한다
      const target = pane && /^%\d+$/.test(pane) ? pane : 'auto'
      const gpt = (await read($, current)).codex || (await $.env.get('AI_CODEX_ACCOUNT')) || ''
      const r = await $.process.run(['bash', '-lc', 'ai swap "$@"', 'ai', acc, sid, target, ...(gpt ? [gpt] : [])])
      if (r.exitCode === 0) return `이 칸에서 ${acc} 구독으로 다시 시작합니다.`
      why = `ai swap 종료코드 ${r.exitCode}: ${(r.stderr || r.stdout).trim().slice(0, 200)}`
    }
    if (home) {
      const stamp = new Date().toISOString()
      await $.process.run(['sh', '-c', 'printf "%s\\n" "$1" >> "$2"', 'sh', `${stamp} sid=${sid} acc=${acc} ${why}`, `${home}/.cache/ai-usage/swap-fail.log`])
    }
    const msg = `이 칸에서 전환 실패(${why}). /exit 후 터미널에서: ai claude ${name} --continue`
    await update($, note, () => msg)
    return msg
  }
  // Codex 단독 창(패널 버튼용)
  const cmd = `ai codex ${acc} || read -p '실패했습니다. 위 메시지를 확인하고 Enter로 닫으세요 ' _`
  const err = await openWindow($, `ai-${acc}`, cmd)
  const msg = err || `새 tmux 창 "ai-${acc}"에서 Codex(${acc})를 열었습니다.`
  await update($, note, () => msg)
  return msg
}

async function login($: EngineInterface, tool: 'claude' | 'codex', name: string) {
  const acc = await resolveAcc($, tool, name)
  if (!acc) return await known($, tool, name)
  const err = await openWindow($, `login-${acc}`, `ai login ${tool} ${acc}; echo; read -p '끝났으면 Enter' _`)
  const msg = err || `새 tmux 창 "login-${acc}"에서 로그인을 진행하세요. 끝나면 [r]로 새로고침.`
  await update($, note, () => msg)
  return msg
}

// 시작 준비(명령 등록·현재 계정·1분 갱신). 세션 시작 때뿐 아니라, /reload-plugins로 중간에
// 로드돼 session.start가 오지 않은 세션도 첫 입력·답변 때 한 번 하도록 모듈 변수로 막는다(다시 로드되면 초기화).
let started = false

async function start($: EngineInterface) {
  if (started) return
  started = true
  await $.command.register({ name: 'ai', description: 'AI 계정 남은 한도 패널 / 전환: /ai <계정 이름> · /ai codex <계정 이름>' })
  await refresh($)
  const [c, g] = await Promise.all([$.env.get('AI_CLAUDE_ACCOUNT'), $.env.get('AI_CODEX_ACCOUNT')])
  const list = await read($, rows)
  const def = (tool: string) => list.find(r => r.tool === tool && r.is_default)?.id ?? ''
  await update($, current, () => ({ claude: c ?? def('claude'), codex: g ?? def('codex') }))
  $.clock.every(60_000, () => refresh($))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await start($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await start($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await start($)
    await refresh($)
    $.clock.after(5_000, () => refresh($))
    return next(e)
  })

  // 세션별 GPT 계정: Codex 플러그인은 같은 폴더의 세션들이 중계 프로그램 하나를 공유해 먼저 띄운 세션 계정으로 돈다.
  // Codex를 부르는 Bash 명령 앞에 이 세션 계정의 CODEX_HOME과 계정별 플러그인 데이터 폴더를 붙여 중계 프로그램을 계정별로 나눈다.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!/codex-companion|(^|[;&|(\s])codex(\s|$)/.test(e.command)) return next(e)
    const list = await read($, rows)
    const stored = await read($, current)
    const id = stored.codex || (await $.env.get('AI_CODEX_ACCOUNT')) || list.find(r => r.tool === 'codex' && r.is_default)?.id || ''
    const acc = list.find(r => r.tool === 'codex' && r.id === id)
    const home = await $.env.get('HOME')
    if (!acc?.home || !home || !ID.test(id) || /'/.test(acc.home)) return next(e)
    const base = `${home}/.claude/plugins/data/codex-openai-codex`
    const data = acc.is_default ? base : `${base}-${id}`
    return next({ ...e, command: `export CODEX_HOME='${acc.home}' CLAUDE_PLUGIN_DATA='${data}' AI_CODEX_ACCOUNT='${id}'; ${e.command}` })
  })

  on('command.run', { command: 'ai' }, async ($, e) => {
    const args = e.args.trim().split(/\s+/).filter(Boolean)
    if (args.length === 0) {
      await refresh($)
      await $.ui.open({ id: PANE, title: 'AI 계정 남은 한도', focus: true })
      return { text: 'AI 계정 패널을 열었습니다. 숫자키 = 전환, r = 새로고침.' }
    }
    const text = args[0] === 'codex' ? await switchTo($, 'codex', args[1] ?? '') : await switchTo($, 'claude', args[0] ?? '')
    return { text }
  })

  // 입력창 위 띠: 머리줄 + 계정당 한 줄 표. 칸은 고정폭 Box로 맞춘다(문자 패딩은 한글·기호 폭이 달라 어긋남).
  // 계정 이름 클릭 = 전환(로그인 안 된 계정은 로그인, 사용 중 계정은 상세 패널).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, rows)
    const stored = await read($, current)
    const cur = stored.claude ? stored : { claude: (await $.env.get('AI_CLAUDE_ACCOUNT')) ?? list.find(r => r.tool === 'claude' && r.is_default)?.id ?? '', codex: (await $.env.get('AI_CODEX_ACCOUNT')) ?? list.find(r => r.tool === 'codex' && r.is_default)?.id ?? '' }
    const now = (await $.clock.now()) / 1000
    if (list.length === 0) return next(e)

    const p2 = (x: number) => String(x).padStart(2, '0')
    // 제목선에 이 세션 캐시 만료 표시: 만료 전에 다음 질문을 보내야 캐시를 재사용한다
    const cache = await read($, cacheAtom)
    const cacheText = !cache ? '' : cache.expiresAt <= now
      ? ' 캐시 만료 ──'
      : (() => { const d = new Date(cache.expiresAt * 1000); const m = Math.round((cache.expiresAt - now) / 60); return ` 캐시 ${p2(d.getHours())}:${p2(d.getMinutes())}까지(${m}분) ──` })()
    const titleLeft = '── AI 계정 '
    const dw = (t: string) => [...t].reduce((n, ch) => n + (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/.test(ch) ? 2 : 1), 0)
    const PCT = 5
    const WHEN = 6
    const WHEN7 = 12  // 7일 리셋은 월/일 시:분
    const GAP = 1
    const PLAN = 9
    const narrow = (e.viewport?.columns ?? 80) < 58
    const NAME = narrow ? 9 : 11  // 이름 + 오래된 값 표시(좁은 창 '3h', 넓은 창 '3h전')
    const STALE = 3600  // Claude 값이 1시간 넘게 갱신 안 되면 흐리게
    /** 창 하나 = [남은%][리셋 시각] 두 칸. 5시간은 시:분, 7일은 월/일 시:분. 값 없으면 '-'. */
    const win = (key: string, w: UsageWindow | undefined, short: boolean, unused = false, stale = false) => {
      const expired = !!w?.resets_at && w.resets_at < now
      const left = !w ? null : expired ? 100 : Math.max(0, 100 - w.pct)
      const d = w?.resets_at ? new Date(w.resets_at * 1000) : null
      // Codex는 한 번도 안 쓴 계정이면 리셋 시각이 '지금+7일'로 계속 밀리므로 시각 대신 '사용 전'(실제 실행 기록 유무로 판단)
      const when = !w ? '' : expired ? '리셋됨' : !short && unused ? '사용 전' : !d ? '' : short ? `${p2(d.getHours())}:${p2(d.getMinutes())}` : `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`
      return [
        <Box key={`${key}-p`} width={PCT} justifyContent="flex-end">
          {left === null ? <Text dimColor>-</Text> : stale && !expired ? <Text dimColor>{`${Math.round(left)}%`}</Text> : <Text bold color={tone(100 - left)}>{`${Math.round(left)}%`}</Text>}
        </Box>,
        <Box key={`${key}-w`} width={short ? WHEN : WHEN7} justifyContent="flex-end"><Text dimColor>{when}</Text></Box>,
      ]
    }

    return (
      <Box flexDirection="column">
        {/* 본문과 띠를 가르는 제목선: 화면 폭만큼 그리고 넘치는 부분은 자른다 */}
        <Box flexDirection="row" width="100%">
          {/* 제목선: 왼쪽 AI 계정, 오른쪽 이 세션 프롬프트 캐시 만료 */}
          <Text dimColor wrap="truncate">{titleLeft + '─'.repeat(Math.max(3, (e.props.bodyColumns ?? e.viewport?.columns ?? 60) - 2 - dw(titleLeft) - dw(cacheText))) + cacheText}</Text>
        </Box>
        <Box flexDirection="column" paddingLeft={2}>
        <Box flexDirection="row">
          <Box width={NAME + 2}><Text dimColor>남은한도</Text></Box>
          <Box width={PLAN}><Text dimColor>요금제</Text></Box>
          <Box width={PCT} justifyContent="flex-end"><Text dimColor>5h</Text></Box>
          <Box width={WHEN} justifyContent="flex-end"><Text dimColor>리셋</Text></Box>
          <Box width={GAP} />
          <Box width={PCT} justifyContent="flex-end"><Text dimColor>7d</Text></Box>
          <Box width={WHEN7} justifyContent="flex-end"><Text dimColor>리셋</Text></Box>
        </Box>
        {list.map(r => {
          const tool = r.tool as 'claude' | 'codex'
          const isCur = (tool === 'claude' && r.id === cur.claude) || (tool === 'codex' && r.id === cur.codex)
          const needsLogin = r.logged_in === false
          const press = async () => {
            if (isCur) return void (await $.ui.open({ id: PANE, title: 'AI 계정 남은 한도' }))
            if (needsLogin) return void $.ui.toast(await login($, tool, r.id))
            if (tool === 'codex') {
              // GPT는 이 세션에서 바로 바뀜(다음 Codex 호출부터 적용, 새 창 없음)
              await update($, current, c => ({ claude: c.claude || cur.claude, codex: r.id }))
              return void $.ui.toast(`이 세션의 Codex 계정 = ${r.name} (다음 Codex 호출부터)`)
            }
            $.ui.toast(await switchTo($, tool, r.id))
          }
          const k = `band-${tool}-${r.id}`
          // Claude는 그 계정 세션을 쓸 때만 갱신되므로 1시간 넘은 값은 흐리게 + 경과 시간
          const stale = tool === 'claude' && !!r.observed_at && now - r.observed_at > STALE
          const ageH = stale ? Math.floor((now - (r.observed_at ?? now)) / 3600) : 0
          return (
            <Box key={k} flexDirection="row">
              <Box width={2}><Text color="claude">{isCur ? '▶' : ' '}</Text></Box>
              <Box width={NAME} flexDirection="row">
                <Button key={`chip-${tool}-${r.id}`} plain label={r.name} dimColor={!isCur} onPress={press} />
                {ageH > 0 && <Text dimColor>{narrow ? ` ${ageH}h` : ` ${ageH}h전`}</Text>}
              </Box>
              <Box width={PLAN}><Text dimColor>{r.plan_label ?? ''}</Text></Box>
              {needsLogin ? <Text dimColor>로그인 필요 (클릭)</Text> : [
                ...win(`${k}-5h`, r.windows?.five_hour, true, false, stale),
                <Box key={`${k}-gap`} width={GAP} />,
                ...win(`${k}-7d`, r.windows?.seven_day, false, tool === 'codex' && r.ever_used === false, stale),
              ]}
            </Box>
          )
        })}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const Raster = 'Raster' in ui ? ui.Raster : null  // 터미널 전용, 다른 화면은 숫자만
    const list = await read($, rows)
    const stored = await read($, current)
    const cur = stored.claude ? stored : { claude: (await $.env.get('AI_CLAUDE_ACCOUNT')) ?? list.find(r => r.tool === 'claude' && r.is_default)?.id ?? '', codex: (await $.env.get('AI_CODEX_ACCOUNT')) ?? list.find(r => r.tool === 'codex' && r.is_default)?.id ?? '' }
    const msg = await read($, note)
    const now = (await $.clock.now()) / 1000

    const ring = (key: string, label: string, w?: UsageWindow) => {
      const expired = !!w?.resets_at && w.resets_at < now
      const left = !w ? null : expired ? 100 : Math.max(0, 100 - w.pct)
      const used = left === null ? 0 : 100 - left
      return (
        <Box key={key} flexDirection="column" alignItems="center" marginRight={1}>
          {Raster && <Raster key={`r-${key}`} columns={RING_COLS} rows={RING_ROWS} cells={donut(left, used)} />}
          <Text bold color={left === null ? undefined : used >= 80 ? 'error' : used >= 50 ? 'warning' : 'success'}>
            {label} {left === null ? '-' : `${Math.round(left)}%`}
          </Text>
          <Text dimColor>{w?.resets_at && !expired ? `↻ ${fmtReset(w.resets_at)}` : expired ? '리셋됨' : '기록 없음'}</Text>
        </Box>
      )
    }

    let hot = 0
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>남은 한도</Text>
          <Text dimColor>  원이 비어갈수록 많이 쓴 것  </Text>
          <Button key="refresh" label="새로고침" hotkey="r" onPress={() => refresh($)} />
        </Box>
        <Box flexDirection="row" flexWrap="wrap" alignItems="flex-start">
          {list.map(r => {
            const isCur = (r.tool === 'claude' && r.id === cur.claude) || (r.tool === 'codex' && r.id === cur.codex)
            const tool: 'claude' | 'codex' | null = r.tool
            const needsLogin = r.logged_in === false
            const k = `${r.tool}-${r.id}`
            const canSwitch = tool !== null && !isCur && !needsLogin && hot < 9
            const hk = canSwitch ? String(++hot) : undefined
            return (
              <Box key={k} flexDirection="column" borderStyle="round" borderColor={isCur ? 'claude' : undefined} borderDimColor={!isCur}
                paddingX={1} marginRight={1} marginBottom={1} width={42}>
                <Box>
                  <Text bold color={isCur ? 'claude' : undefined}>{isCur ? '▶ ' : ''}{r.name}</Text>
                  <Text dimColor> {r.owner === 'company' ? '회사' : '개인'} · {tool === null ? '기타' : tool === 'claude' ? 'Claude' : 'GPT'}{isCur ? ' · 사용 중' : ''}</Text>
                </Box>
                {tool === null ? (
                  <Text dimColor>사용량 연동 예정</Text>
                ) : needsLogin ? (
                  <Text dimColor>이 PC에서 아직 로그인 안 함</Text>
                ) : (
                  <Box flexDirection="row" marginTop={1}>
                    {ring(`${k}-5h`, '5시간', r.windows?.five_hour)}
                    {ring(`${k}-7d`, '7일', r.windows?.seven_day)}
                  </Box>
                )}
                {tool !== null && (
                  <Box marginTop={1}>
                    {canSwitch && hk && (
                      <Button key={`go-${k}`} label="이 계정으로 전환" hotkey={hk} onPress={async () => $.ui.toast(await switchTo($, tool, r.id))} />
                    )}
                    {(needsLogin || (tool === 'claude' && !r.windows)) && (
                      <Button key={`login-${k}`} label="로그인" onPress={async () => $.ui.toast(await login($, tool, r.id))} />
                    )}
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
        {msg !== '' && <Text color="warning">{msg}</Text>}
      </Box>
    )
  })
}
