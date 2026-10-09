export type UsageWindow = { pct: number; resets_at: number | null }
export type AccountRow = {
  tool: 'claude' | 'codex'
  id: string
  name: string
  owner: 'company' | 'personal'
  observed_at?: number | null
  logged_in?: boolean
  plan_label?: string
  home?: string
  is_default?: boolean
  is_auto?: boolean
  ever_used?: boolean
  windows?: { five_hour?: UsageWindow; seven_day?: UsageWindow }
}
export type Current = { claude: string; codex: string }
export type SessionCacheInfo = { ttl: string; expiresAt: number }

declare module 'claude-code' {
  interface PluginState {
    'ai-accounts': { rows: AccountRow[]; current: Current; note: string; cache: SessionCacheInfo | null }
  }
}
