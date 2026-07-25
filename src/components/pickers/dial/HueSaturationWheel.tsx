import { useEffect, useRef } from 'react'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import {
  clamp,
  cuspForHue,
  gammaEncode,
  hsvToHex,
  okhsvToLinearSrgb,
  type HSV,
} from '@/lib/okhsv'

/** Diameter of the wheel in CSS pixels. */
export const WHEEL_SIZE = 168
const CENTER = WHEEL_SIZE / 2
/** Radius mapped to 100% saturation — smaller than the wheel so the rim is flat. */
const SATURATION_RADIUS = 75
/** Softens the pixel grid; the wheel is drawn once and never redrawn. */
const BLUR_PX = 5

type Props = {
  hsv: HSV
  onChange: (hsv: HSV) => void
}

export function HueSaturationWheel({ hsv, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [wheelRef, dragging, handlers] = usePointerDrag<HTMLDivElement>((clientX, clientY) => {
    const rect = wheelRef.current?.getBoundingClientRect()
    if (!rect) return

    const dx = clientX - rect.left - CENTER
    const dy = clientY - rect.top - CENTER

    onChange({
      ...hsv,
      // +90 puts hue 0 at 12 o'clock and runs it clockwise.
      h: ((180 * Math.atan2(dy, dx)) / Math.PI + 90 + 360) % 360,
      s: 100 * clamp(Math.hypot(dx, dy) / SATURATION_RADIUS, 0, 1),
    })
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = Math.round(WHEEL_SIZE * dpr)
    canvas.width = size
    canvas.height = size

    const image = ctx.createImageData(size, size)
    const data = image.data
    const center = size / 2
    const radius = SATURATION_RADIUS * dpr

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - center
        const dy = y + 0.5 - center
        // 1.25 turns == 90deg rotation + wrap, matching the pointer mapping.
        const hue = (Math.atan2(dy, dx) / (2 * Math.PI) + 1.25) % 1
        const saturation = clamp(Math.hypot(dx, dy) / radius, 0, 1)
        const rgb = okhsvToLinearSrgb(hue, saturation, 1, cuspForHue(hue))

        const i = (y * size + x) * 4
        data[i] = Math.round(255 * clamp(gammaEncode(rgb[0]), 0, 1))
        data[i + 1] = Math.round(255 * clamp(gammaEncode(rgb[1]), 0, 1))
        data[i + 2] = Math.round(255 * clamp(gammaEncode(rgb[2]), 0, 1))
        data[i + 3] = 255
      }
    }

    // putImageData ignores filters, so stage the pixels then blit them blurred.
    const staging = document.createElement('canvas')
    staging.width = size
    staging.height = size
    staging.getContext('2d')?.putImageData(image, 0, 0)

    ctx.filter = `blur(${BLUR_PX * dpr}px)`
    ctx.drawImage(staging, 0, 0)
    ctx.filter = 'none'

    // Blur bleeds past the rim; clip back to a clean circle.
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(center, center, center - 0.5, 0, 2 * Math.PI)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  const angle = ((hsv.h - 90) * Math.PI) / 180
  const distance = (hsv.s / 100) * SATURATION_RADIUS
  const thumbX = CENTER + distance * Math.cos(angle)
  const thumbY = CENTER + distance * Math.sin(angle)

  return (
    <div
      ref={wheelRef}
      role="slider"
      aria-label="Hue and saturation"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hsv.h)}
      aria-valuetext={`Hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s)}%`}
      tabIndex={0}
      onKeyDown={(event) => {
        let dh = 0
        let ds = 0
        if (event.key === 'ArrowRight') dh = 2
        else if (event.key === 'ArrowLeft') dh = -2
        else if (event.key === 'ArrowUp') ds = 2
        else if (event.key === 'ArrowDown') ds = -2
        else return

        event.preventDefault()
        onChange({ ...hsv, h: (hsv.h + dh + 360) % 360, s: clamp(hsv.s + ds, 0, 100) })
      }}
      {...handlers}
      className="relative mx-auto cursor-pointer rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full rounded-full ring-1 ring-foreground/10 ring-inset"
      />
      <div
        className="pointer-events-none absolute size-4 rounded-full border-2 border-white transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{
          left: thumbX,
          top: thumbY,
          background: hsvToHex(hsv),
          boxShadow: '0 0 0 1px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.25)',
          transform: `translate(-50%, -50%) scale(${dragging ? 1.25 : 1})`,
        }}
      />
    </div>
  )
}
