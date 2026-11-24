import { atom, read, update } from 'claude-code'
import type { Register, RenderElement, RenderNode, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Corner, Gauges } from '../types'
import { altOf, withGauge } from './hud'

const EMPTY: Gauges = { context: null, fiveHour: null, sevenDay: null, modelSevenDay: null }
const CORNERS: readonly Corner[] = ['tr', 'tl', 'br', 'bl', 'off']
/** The engine's limit for one Svg. */
const LIMIT = 131072

const gauges = atom({ plugin: 'phosphor-hud', key: 'gauges' } as const, EMPTY, { shape: 'gauges-2' })
const corner = atom({ plugin: 'phosphor-hud', key: 'corner' } as const, 'tr')
/** How far the left corners sit from the window's left edge, in pixels: clear of an open sidebar. */
const leftInset = atom({ plugin: 'phosphor-hud', key: 'leftInset' } as const, 340)

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
      description: 'Move the usage gauge on the backdrop: /hud tr, tl, br, bl or off; /hud tl 400 sets the left distance in pixels',
    })

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

    if (asked === '') {
      return { text: `${status} Gauge: ${await read($, corner)}, left corners ${await read($, leftInset)}px in. Move it with /hud tr, tl, br, bl or off; /hud tl 400 sets that distance.` }
    }

    const picked = CORNERS.find(one => one === asked)

    if (picked === undefined) {
      return { text: 'Use /hud tr, tl, br, bl or off.' }
    }

    const px = distance === undefined ? Number.NaN : Number(distance)

    if (Number.isFinite(px)) {
      await update($, leftInset, () => Math.max(0, Math.min(2000, Math.round(px))))
    }

    await update($, corner, () => picked)

    return { text: picked === 'off' ? 'Gauge hidden. /hud tr brings it back.' : `Gauge moved to ${picked}.` }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    const drawn = await next(e)
    const where = await read($, corner)
    const now = await read($, gauges)
    const inset = await read($, leftInset)

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
