import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { hsvToHex } from '@/lib/okhsv'
import { readableOn } from '@/lib/color'
import { cn } from '@/lib/utils'

const HUES = [
  { name: 'Rose', h: 12 },
  { name: 'Amber', h: 68 },
  { name: 'Lime', h: 128 },
  { name: 'Teal', h: 178 },
  { name: 'Azure', h: 232 },
  { name: 'Violet', h: 292 },
]

/** Fixed brightness/saturation steps, so every row is perceptually aligned. */
const STEPS = [
  { s: 22, v: 96 },
  { s: 44, v: 88 },
  { s: 68, v: 78 },
  { s: 88, v: 64 },
  { s: 92, v: 46 },
]

const NEUTRALS = [100, 92, 80, 62, 42, 22, 0].map((v) => hsvToHex({ h: 0, s: 0, v }))

type Props = {
  value: string
  onValueChange: (hex: string) => void
  /** Most recently used colours, newest first. */
  recent?: string[]
}

/**
 * A ramp built in Okhsv rather than picked by hand: each column is one hue and
 * each row is a fixed saturation/brightness step, so the grid stays even.
 */
export function SwatchPicker({ value, onValueChange, recent = [] }: Props) {
  const selected = value.toLowerCase()

  const columns = useMemo(
    () =>
      HUES.map((hue) => ({
        ...hue,
        shades: STEPS.map((step) => hsvToHex({ h: hue.h, s: step.s, v: step.v })),
      })),
    [],
  )

  return (
    <div className="w-full max-w-[264px] space-y-3 rounded-2xl border border-border/60 bg-popover p-3 shadow-sm">
      <div className="grid grid-cols-6 gap-1.5">
        {columns.map((column) =>
          column.shades.map((hex, index) => (
            <Swatch
              key={hex + index}
              hex={hex}
              label={`${column.name} ${index + 1}`}
              selected={selected === hex}
              onSelect={onValueChange}
            />
          )),
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11.5px] font-medium text-muted-foreground">Neutrals</p>
        <div className="grid grid-cols-7 gap-1.5">
          {NEUTRALS.map((hex) => (
            <Swatch
              key={hex}
              hex={hex}
              label={`Neutral ${hex}`}
              selected={selected === hex}
              onSelect={onValueChange}
            />
          ))}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11.5px] font-medium text-muted-foreground">Recent</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.slice(0, 7).map((hex) => (
              <Swatch
                key={hex}
                hex={hex}
                label={`Recent ${hex}`}
                selected={selected === hex}
                onSelect={onValueChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Swatch({
  hex,
  label,
  selected,
  onSelect,
}: {
  hex: string
  label: string
  selected: boolean
  onSelect: (hex: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hex)}
      aria-label={label}
      aria-pressed={selected}
      title={hex}
      className={cn(
        'relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-md',
        'ring-1 ring-foreground/10 ring-inset transition-transform',
        'hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        selected && 'scale-110',
      )}
      style={{ background: hex }}
    >
      {selected && <Check aria-hidden className="size-3" style={{ color: readableOn(hex) }} />}
    </button>
  )
}
