export type Corner = 'tr' | 'tl' | 'br' | 'bl' | 'off'

/** Percent left, 0 to 100; null while the engine has no reading. */
export type Gauges = { context: number | null; fiveHour: number | null; sevenDay: number | null }

declare module 'claude-code' {
  interface PluginState {
    'phosphor-hud': { gauges: Shaped<Gauges>; corner: Corner; leftInset: number }
  }
}
