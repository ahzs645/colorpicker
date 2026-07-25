import { Pipette } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useEyeDropper } from '@/hooks/useEyeDropper'
import { normalizeHex } from '@/lib/color'
import { clamp, hexToHsv, hsvToHex, type HSV } from '@/lib/okhsv'
import { BrightnessArc, DIAL_HEIGHT, DIAL_WIDTH } from './BrightnessArc'
import { HueSaturationWheel, WHEEL_SIZE } from './HueSaturationWheel'

const POPOVER_WIDTH = 188
const VIEWPORT_MARGIN = 8
const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const

type Placement = { top: number; left: number; origin: string }

type Props = {
  id: string
  anchorRef: RefObject<HTMLElement | null>
  value: string
  onValueChange: (hex: string) => void
  onClose: () => void
}

export function DialPopover({ id, anchorRef, value, onValueChange, onClose }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const reduceMotion = useReducedMotion()

  // HSV is the source of truth while the popover is open: round-tripping
  // through hex on every drag would quantise the hue near the wheel's centre.
  const [state, setState] = useState(() => {
    const hex = normalizeHex(value) ?? '#ffffff'
    return { hsv: hexToHsv(hex), draft: hex, seen: hex }
  })

  // Adopt externally-driven changes without clobbering an in-flight drag.
  const incoming = normalizeHex(value)
  if (incoming && incoming !== state.seen) {
    setState({ hsv: hexToHsv(incoming), draft: incoming, seen: incoming })
  }

  const commit = useCallback(
    (hsv: HSV) => {
      const hex = hsvToHex(hsv)
      setState({ hsv, draft: hex, seen: hex })
      onValueChange(hex)
    },
    [onValueChange],
  )

  const pickFromScreen = useEyeDropper(
    useCallback((hex: string) => commit(hexToHsv(hex)), [commit]),
  )

  const reposition = useCallback(() => {
    const anchor = anchorRef.current
    const popover = popoverRef.current
    if (!anchor || !popover) return

    const rect = anchor.getBoundingClientRect()
    const height = popover.offsetHeight

    const left = clamp(
      rect.right - POPOVER_WIDTH,
      VIEWPORT_MARGIN,
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
    )
    let top = rect.bottom + VIEWPORT_MARGIN
    let origin = 'top right'

    if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - VIEWPORT_MARGIN - height)
      origin = 'bottom right'
    }

    setPlacement({ top, left, origin })
  }, [anchorRef])

  useLayoutEffect(reposition, [reposition])

  useEffect(() => {
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [reposition])

  useEffect(() => {
    popoverRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [anchorRef, onClose])

  return createPortal(
    <motion.div
      ref={popoverRef}
      id={id}
      role="dialog"
      aria-label="Color picker"
      tabIndex={-1}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0, scale: 0.9, transition: { duration: 0.14, ease: EASE_OUT_QUINT } }
      }
      transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
      className="fixed z-50 flex flex-col gap-2 rounded-t-[94px] rounded-b-2xl border border-border/60 bg-popover/95 px-3 pt-2.5 pb-3 shadow-xl backdrop-blur-xl outline-none"
      style={{
        width: POPOVER_WIDTH,
        top: placement?.top ?? -9999,
        left: placement?.left ?? -9999,
        transformOrigin: placement?.origin,
      }}
    >
      <div className="relative -mx-2" style={{ width: DIAL_WIDTH, height: DIAL_HEIGHT }}>
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0, delay: 0.05 }}
          className="absolute inset-x-0 top-0"
          style={{ height: WHEEL_SIZE }}
        >
          <HueSaturationWheel hsv={state.hsv} onChange={commit} />
        </motion.div>

        {/* Punch the wheel out of the arc layer so the arc reads as a ring. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            WebkitMaskImage: 'radial-gradient(circle at 90px 84px, transparent 84px, black 85px)',
            maskImage: 'radial-gradient(circle at 90px 84px, transparent 84px, black 85px)',
          }}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { y: -18, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0, delay: 0.16 }}
            className="pointer-events-none absolute inset-0"
          >
            <BrightnessArc hsv={state.hsv} onChange={commit} />
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={state.draft}
          onChange={(event) => setState((prev) => ({ ...prev, draft: event.target.value }))}
          onBlur={() => {
            const parsed = normalizeHex(state.draft)
            if (parsed && parsed !== hsvToHex(state.hsv)) commit(hexToHsv(parsed))
            else setState((prev) => ({ ...prev, draft: hsvToHex(prev.hsv) }))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          aria-label="Hex color"
          spellCheck={false}
          autoComplete="off"
          className="h-7 w-full min-w-0 rounded-md bg-muted/70 px-2 text-[12px] font-medium text-foreground/90 tabular-nums outline-none transition-colors hover:bg-muted focus:bg-muted"
        />
        {pickFromScreen && (
          <button
            type="button"
            aria-label="Pick a color from the screen"
            title="Pick a color from the screen"
            onClick={pickFromScreen}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pipette aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
    </motion.div>,
    document.body,
  )
}
