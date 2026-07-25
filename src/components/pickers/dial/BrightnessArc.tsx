import { useId } from 'react'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { clamp, hsvToHex, type HSV } from '@/lib/okhsv'

/** The arc lives in the same 180x192 box as the wheel, sharing its centre. */
export const DIAL_WIDTH = 180
export const DIAL_HEIGHT = 192
const CENTER_X = 90
const CENTER_Y = 84
const ARC_RADIUS = 97

/** Half-width of the arc, measured from the 6 o'clock position. */
const ARC_SPREAD = (42 * Math.PI) / 180
const START_ANGLE = Math.PI / 2 + ARC_SPREAD
const END_ANGLE = Math.PI / 2 - ARC_SPREAD

/** Point on the arc for `t` in 0..1 (0 = black end, 1 = full brightness). */
function pointAt(t: number) {
  const angle = START_ANGLE + t * (END_ANGLE - START_ANGLE)
  return {
    x: CENTER_X + ARC_RADIUS * Math.cos(angle),
    y: CENTER_Y + ARC_RADIUS * Math.sin(angle),
  }
}

type Props = {
  hsv: HSV
  onChange: (hsv: HSV) => void
}

export function BrightnessArc({ hsv, onChange }: Props) {
  const gradientId = useId()

  const [svgRef, dragging, handlers] = usePointerDrag<SVGSVGElement>((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    let angle = Math.atan2(clientY - rect.top - CENTER_Y, clientX - rect.left - CENTER_X)
    // atan2 wraps at -pi; shift the left half back onto a continuous range.
    if (angle < -Math.PI / 2) angle += 2 * Math.PI

    const t = clamp((START_ANGLE - angle) / (START_ANGLE - END_ANGLE), 0, 1)
    onChange({ ...hsv, v: 100 * t })
  })

  const start = pointAt(0)
  const end = pointAt(1)
  const path = `M ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${end.x} ${end.y}`
  const thumb = pointAt(hsv.v / 100)

  return (
    <svg
      ref={svgRef}
      role="slider"
      aria-label="Brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.v)}
      tabIndex={0}
      viewBox={`0 0 ${DIAL_WIDTH} ${DIAL_HEIGHT}`}
      onKeyDown={(event) => {
        let dv = 0
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') dv = 2
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') dv = -2
        else if (event.key === 'PageUp') dv = 10
        else if (event.key === 'PageDown') dv = -10
        else if (event.key === 'Home') dv = -hsv.v
        else if (event.key === 'End') dv = 100 - hsv.v
        else return

        event.preventDefault()
        onChange({ ...hsv, v: clamp(hsv.v + dv, 0, 100) })
      }}
      {...handlers}
      className="absolute inset-0 cursor-pointer rounded-2xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      // The svg box overlaps the wheel, so only the strokes below take pointers.
      style={{
        width: DIAL_WIDTH,
        height: DIAL_HEIGHT,
        touchAction: 'none',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
        >
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
      </defs>

      <path d={path} fill="none" strokeWidth={16} strokeLinecap="round" className="stroke-foreground/15" />
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={14}
        strokeLinecap="round"
        style={{ pointerEvents: 'stroke' }}
      />
      {/* Invisible fat stroke widens the hit area without widening the visuals. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        strokeLinecap="round"
        style={{ pointerEvents: 'stroke' }}
      />

      <circle
        cx={thumb.x}
        cy={thumb.y}
        r={dragging ? 9 : 7.5}
        fill={hsvToHex({ h: hsv.h, s: 0, v: hsv.v })}
        stroke="#fff"
        strokeWidth={2}
        style={{
          pointerEvents: 'none',
          transition: 'r 150ms cubic-bezier(0.23, 1, 0.32, 1)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        }}
      />
    </svg>
  )
}
