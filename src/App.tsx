import { useCallback, useState } from 'react'
import { ExampleCard } from '@/components/ExampleCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ChannelPicker } from '@/components/pickers/ChannelPicker'
import { ClassicPicker } from '@/components/pickers/ClassicPicker'
import { SwatchPicker } from '@/components/pickers/SwatchPicker'
import { ColorRow } from '@/components/pickers/dial/ColorRow'

const DIAL_DEFAULTS = {
  Surface: '#f4f1ec',
  Accent: '#3d6e7b',
  Text: '#1c1b1a',
}

export default function App() {
  const [dial, setDial] = useState(DIAL_DEFAULTS)
  const [classic, setClassic] = useState('#7c5cffcc')
  const [swatch, setSwatch] = useState('#3d6e7b')
  const [channel, setChannel] = useState('#c2410c')
  const [recent, setRecent] = useState<string[]>([])

  const pickSwatch = useCallback((hex: string) => {
    setSwatch(hex)
    setRecent((prev) => [hex, ...prev.filter((item) => item !== hex)].slice(0, 7))
  }, [])

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Color pickers</h1>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Four takes on the same problem, built on one shared colour library. Each is a
              self-contained React component — drag, or focus and use the arrow keys.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="space-y-6">
          <ExampleCard
            index={1}
            title="Radial dial"
            description="An Okhsv wheel for hue and saturation with a brightness arc wrapped around its base. Because the wheel is perceptual rather than sRGB HSV, the ramp from centre to rim stays even instead of crowding the yellows."
            notes={[
              'The wheel is rasterised once to a canvas at device resolution, blurred, then clipped — no per-frame redraw while dragging.',
              'The arc spans 84° at the bottom of the dial; only its stroke takes pointer events, so the wheel underneath stays reachable.',
              'HSV is held as the source of truth while the popover is open, so dragging near the centre does not lose the hue to hex rounding.',
            ]}
          >
            <div className="w-full max-w-[264px] space-y-1.5">
              {(Object.keys(DIAL_DEFAULTS) as Array<keyof typeof DIAL_DEFAULTS>).map((key) => (
                <ColorRow
                  key={key}
                  label={key}
                  value={dial[key]}
                  onValueChange={(hex) => setDial((prev) => ({ ...prev, [key]: hex }))}
                  onReset={
                    dial[key] !== DIAL_DEFAULTS[key]
                      ? () => setDial((prev) => ({ ...prev, [key]: DIAL_DEFAULTS[key] }))
                      : undefined
                  }
                />
              ))}
            </div>
          </ExampleCard>

          <ExampleCard
            index={2}
            title="Classic panel"
            description="The saturation/value plane everyone already knows, with hue and alpha rails and a format switcher. sRGB HSV here on purpose — it is what the numeric formats below it describe."
            notes={[
              'Hue and saturation survive dragging into the black corner, where hex alone would forget them.',
              'Alpha rides in the hex string as an eighth and ninth digit and drops out again at full opacity.',
            ]}
          >
            <ClassicPicker value={classic} onValueChange={setClassic} />
          </ExampleCard>

          <ExampleCard
            index={3}
            title="Swatch grid"
            description="Constrained choice. The ramp is generated in Okhsv from six hues and five fixed saturation/brightness steps, so every row lines up perceptually rather than being hand-tuned."
            notes={[
              'Picking a colour pushes it onto a recents strip, capped at seven.',
              'The check mark flips between black and white based on relative luminance.',
            ]}
          >
            <SwatchPicker value={swatch} onValueChange={pickSwatch} recent={recent} />
          </ExampleCard>

          <ExampleCard
            index={4}
            title="OKLCH channels"
            description="One rail per channel, for when you want to hold lightness fixed and move only hue — the edit that is awkward in every other model here."
            notes={[
              'Each track is sampled through the same conversion the swatch uses, so it previews the real result including gamut mapping.',
              'Colours outside sRGB are mapped by reducing chroma at constant lightness and hue, and the panel says so rather than silently clipping.',
              'Shift with the arrow keys steps ten times faster.',
            ]}
          >
            <ChannelPicker value={channel} onValueChange={setChannel} />
          </ExampleCard>
        </div>

        <footer className="mt-12 text-[12.5px] text-muted-foreground">
          Colour maths after{' '}
          <a
            href="https://bottosson.github.io/posts/colorpicker/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Björn Ottosson's Okhsv and Okhsl
          </a>
          .
        </footer>
      </div>
    </div>
  )
}
