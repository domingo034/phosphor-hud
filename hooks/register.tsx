import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, RenderNode, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Corner, Gauges } from '../types'
import { altOf, withGauge } from './hud'
import { vectorRangeSvg } from './scene'

const EMPTY: Gauges = { context: null, fiveHour: null, sevenDay: null, modelSevenDay: null }
const CORNERS: readonly Corner[] = ['tr', 'tl', 'br', 'bl', 'off']
/** The engine's limit for one Svg. */
const LIMIT = 131072

const gauges = atom({ plugin: 'phosphor-hud', key: 'gauges' } as const, EMPTY, { shape: 'gauges-2' })
const corner = atom({ plugin: 'phosphor-hud', key: 'corner' } as const, 'tr')
/** How far the left corners sit from the window's left edge, in pixels: clear of an open sidebar. */
const leftInset = atom({ plugin: 'phosphor-hud', key: 'leftInset' } as const, 340)
/** Whether this mod sets the Vector Range look itself in every session, so the gauge has a scene with no other theme chosen. */
const skin = atom({ plugin: 'phosphor-hud', key: 'skin' } as const, true)

const PLUGIN = 'phosphor-hud'
const SCENE = 'vector-range'
/** The glass the theme-examples plugin gives this scene. */
const LOOK = { backdrop: { scene: SCENE, glass: { blur: 22, tint: '#0e2f27', opacity: 0.42 } }, overrideColorScheme: 'dark' } as const

type Engine = EngineInterface

/** Sets the look; an engine that draws none, or refuses it, is left as it is. */
async function wear($: Engine): Promise<void> {
  try {
    await $.theme.set(LOOK)
  } catch {
    // No theme on this engine: the gauge still rides any scene another plugin draws.
  }
}

/** What the person chose in an earlier session, kept in the store; anything else there is passed over. */
async function recall($: Engine): Promise<void> {
  try {
    const where = await $.store.get('corner')
    const picked = CORNERS.find(one => one === where)

    if (picked !== undefined) {
      await update($, corner, () => picked)
    }

    const inset = await $.store.get('leftInset')

    if (typeof inset === 'number' && Number.isFinite(inset)) {
      await update($, leftInset, () => Math.max(0, Math.min(2000, Math.round(inset))))
    }

    const worn = await $.store.get('skin')

    if (typeof worn === 'boolean') {
      await update($, skin, () => worn)
    }
  } catch {
    // No store: this session keeps the defaults.
  }
}

async function keep($: Engine, key: string, value: string | number | boolean): Promise<void> {
  try {
    await $.store.set(key, value)
  } catch {
    // Not kept: the choice still holds for this session.
  }
}

function usedOf(limits: readonly SessionRateLimit[], isIt: (kind: string) => boolean): number | null {
  const limit = limits.find(one => isIt(one.kind))

  return limit === undefined ? null : Math.max(0, Math.min(100, limit.percentUsed))
}

function measured(context: SessionContextUsage, limits: readonly SessionRateLimit[]): Gauges {
  const used = context.percent ?? (context.tokens === undefined || context.window <= 0 ? undefined : (context.tokens / context.window) * 100)

  return {
    context: used === undefined ? null : Math.max(0, Math.min(100, used)),
    fiveHour: usedOf(limits, kind => kind === 'five_hour'),
    sevenDay: usedOf(limits, kind => kind === 'seven_day'),
    // Fable's weekly limit is the engine's `seven_day_overage_included`. This build hands a mod `five_hour` and `seven_day` alone,
    // so the row stays hidden until a later one reports that window too.
    modelSevenDay: usedOf(limits, kind => kind === 'seven_day_overage_included' || kind.includes('fable')),
  }
}

const isSame = (a: Gauges, b: Gauges) => a.context === b.context && a.fiveHour === b.fiveHour && a.sevenDay === b.sevenDay && a.modelSevenDay === b.modelSevenDay

