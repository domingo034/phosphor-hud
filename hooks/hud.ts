// The gauge itself: pure string building, in the manner of the Vector Range scene.
// Every mark is a stroked line drawn three times, widest and faintest first; no fills but the plate and the beam's end, no fonts.
// One row a window: a dim scale, and over it the scene's amber beam drawn out to where use has come.

import type { Corner, Gauges } from '../types'

const HOT = '#9ff0dc'
const WARM = '#3fb89a'
const COLD = '#237a68'
const AMBER = '#ffb454'
const HEAD = '#ffe2b0'
const PLATE = '#030a08'

/** Size of the gauge in CSS pixels, and its distance from the window's edges. */
const WIDTH = 204
const ROW_STEP = 17
const INSET_X = 28
const INSET_TOP = 64
const INSET_BOTTOM = 150

/** From this much used, a row's figure turns amber. */
const HIGH = 80

/** Single-stroke rounded letters on a 4 by 6 grid. */
const GLYPHS: Record<string, string> = {
  '0': 'M2 0C0.9 0 0 1 0 3S0.9 6 2 6S4 5 4 3S3.1 0 2 0Z',
  '1': 'M0.8 1.2L2.2 0V6',
  '2': 'M0.2 1.4C0.5 0.5 1.2 0 2 0C3.1 0 4 0.7 4 1.7C4 2.6 3.4 3.2 2.6 3.9L0 6H4',
  '3': 'M0.3 0.9C0.7 0.3 1.3 0 2 0C3 0 3.8 0.6 3.8 1.5C3.8 2.4 3 3 2 3C3.1 3 4 3.6 4 4.5C4 5.4 3.1 6 2 6C1.2 6 0.5 5.6 0.1 5',
  '4': 'M3 6V0L0 4.2H4',
  '5': 'M3.7 0H0.7L0.4 2.7C0.8 2.3 1.4 2.1 2 2.1C3.1 2.1 4 2.9 4 4C4 5.1 3.1 6 2 6C1.2 6 0.5 5.6 0.1 5',
  '6': 'M3.6 0.6C3.2 0.2 2.7 0 2.1 0C0.8 0 0 1.3 0 3.3V4C0 5.1 0.9 6 2 6S4 5.2 4 4.1S3.1 2.3 2 2.3S0 3.1 0 4',
  '7': 'M0 0H4L1.6 6',
  '8': 'M2 0C1 0 0.3 0.6 0.3 1.5S1 3 2 3S3.7 2.4 3.7 1.5S3 0 2 0ZM2 3C0.9 3 0 3.6 0 4.5S0.9 6 2 6S4 5.4 4 4.5S3.1 3 2 3Z',
  '9': 'M0.4 5.4C0.8 5.8 1.3 6 1.9 6C3.2 6 4 4.7 4 2.7V2C4 0.9 3.1 0 2 0S0 0.8 0 1.9S0.9 3.7 2 3.7S4 2.9 4 2',
  '%': 'M0.4 6L3.6 0M0.9 0a0.9 0.9 0 1 1 0 1.8a0.9 0.9 0 1 1 0-1.8ZM3.1 4.2a0.9 0.9 0 1 1 0 1.8a0.9 0.9 0 1 1 0-1.8Z',
  '-': 'M1 3H3',
  C: 'M3.8 1.2C3.4 0.5 2.8 0 2 0C0.9 0 0 1.1 0 3S0.9 6 2 6C2.8 6 3.4 5.5 3.8 4.8',
  T: 'M0 0H4M2 0V6',
  X: 'M0 0L4 6M4 0L0 6',
  H: 'M0 0V6M4 0V6M0 3H4',
  D: 'M0 0H1.6C3.1 0 4 1.2 4 3S3.1 6 1.6 6H0Z',
  F: 'M4 0H0V6M0 3H3',
}

const UNIT = 1.4
const ADVANCE = 8.4

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function glow(body: string, colour: string, width: number, opacity: number): string {
  const one = (w: number, o: number) =>
    `<g fill="none" stroke="${colour}" stroke-width="${round(w)}" stroke-opacity="${o}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`

  return one(width * 6, Math.round(opacity * 8) / 100) + one(width * 2.8, Math.round(opacity * 22) / 100) + one(width, opacity)
}

function word(text: string, x: number, y: number): string {
  return [...text]
    .map((letter, index) => {
      const d = GLYPHS[letter]

      return d === undefined ? '' : `<path transform="translate(${round(x + index * ADVANCE)} ${y}) scale(${UNIT})" vector-effect="non-scaling-stroke" d="${d}"/>`
    })
    .join('')
}

const LINE_X = 40
const LINE_END = 152
const VALUE_END = 192

