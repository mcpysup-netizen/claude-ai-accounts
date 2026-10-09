import { expect, test } from 'claude-code/testing'

test('없는 계정으로 전환하면 창을 열지 않고 거절한다', async $ => {
  const r = await $.command.run({ command: 'ai', args: 'zz;rm' })
  expect(JSON.stringify(r)).toContain('없는 claude 계정')
})
