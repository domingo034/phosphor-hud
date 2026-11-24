import { expect, test } from 'claude-code/testing'

const SCENE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="1600" height="1000" fill="#030a08"/></svg>'

const BACKDROP = {
  plugin: 'theme-examples',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: 'vector-range', plugin: 'theme-examples', glass: false },
} as const

test('the gauge is laid over the scene another plugin draws', async ($, on) => {
  on('command.register', () => ({ value: { command: 'hud' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, tokens: 50000, percent: 25 }, rateLimits: [{ kind: 'five_hour', percentUsed: 90 }] },
  }))
  on('ui.render', ($, e) => {
    if (e.surface !== 'desktop') {
      throw new Error('desktop alone')
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg isInteractive alt="scene" source={SCENE} />
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  const source = String((svg as { props?: { source?: string } } | undefined)?.props?.source ?? JSON.stringify(svg))

  expect(source.includes(SCENE)).toBe(true)
  expect(source.includes('#ffb454')).toBe(true)
  await ui.unmount()
})
