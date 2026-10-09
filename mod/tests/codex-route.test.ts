import { expect, test } from 'claude-code/testing'

const ROWS = [
  { tool: 'codex', id: 'work', name: 'G-WORK', owner: 'company', home: '/home/u/.codex-accounts/work', is_default: false, logged_in: true },
  { tool: 'codex', id: 'personal', name: 'G-MAIN', owner: 'personal', home: '/home/u/.codex', is_default: true, logged_in: true },
]

test('Codex 호출 Bash 명령에 이 세션 GPT 계정 환경을 붙이고, 다른 명령은 그대로 둔다', async ($, on) => {
  const seen: string[] = []
  const ENV: Record<string, string> = { AI_CODEX_ACCOUNT: 'work', AI_CLAUDE_ACCOUNT: 'main', HOME: '/home/u' }
  on('process.run', () => ({ value: { exitCode: 0, stdout: JSON.stringify(ROWS), stderr: '' } }) as never)
  on('env.get', (_$, e) => ({ value: ENV[(e as { name: string }).name] }) as never)
  on('fs.read', () => { throw new Error('no cache') })
  on('session.id', () => ({ value: 'test-session' }) as never)
  on('command.register', () => ({ value: undefined }) as never)
  on('clock.every', () => ({ value: undefined }) as never)
  on('tool.call', { tool: 'Bash' }, (_$, e) => {
    seen.push(e.command)
    return { result: { text: 'ok' } } as never
  })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as never).catch(() => {})
  await $.tool.call({ tool: 'Bash', command: 'node /x/codex-companion.mjs task "hi"' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls -la' } as never)
  expect(seen[0]).toContain("CODEX_HOME='/home/u/.codex-accounts/work'")
  expect(seen[0]).toContain('codex-openai-codex-work')
  expect(seen[1]).toBe('ls -la')
})
