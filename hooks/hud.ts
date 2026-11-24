// The gauge itself: pure string building, in the manner of the Vector Range scene.
// Every mark is a stroked line drawn three times, widest and faintest first; no fills but the plate, no fonts.

import type { Corner, Gauges } from '../types'

const HOT = '#9ff0dc'
const WARM = '#3fb89a'
const COLD = '#237a68'
const AMBER = '#ffb454'
const PLATE = '#030a08'

/** Size of the gauge in CSS pixels, and its distance from the window's edges. */
const WIDTH = 252
const HEIGHT = 96
const INSET_X = 28
const INSET_TOP = 64
const INSET_BOTTOM = 150

/** Below this much left, a row turns amber. */
const LOW = 20

/** Stroke letters on a 4 by 6 grid. */
const GLYPHS: Record<string, string> = {
  '0': 'M0 0H4V6H0Z',
  '1': 'M1 1L2 0V6',
  '2': 'M0 0H4V3H0V6H4',
  '3': 'M0 0H4V6H0M1 3H4',
  '4': 'M0 0V3H4M4 0V6',
  '5': 'M4 0H0V3H4V6H0',
  '6': 'M4 0H0V6H4V3H0',
  '7': 'M0 0H4L1.5 6',
  '8': 'M0 0H4V6H0ZM0 3H4',
  '9': 'M4 3H0V0H4V6H0',
  '%': 'M0 6L4 0M0 0H1V1.4H0ZM3 4.6H4V6H3Z',
  '-': 'M1 3H3',
  C: 'M4 0H0V6H4',
  T: 'M0 0H4M2 0V6',
  X: 'M0 0L4 6M4 0L0 6',
  H: 'M0 0V6M4 0V6M0 3H4',
  D: 'M0 0H2.5L4 1.5V4.5L2.5 6H0Z',
}

const UNIT = 2
const ADVANCE = 12

function glow(body: string, colour: string, width: number, opacity: number): string {
  const one = (w: number, o: number) =>
    `<g fill="none" stroke="${colour}" stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`

  return one(width * 6, Math.round(opacity * 8) / 100) + one(width * 2.8, Math.round(opacity * 22) / 100) + one(width, opacity)
}

function word(text: string, x: number, y: number): string {
  return [...text]
    .map((letter, index) => {
      const d = GLYPHS[letter]

      return d === undefined ? '' : `<path transform="translate(${x + index * ADVANCE} ${y}) scale(${UNIT})" vector-effect="non-scaling-stroke" d="${d}"/>`
    })
    .join('')
}

const TICKS = 20
const TICK_STEP = 6
const BAR_X = 46
const VALUE_END = 228

function row(label: string, left: number | null, y: number): string {
  const isLow = left !== null && left < LOW
  const lit = left === null ? 0 : Math.max(left > 0 ? 1 : 0, Math.round((left / 100) * TICKS))
  let on = ''
  let off = ''

  for (let index = 0; index < TICKS; index++) {
    const tick = `<path d="M${BAR_X + index * TICK_STEP} ${y}v12"/>`

    if (index < lit) on += tick
    else off += tick
  }

  const value = left === null ? '--' : `${Math.round(left)}%`
  const colour = isLow ? AMBER : HOT

  return (
    glow(word(label, 0, y), WARM, 1.2, 0.8) +
    (off === '' ? '' : `<g fill="none" stroke="${COLD}" stroke-width="1.4" stroke-opacity="0.5" stroke-linecap="round">${off}</g>`) +
    (on === '' ? '' : glow(on, colour, 1.8, 0.95)) +
    glow(word(value, VALUE_END - value.length * ADVANCE + (ADVANCE - 4 * UNIT), y), colour, 1.3, 0.95)
  )
}

/** The gauge with its own origin at its top left corner, WIDTH by HEIGHT. */
function gauge(gauges: Gauges): string {
  const w = WIDTH
  const h = HEIGHT
  const brackets = `<path d="M0 10V0H10M${w - 10} 0H${w}V10M${w} ${h - 10}V${h}H${w - 10}M10 ${h}H0V${h - 10}"/>`

  return (
    `<rect width="${w}" height="${h}" fill="${PLATE}" fill-opacity="0.45"/>` +
    glow(brackets, WARM, 1, 0.7) +
    `<g transform="translate(14 16)">${row('CTX', gauges.context, 0)}${row('5H', gauges.fiveHour, 26)}${row('7D', gauges.sevenDay, 52)}</g>`
  )
}

export function altOf(gauges: Gauges): string {
  const say = (name: string, left: number | null) => `${name} ${left === null ? 'not known' : `${Math.round(left)}% left`}`

  return `${say('Context window', gauges.context)}, ${say('five-hour limit', gauges.fiveHour)}, ${say('seven-day limit', gauges.sevenDay)}.`
}

/**
 * The scene with the gauge over it. The scene keeps its own viewBox and crop as a nested drawing;
 * the outer one has no viewBox, so its units are the window's own pixels and the gauge keeps its size and its corner in any window.
 */
export function withGauge(scene: string, gauges: Gauges, corner: Exclude<Corner, 'off'>, leftInset: number): string {
  const isRight = corner === 'tr' || corner === 'br'
  const isBottom = corner === 'br' || corner === 'bl'
  const dx = isRight ? -(WIDTH + INSET_X) : leftInset
  const dy = isBottom ? -(HEIGHT + INSET_BOTTOM) : INSET_TOP

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${scene}` +
    `<svg x="${isRight ? '100%' : '0'}" y="${isBottom ? '100%' : '0'}" overflow="visible"><g transform="translate(${dx} ${dy})">${gauge(gauges)}</g></svg></svg>`
  )
}