/** The tree another plugin drew, with the gauge laid over its first Svg. */
function overFirstSvg(node: RenderNode, draw: (source: string) => string | undefined, done: { is: boolean }): RenderNode {
  if (typeof node === 'string' || done.is) {
    return node
  }

  const element = node as { type: string; props?: Record<string, unknown>; children?: readonly RenderNode[] }

  if (element.type === 'Svg' && typeof element.props?.source === 'string') {
    const source = draw(element.props.source)

    if (source === undefined) {
      return node
    }

    done.is = true

    return { ...element, props: { ...element.props, source } } as RenderNode
  }

  if (element.children === undefined) {
    return node
  }

  return { ...element, children: element.children.map(child => overFirstSvg(child, draw, done)) } as RenderNode
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'hud',
      description: 'Move the usage gauge on the backdrop: /hud tr, tl, br, bl or off; /hud tl 400 sets the left distance in pixels; /hud skin on or off',
    })

    await recall($)

    // Before the plugins beneath start: a theme one of them sets for its project then stands over this one.
    if (await read($, skin)) {
      await wear($)
    }

    const started = await next(e)

    try {
      const usage = await $.session.usage()
      const now = measured(usage.context, usage.rateLimits)
      await update($, gauges, was => (isSame(was, now) ? was : now))
    } catch {
      // No reading yet: the first session.measure brings one.
    }

    return started
  })

  on('session.measure', async ($, e, next) => {
    const now = measured(e.context, e.rateLimits)
    await update($, gauges, was => (isSame(was, now) ? was : now))

    return next(e)
  })

  on('command.run', { command: 'hud' }, async ($, e) => {
    const [asked = '', distance] = e.args.trim().toLowerCase().split(/\s+/)
    const now = await read($, gauges)
    const say = (used: number | null) => (used === null ? '--' : `${Math.round(used)}%`)
    const status = `Used: context ${say(now.context)}, 5h ${say(now.fiveHour)}, 7d ${say(now.sevenDay)}, Fable 7d ${say(now.modelSevenDay)}.`

    if (asked === 'skin') {
      if (distance !== 'on' && distance !== 'off') {
        return { text: `The Vector Range look is ${(await read($, skin)) ? 'on' : 'off'} in every session. Use /hud skin on or /hud skin off.` }
      }

      const isOn = distance === 'on'
      await update($, skin, () => isOn)
      await keep($, 'skin', isOn)

      if (isOn) {
        await wear($)

        return { text: 'This mod now sets the Vector Range look in every session.' }
      }

      try {
        await $.theme.clear()
      } catch {
        // Nothing to clear on this engine.
      }

      return { text: 'This mod no longer sets a look. A theme of another plugin comes back when you choose it again.' }
    }

    if (asked === '') {
      return { text: `${status} Gauge: ${await read($, corner)}, left corners ${await read($, leftInset)}px in. Move it with /hud tr, tl, br, bl or off; /hud tl 400 sets that distance; /hud skin on or off.` }
    }

    const picked = CORNERS.find(one => one === asked)

    if (picked === undefined) {
      return { text: 'Use /hud tr, tl, br, bl or off.' }
    }

    const px = distance === undefined ? Number.NaN : Number(distance)

    if (Number.isFinite(px)) {
      const inset = Math.max(0, Math.min(2000, Math.round(px)))
      await update($, leftInset, () => inset)
      await keep($, 'leftInset', inset)
    }

    await update($, corner, () => picked)
    await keep($, 'corner', picked)

    return { text: picked === 'off' ? 'Gauge hidden. /hud tr brings it back.' : `Gauge moved to ${picked}.` }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    const where = await read($, corner)
    const now = await read($, gauges)
    const inset = await read($, leftInset)

    // This mod's own look: the scene and the gauge in one drawing.
    if (e.props.plugin === PLUGIN && e.props.scene === SCENE && (e.surface === 'desktop' || e.surface === 'mobile')) {
      const { Svg } = $.ui.resolve(e)
      const scene = vectorRangeSvg()
      const whole = where === 'off' ? scene : withGauge(scene, now, where, inset)

      return <Svg isInteractive alt={`Vector Range: phosphor mountains on black. ${altOf(now)}`} source={whole.length > LIMIT ? scene : whole} />
    }

    const drawn = await next(e)

    if (where === 'off' || typeof drawn !== 'object' || drawn === null) {
      return drawn
    }

    const done = { is: false }

    return overFirstSvg(
      drawn,
      source => {
        const whole = withGauge(source, now, where, inset)

        return whole.length > LIMIT ? undefined : whole
      },
      done,
    ) as RenderElement
  })
}
