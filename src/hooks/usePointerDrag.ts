import { useCallback, useRef, useState } from 'react'

export type PointerHandlers = {
  onPointerDown: (event: React.PointerEvent) => void
  onPointerMove: (event: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onLostPointerCapture: () => void
}

/**
 * Track-and-drag over an element: captures the pointer so the drag survives
 * leaving the element, and bails out if the mouse button was released while
 * the pointer was outside the window.
 */
export function usePointerDrag<T extends Element>(
  onMove: (clientX: number, clientY: number) => void,
): [React.RefObject<T | null>, boolean, PointerHandlers] {
  const ref = useRef<T | null>(null)
  const [dragging, setDragging] = useState(false)

  const stop = useCallback(() => setDragging(false), [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault()
      try {
        ref.current?.setPointerCapture(event.pointerId)
      } catch {
        // Capture is best-effort; dragging still works without it.
      }
      setDragging(true)
      onMove(event.clientX, event.clientY)
    },
    [onMove],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging) return
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        setDragging(false)
        return
      }
      onMove(event.clientX, event.clientY)
    },
    [dragging, onMove],
  )

  return [
    ref,
    dragging,
    {
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: stop,
    },
  ]
}