function row(label: string, used: number | null, y: number, index: number): string {
  const mid = y + 4.2
  const length = LINE_END - LINE_X
  const share = used === null ? 0 : Math.max(0, Math.min(100, used)) / 100
  const end = round(LINE_X + length * share)
  const value = used === null ? '--' : `${Math.round(used)}%`
  const isHigh = used !== null && used >= HIGH
  let ticks = ''

  // The scale: a tick at each quarter, taller at the ends.
  for (let quarter = 0; quarter <= 4; quarter++) {
    const half = quarter === 0 || quarter === 4 ? 3.2 : 1.6
    ticks += `M${LINE_X + (length * quarter) / 4} ${mid - half}v${half * 2}`
  }

  const scale = `<g fill="none" stroke="${COLD}" stroke-width="0.7" stroke-opacity="0.75" stroke-linecap="round"><path d="M${LINE_X} ${mid}H${LINE_END}${ticks}"/></g>`
  let beam = ''

  if (share > 0) {
    const d = `M${LINE_X} ${mid}H${end}`
    const delay = `style="animation-delay:${round(index * 0.35)}s"`

    // At rest the line is whole, its end lit and the head out: that is what reduced motion shows.
    beam =
      glow(`<path class="hud-draw" ${delay} pathLength="100" stroke-dasharray="100" d="${d}"/>`, AMBER, 1.05, 0.95) +
      `<path class="hud-head" style="animation-delay:${round(index * 0.35 + 3)}s" pathLength="100" stroke-dasharray="7 200" stroke-dashoffset="-93" d="${d}" fill="none" stroke="${HEAD}" stroke-width="1.8" stroke-linecap="round" opacity="0"/>` +
      `<circle class="hud-dot" ${delay} cx="${end}" cy="${mid}" r="1.5" fill="${AMBER}"/><circle class="hud-dot" ${delay} cx="${end}" cy="${mid}" r="3.8" fill="${AMBER}" fill-opacity="0.2"/>`
  }

  return (
    glow(word(label, 0, y), WARM, 0.8, 0.85) +
    scale +
    beam +
    glow(word(value, VALUE_END - 40 + (4 - value.length) * ADVANCE, y), isHigh ? AMBER : HOT, 0.85, 0.95)
  )
}

/** The line is drawn out once at each redraw; after that a hot head runs it again every few seconds, as the scene's beam does its ridges. */
const STYLE =
  `<style>.hud-draw{animation:hud-draw 1.8s cubic-bezier(.3,.1,.3,1) both}.hud-dot{animation:hud-dot 1.8s linear both}` +
  `.hud-head{animation:hud-head 11s cubic-bezier(.3,.1,.7,.9) infinite}` +
  `@keyframes hud-draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}` +
  `@keyframes hud-dot{0%,85%{opacity:0}100%{opacity:1}}` +
  `@keyframes hud-head{0%{stroke-dashoffset:7;opacity:0}3%{opacity:1}16%{stroke-dashoffset:-93;opacity:1}22%,100%{stroke-dashoffset:-93;opacity:0}}` +
  `@media (prefers-reduced-motion: reduce){.hud-draw,.hud-dot,.hud-head{animation:none}}</style>`

type Row = { label: string; used: number | null }

/** The rows drawn: the model's own window has one only while there is a reading of it. */
function rowsOf(gauges: Gauges): Row[] {
  return [
    { label: 'CTX', used: gauges.context },
    { label: '5H', used: gauges.fiveHour },
    { label: '7D', used: gauges.sevenDay },
    ...(gauges.modelSevenDay === null ? [] : [{ label: 'F7D', used: gauges.modelSevenDay }]),
  ]
}

function heightOf(rows: number): number {
  return 35 + (rows - 1) * ROW_STEP
}

/** The gauge with its own origin at its top left corner, WIDTH wide and as tall as its rows. */
function gauge(rows: Row[]): string {
  const w = WIDTH
  const h = heightOf(rows.length)
  // Two opposite corners and a dotted rule beside each, not a full frame.
  const frame = `<path d="M0 12V0H26M${w - 26} ${h}H${w}V${h - 12}"/>`
  const dots = `<path d="M32 0h10M${w - 42} ${h}h10" stroke-dasharray="1 4"/>`

  return (
    `<rect width="${w}" height="${h}" fill="${PLATE}" fill-opacity="0.42"/>` +
    glow(frame, WARM, 0.8, 0.75) +
    `<g fill="none" stroke="${WARM}" stroke-width="1" stroke-linecap="round" stroke-opacity="0.7">${dots}</g>` +
    `<g transform="translate(12 12)">${rows.map((one, index) => row(one.label, one.used, index * ROW_STEP, index)).join('')}</g>`
  )
}

export function altOf(gauges: Gauges): string {
  const say = (name: string, used: number | null) => `${name} ${used === null ? 'not known' : `${Math.round(used)}% used`}`

  const model = gauges.modelSevenDay === null ? '' : `, ${say('Fable seven-day limit', gauges.modelSevenDay)}`

  return `${say('Context window', gauges.context)}, ${say('five-hour limit', gauges.fiveHour)}, ${say('seven-day limit', gauges.sevenDay)}${model}.`
}

/**
 * The scene with the gauge over it. The scene keeps its own viewBox and crop as a nested drawing;
 * the outer one has no viewBox, so its units are the window's own pixels and the gauge keeps its size and its corner in any window.
 */
export function withGauge(scene: string, gauges: Gauges, corner: Exclude<Corner, 'off'>, leftInset: number): string {
  const isRight = corner === 'tr' || corner === 'br'
  const isBottom = corner === 'br' || corner === 'bl'
  const rows = rowsOf(gauges)
  const dx = isRight ? -(WIDTH + INSET_X) : leftInset
  const dy = isBottom ? -(heightOf(rows.length) + INSET_BOTTOM) : INSET_TOP

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${STYLE}${scene}` +
    `<svg x="${isRight ? '100%' : '0'}" y="${isBottom ? '100%' : '0'}" overflow="visible"><g transform="translate(${dx} ${dy})">${gauge(rows)}</g></svg></svg>`
  )
}
