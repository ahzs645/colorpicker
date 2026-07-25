import { AnimatePresence } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { DialPopover } from './DialPopover'

type Props = {
  label: string
  value: string
  onValueChange: (hex: string) => void
  /** Shown instead of the raw hex — e.g. a token name. */
  displayValue?: string
  onReset?: () => void
}

/**
 * A settings row that opens the radial dial. This is the shape the picker was
 * designed for: the swatch is both the value and the trigger.
 */
export function ColorRow({ label, value, onValueChange, displayValue, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="flex h-8 w-full shrink-0 items-center justify-between rounded-lg bg-muted/60 px-3 transition-colors select-none hover:bg-muted/80">
      <span className="text-[12.5px] font-medium text-foreground/90">{label}</span>

      <span className="flex items-center gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${label}`}
            title="Reset"
            className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <RotateCcw aria-hidden className="size-3" />
          </button>
        )}

        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? popoverId : undefined}
          aria-label={`${label} color`}
          onClick={() => setOpen((prev) => !prev)}
          className="flex cursor-pointer items-center gap-2 transition-transform active:scale-95"
        >
          <span className="text-[12.5px] font-medium text-muted-foreground tabular-nums">
            {displayValue ?? value}
          </span>
          <span
            className="size-4.5 rounded-full border border-border/70"
            style={{ background: value }}
          />
        </button>
      </span>

      <AnimatePresence>
        {open && (
          <DialPopover
            id={popoverId}
            anchorRef={triggerRef}
            value={value}
            onValueChange={onValueChange}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
