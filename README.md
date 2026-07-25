# Color pickers

A Vite 8 + React 19 + TypeScript project showing four takes on the same problem,
built on one shared colour library.

**[Live demo →](https://ahzs645.github.io/colorpicker/)**

```bash
npm install
npm run dev
```

## Credit

The radial dial (example 01) is a reconstruction of the color picker from
[canvasui.dev](https://canvasui.dev) — the layout, the 84° arc geometry and the
Okhsv model are theirs, and this repo reimplements them rather than inventing
them. It is published here as a study of how that picker works. The underlying
colour maths is [Björn Ottosson's](https://bottosson.github.io/posts/colorpicker/),
released publicly by the author. Examples 02–04 are original.

## Examples

**01 — Radial dial.** An Okhsv wheel for hue and saturation with a brightness arc
wrapped around its base, opening from a settings row. This is the first example
and the one the project is built around.

**02 — Classic panel.** The saturation/value plane everyone knows, with hue and
alpha rails and a HEX/RGB/HSL switcher. Deliberately sRGB HSV — that is what the
numeric formats underneath it describe.

**03 — Swatch grid.** Constrained choice, generated in Okhsv from six hues and
five fixed saturation/brightness steps so every row lines up perceptually.

**04 — OKLCH channels.** One rail per channel, for holding lightness fixed while
moving only hue. Out-of-gamut colours are mapped by reducing chroma at constant
lightness and hue, and the panel says when that happened.

## Colour model

`src/lib/okhsv.ts` implements Okhsv from
[Björn Ottosson's colour picker post](https://bottosson.github.io/posts/colorpicker/):
Oklab plus a gamut-cusp approximation and a lightness "toe". Equal steps in `s`
and `v` read as equal steps to the eye, which is why the dial's ramp from centre
to rim stays even instead of crowding the yellows the way an sRGB HSV wheel does.

`src/lib/color.ts` holds everything that is not Okhsv: hex parsing, sRGB HSV/HSL
for the classic panel, and OKLCH with chroma-reduction gamut mapping.

## Layout

```
src/
  lib/            okhsv.ts, color.ts, utils.ts
  hooks/          usePointerDrag.ts, useEyeDropper.ts
  components/
    pickers/
      dial/       ColorRow -> DialPopover -> HueSaturationWheel + BrightnessArc
      ClassicPicker.tsx
      SwatchPicker.tsx
      ChannelPicker.tsx
```

Every picker is controlled (`value` + `onValueChange`) and keyboard-operable:
focus any track and use the arrow keys. The dial adds Page Up/Down, Home and End
on the brightness arc; the OKLCH rails take Shift for 10× steps.

## Notes on the dial

- The wheel is rasterised once to a canvas at device pixel ratio (capped at 2),
  blurred, then clipped to a circle. It never redraws while dragging.
- The gamut cusp is memoised over 1024 hue buckets, so the 168×168 raster does
  ~28k lookups instead of ~28k Halley iterations.
- The arc spans 84° at the bottom of the dial. Its `<svg>` sits on top of the
  wheel with `pointer-events: none`, and only the strokes opt back in — so the
  wheel underneath stays fully reachable.
- HSV is the source of truth while the popover is open. Round-tripping through
  hex on every drag would quantise the hue near the wheel's centre, where a
  1-byte change in the hex spans several degrees.
- The eyedropper button only renders where `window.EyeDropper` exists
  (Chromium, secure contexts).
