import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePointerDrag, type PointerHandlers } from '@/hooks/usePointerDrag'
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToSrgbHsv,
  srgbHsvToRgb,
  type SrgbHSV,
} from '@/lib/color'
import { clamp } from '@/lib/okhsv'
import { cn } from '@/lib/utils'

const SV_HEIGHT = 156
const FORMATS = ['hex', 'rgb', 'hsl'] as const
type Format = (typeof FORMATS)[number]

/** `#rrggbb` or `#rrggbbaa` -> `[hex6, alpha 0..1]`. */
function splitAlpha(value: string): [string, number] {
  const raw = value.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{8}$/.test(raw)) return [`#${raw.slice(0, 6)}`, parseInt(raw.slice(6), 16) / 255]
  if (/^[0-9a-f]{6}$/.test(raw)) return [`#${raw}`, 1]
  return ['#000000', 1]
}

function joinAlpha(hex: string, alpha: number) {
  if (alpha >= 1) return hex
  return `${hex}${Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')}`
}

type Props = {
  value: string
  onValueChange: (value: string) => void
}

/**
 * The familiar Photoshop-style panel: an sRGB saturation/value plane with hue
 * and alpha rails underneath. Everything stays inline — no popover.
 */
export function ClassicPicker({ value, onValueChange }: Props) {
  const [hex, alpha] = useMemo(() => splitAlpha(value), [value])
  const [format, setFormat] = useState<Format>('hex')
  const [copied, setCopied] = useState(false)

  // Keep hue/saturation while the user drags into a corner where hex loses them.
  const [hsv, setHsv] = useState<SrgbHSV>(() => rgbToSrgbHsv(hexToRgb(hex)))
  const [seen, setSeen] = useState(hex)
  if (hex !== seen) {
    setSeen(hex)
    setHsv(rgbToSrgbHsv(hexToRgb(hex)))
  }

  const emit = useCallback(
    (next: SrgbHSV, nextAlpha = alpha) => {
      const nextHex = rgbToHex(srgbHsvToRgb(next))
      setHsv(next)
      setSeen(nextHex)
      onValueChange(joinAlpha(nextHex, nextAlpha))
    },
    [alpha, onValueChange],
  )

  const [planeRef, planeDragging, planeHandlers] = usePointerDrag<HTMLDivElement>(
    (clientX, clientY) => {
      const rect = planeRef.current?.getBoundingClientRect()
      if (!rect) return
      emit({
        ...hsv,
        s: 100 * clamp((clientX - rect.left) / rect.width, 0, 1),
        v: 100 * (1 - clamp((clientY - rect.top) / rect.height, 0, 1)),
      })
    },
  )

  const [hueRef, , hueHandlers] = usePointerDrag<HTMLDivElement>((clientX) => {
    const rect = hueRef.current?.getBoundingClientRect()
    if (!rect) return
    emit({ ...hsv, h: 360 * clamp((clientX - rect.left) / rect.width, 0, 1) })
  })

  const [alphaRef, , alphaHandlers] = usePointerDrag<HTMLDivElement>((clientX) => {
    const rect = alphaRef.current?.getBoundingClientRect()
    if (!rect) return
    emit(hsv, clamp((clientX - rect.left) / rect.width, 0, 1))
  })

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(timer)
  }, [copied])

  const text = formatColor(hex, alpha, format)

  return (
    <div className="w-full max-w-[264px] space-y-3 rounded-2xl border border-border/60 bg-popover p-3 shadow-sm">
      <div
        ref={planeRef}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s)}
        aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`}
        tabIndex={0}
        onKeyDown={(event) => {
          let ds = 0
          let dv = 0
          if (event.key === 'ArrowRight') ds = 2
          else if (event.key === 'ArrowLeft') ds = -2
          else if (event.key === 'ArrowUp') dv = 2
          else if (event.key === 'ArrowDown') dv = -2
          else return
          event.preventDefault()
          emit({ ...hsv, s: clamp(hsv.s + ds, 0, 100), v: clamp(hsv.v + dv, 0, 100) })
        }}
        {...planeHandlers}
        className="relative cursor-crosshair rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
        style={{
          height: SV_HEIGHT,
          touchAction: 'none',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h} 100% 50%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-foreground/10 ring-inset" />
        <div
          className="pointer-events-none absolute size-4 rounded-full border-2 border-white transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            background: hex,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)',
            transform: `translate(-50%, -50%) scale(${planeDragging ? 1.2 : 1})`,
          }}
        />
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className="size-8 shrink-0 overflow-hidden rounded-full border border-border/70"
          style={{ background: checkerboard }}
        >
          <span
            className="block size-full"
            style={{ background: hex, opacity: alpha }}
          />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <Rail
            ref={hueRef}
            handlers={hueHandlers}
            label="Hue"
            valueNow={Math.round(hsv.h)}
            valueMax={360}
            percent={(hsv.h / 360) * 100}
            thumbColor={`hsl(${hsv.h} 100% 50%)`}
            onKeyDelta={(delta) => emit({ ...hsv, h: (hsv.h + delta * 2 + 360) % 360 })}
            style={{
              background:
                'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            }}
          />
          <Rail
            ref={alphaRef}
            handlers={alphaHandlers}
            label="Alpha"
            valueNow={Math.round(alpha * 100)}
            valueMax={100}
            percent={alpha * 100}
            thumbColor={hex}
            onKeyDelta={(delta) => emit(hsv, clamp(alpha + delta * 0.02, 0, 1))}
            style={{
              background: `linear-gradient(to right, transparent, ${hex}), ${checkerboard}`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex shrink-0 rounded-md bg-muted/70 p-0.5">
          {FORMATS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFormat(item)}
              aria-pressed={format === item}
              className={cn(
                'cursor-pointer rounded-[5px] px-1.5 py-1 text-[10.5px] font-semibold uppercase transition-colors',
                format === item
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <output className="min-w-0 flex-1 truncate rounded-md bg-muted/70 px-2 py-1.5 text-[12px] font-medium text-foreground/90 tabular-nums">
          {text}
        </output>

        <button
          type="button"
          aria-label="Copy color"
          title="Copy"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {})
          }}
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

const checkerboard =
  'repeating-conic-gradient(rgba(128,128,128,0.45) 0% 25%, transparent 0% 50%) 0 0 / 8px 8px'

type RailProps = {
  ref: React.RefObject<HTMLDivElement | null>
  handlers: PointerHandlers
  label: string
  valueNow: number
  valueMax: number
  percent: number
  thumbColor: string
  style: React.CSSProperties
  onKeyDelta: (delta: number) => void
}

function Rail({
  ref,
  handlers,
  label,
  valueNow,
  valueMax,
  percent,
  thumbColor,
  style,
  onKeyDelta,
}: RailProps) {
  return (
    <div
      ref={ref}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
      tabIndex={0}
      onKeyDown={(event) => {
        const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (!delta) return
        event.preventDefault()
        onKeyDelta(delta)
      }}
      {...handlers}
      className="relative h-3 cursor-pointer rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      style={{ ...style, touchAction: 'none' }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-foreground/10 ring-inset" />
      <div
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${percent}%`,
          background: thumbColor,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.28)',
        }}
      />
    </div>
  )
}

function formatColor(hex: string, alpha: number, format: Format) {
  const { r, g, b } = hexToRgb(hex)
  const a = Math.round(alpha * 100) / 100

  if (format === 'hex') return joinAlpha(hex, alpha)
  if (format === 'rgb') return a < 1 ? `rgb(${r} ${g} ${b} / ${a})` : `rgb(${r} ${g} ${b})`

  const { h, s, l } = rgbToHsl({ r, g, b })
  const parts = `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`
  return a < 1 ? `hsl(${parts} / ${a})` : `hsl(${parts})`
}
