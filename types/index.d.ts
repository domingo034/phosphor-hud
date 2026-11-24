export type Corner = 'tr' | 'tl' | 'br' | 'bl' | 'off'

/** Percent used, 0 to 100; null while the engine has no reading. `modelSevenDay` is the Fable model's own seven-day window, where one is reported. */
export type Gauges = { context: number | null; fiveHour: number | null; sevenDay: number | null; modelSevenDay: number | null }

declare module 'claude-code' {
  interface PluginState {
    'phosphor-hud': { gauges: Shaped<Gauges>; corner: Corner; leftInset: number }
  }
}
