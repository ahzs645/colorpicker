import { TriangleAlert } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { usePointerDrag, type PointerHandlers } from '@/hooks/usePointerDrag'
import { hexToOklch, isInGamut, oklchToHex, type OKLCH } from '@/lib/color'
import { clamp } from '@/lib/okhsv'

const CHANNELS = [
  { key: 'l', label: 'Lightness', min: 0, max: 1, step: 0.005, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: 'c', label: 'Chroma', min: 0, max: 0.4, step: 0.002, format: (v: number) => v.toFixed(3) },
  { key: 'h', label: 'Hue', min: 0, max: 360, step: 1, format: (v: number) => `${Math.round(v)}°` },
] as const

const GRADIENT_STOPS = 16

type Props = {
  value: string
  onValueChange: (hex: string) => void
}

/**
 * One rail per OKLCH channel. Each track previews what moving *that* channel
 * would do while the other two are held, and out-of-gamut regions are dimmed
 * rather than hidden — the honest view of what sRGB can actually show.
 */
export function ChannelPicker({ value, onValueChange }: Props) {
  const [oklch, setOklch] = useState<OKLCH>(() => hexToOklch(value))
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setOklch(hexToOklch(value))
  }

  const emit = useCallback(
    (next: OKLCH) => {
      const hex = oklchToHex(next)
      setOklch(next)
      setSeen(hex)
      onValueChange(hex)
    },
    [onValueChange],
  )

  const clipped = !isInGamut(oklch)
  const hex = useMemo(() => oklchToHex(oklch), [oklch])

  return (
    <div className="w-full max-w-[264px] space-y-3 rounded-2xl border border-border/60 bg-popover p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="size-11 shrink-0 rounded-xl border border-border/70"
          style={{ background: hex }}
        />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium tabular-nums">
            oklch({(oklch.l * 100).toFixed(1)}% {oklch.c.toFixed(3)} {Math.round(oklch.h)})
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground tabular-nums">
            {clipped ? (
              <>
                <TriangleAlert aria-hidden className="size-3 text-amber-500" />
                <span>outside sRGB — shown as {hex}</span>
              </>
            ) : (
              <span>{hex}</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {CHANNELS.map((channel) => (
          <ChannelRail
            key={channel.key}
            channel={channel}
            oklch={oklch}
            onChange={emit}
          />
        ))}
      </div>
    </div>
  )
}

type Channel = (typeof CHANNELS)[number]

function ChannelRail({
  channel,
  oklch,
  onChange,
}: {
  channel: Channel
  oklch: OKLCH
  onChange: (next: OKLCH) => void
}) {
  const { key, label, min, max, step, format } = channel
  const current = oklch[key]
  const span = max - min

  const [railRef, , handlers]: [React.RefObject<HTMLDivElement | null>, boolean, PointerHandlers] =
    usePointerDrag<HTMLDivElement>((clientX) => {
      const rect = railRef.current?.getBoundingClientRect()
      if (!rect) return
      const raw = min + clamp((clientX - rect.left) / rect.width, 0, 1) * span
      onChange({ ...oklch, [key]: snap(raw, min, max, step) })
    })

  const track = useMemo(() => {
    const stops: string[] = []
    for (let i = 0; i <= GRADIENT_STOPS; i++) {
      const t = i / GRADIENT_STOPS
      const sample = { ...oklch, [key]: min + t * span }
      stops.push(`${oklchToHex(sample)} ${(t * 100).toFixed(2)}%`)
    }
    return `linear-gradient(to right, ${stops.join(', ')})`
  }, [key, min, span, oklch])

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[11.5px] font-medium text-foreground/80 tabular-nums">
          {format(current)}
        </span>
      </div>
      <div
        ref={railRef}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={format(current)}
        tabIndex={0}
        onKeyDown={(event) => {
          const direction =
            event.key === 'ArrowRight' || event.key === 'ArrowUp'
              ? 1
              : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                ? -1
                : 0
          if (!direction) return
          event.preventDefault()
          const multiplier = event.shiftKey ? 10 : 1
          const next = current + direction * step * multiplier
          onChange({
            ...oklch,
            [key]: key === 'h' ? ((next % 360) + 360) % 360 : clamp(next, min, max),
          })
        }}
        {...handlers}
        className="relative h-4 cursor-pointer rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
        style={{ background: track, touchAction: 'none' }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-foreground/10 ring-inset" />
        <div
          className="pointer-events-none absolute top-1/2 size-4.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${((current - min) / span) * 100}%`,
            background: oklchToHex(oklch),
            boxShadow: '0 0 0 1px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.28)',
          }}
        />
      </div>
    </div>
  )
}

function snap(raw: number, min: number, max: number, step: number) {
  return clamp(Math.round((raw - min) / step) * step + min, min, max)
}
