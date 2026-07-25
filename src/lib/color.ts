/** Format conversions and gamut mapping shared by every picker. */

import {
  clamp,
  gammaDecode,
  gammaEncode,
  linearSrgbToOklab,
  oklabToLinearSrgb,
  type RGB,
} from './okhsv'

export type OKLCH = { l: number; c: number; h: number }

/** Accepts `#abc`, `abc`, `#aabbcc`, `AABBCC`; returns `#aabbcc` or null. */
export function normalizeHex(input: string): string | null {
  const value = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{6}$/.test(value)) return `#${value}`
  if (/^[0-9a-f]{3}$/.test(value)) {
    return `#${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`
  }
  return null
}

export function hexToRgb(hex: string): RGB {
  const int = parseInt(hex.slice(1), 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

export function rgbToHex({ r, g, b }: RGB) {
  const part = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/* -------------------------------------------------------------------------- */
/* sRGB HSV — the "classic" model, kept separate from Okhsv on purpose        */
/* -------------------------------------------------------------------------- */

export type SrgbHSV = { h: number; s: number; v: number }

export function rgbToSrgbHsv({ r, g, b }: RGB): SrgbHSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min

  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 }
}

export function srgbHsvToRgb({ h, s, v }: SrgbHSV): RGB {
  const sn = s / 100
  const vn = v / 100
  const c = vn * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = vn - c

  let rgb: [number, number, number]
  if (hp < 1) rgb = [c, x, 0]
  else if (hp < 2) rgb = [x, c, 0]
  else if (hp < 3) rgb = [0, c, x]
  else if (hp < 4) rgb = [0, x, c]
  else if (hp < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  }
}

export function rgbToHsl({ r, g, b }: RGB) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l: l * 100 }

  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h *= 60
  if (h < 0) h += 360

  return { h, s: s * 100, l: l * 100 }
}

/* -------------------------------------------------------------------------- */
/* OKLCH                                                                      */
/* -------------------------------------------------------------------------- */

export function hexToOklch(hex: string): OKLCH {
  const { r, g, b } = hexToRgb(hex)
  const [L, a, bb] = linearSrgbToOklab(
    gammaDecode(r / 255),
    gammaDecode(g / 255),
    gammaDecode(b / 255),
  )
  const c = Math.hypot(a, bb)
  const h = c < 1e-6 ? 0 : (((Math.atan2(bb, a) * 180) / Math.PI) + 360) % 360
  return { l: L, c, h }
}

const EPSILON = 1e-5

function oklchToLinear({ l, c, h }: OKLCH) {
  const rad = (h * Math.PI) / 180
  return oklabToLinearSrgb(l, c * Math.cos(rad), c * Math.sin(rad))
}

export function isInGamut(color: OKLCH) {
  return oklchToLinear(color).every((v) => v >= -EPSILON && v <= 1 + EPSILON)
}

/**
 * OKLCH -> `#rrggbb`. Out-of-gamut colours have their chroma reduced by
 * bisection (holding L and H) rather than being clipped per channel, which
 * would shift the hue.
 */
export function oklchToHex(color: OKLCH): string {
  let { c } = color
  if (!isInGamut(color)) {
    let lo = 0
    let hi = c
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (isInGamut({ ...color, c: mid })) lo = mid
      else hi = mid
    }
    c = lo
  }

  const [r, g, b] = oklchToLinear({ ...color, c })
  const part = (v: number) =>
    Math.round(255 * clamp(gammaEncode(clamp(v, 0, 1)), 0, 1))
      .toString(16)
      .padStart(2, '0')

  return `#${part(r)}${part(g)}${part(b)}`
}

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Relative luminance, for deciding whether to put white or black on a swatch. */
export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return (
    0.2126 * gammaDecode(r / 255) +
    0.7152 * gammaDecode(g / 255) +
    0.0722 * gammaDecode(b / 255)
  )
}

export function readableOn(hex: string) {
  return relativeLuminance(hex) > 0.42 ? '#0a0a0a' : '#fafafa'
}
