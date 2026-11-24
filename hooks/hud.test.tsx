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

test('with no other theme, the mod sets and draws its own look, and recalls the corner', async ($, on) => {
  const sets: unknown[] = []

  on('command.register', () => ({ value: { command: 'hud' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, tokens: 50000, percent: 25 }, rateLimits: [] } }))
  on('store.get', (_, e) => ({ value: (e as { key?: string }).key === 'corner' ? 'bl' : undefined }))
  on('theme.set', (_, e) => {
    sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(1)

  const ui = await $.ui.mount({
    plugin: 'phosphor-hud',
    component: 'Backdrop',
    requestId: 'backdrop',
    props: { scene: 'vector-range', plugin: 'phosphor-hud', glass: false },
    surface: 'desktop',
  })
  const svg = await ui.find({ type: 'Svg' })
  const source = String((svg as { props?: { source?: string } } | undefined)?.props?.source ?? JSON.stringify(svg))

  expect(source.includes('hud-draw')).toBe(true)
  // A left corner: the gauge hangs from the window's left edge, not its right.
  expect(source.includes('<svg x="0" y="100%"')).toBe(true)
  await ui.unmount()
})
