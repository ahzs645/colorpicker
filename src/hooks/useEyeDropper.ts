import { useCallback, useSyncExternalStore } from 'react'
import { normalizeHex } from '@/lib/color'

type EyeDropperInstance = { open: () => Promise<{ sRGBHex: string }> }
type EyeDropperCtor = new () => EyeDropperInstance

declare global {
  interface Window {
    EyeDropper?: EyeDropperCtor
  }
}

const noopSubscribe = () => () => {}
const getSnapshot = () => window.EyeDropper ?? null
const getServerSnapshot = () => null

/**
 * Returns a `pick` callback when the browser supports the EyeDropper API
 * (Chromium only, secure contexts), otherwise null so callers can hide the UI.
 */
export function useEyeDropper(onPick: (hex: string) => void) {
  const EyeDropper = useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot)

  const pick = useCallback(() => {
    if (!EyeDropper) return
    new EyeDropper()
      .open()
      .then((result) => {
        const hex = normalizeHex(result.sRGBHex)
        if (hex) onPick(hex)
      })
      // The user cancelled (Escape) — nothing to report.
      .catch(() => {})
  }, [EyeDropper, onPick])

  return EyeDropper ? pick : null
}
