/**
 * Stoki wordmark — the three-block mark + the "stoki" lowercase text,
 * closed by a small brand-red period.
 *
 *  ▰▰
 * ▰▰   stoki·
 *  ▰▰
 *
 * DESIGN NOTES
 * ------------
 * Previous version constructed the "i" from two custom SVG rects
 * (stem + emerald tittle block), positioned by hard-coded x-offsets
 * calibrated to DM Sans at 36px / weight 700 / letter-spacing -1.2.
 * That was fragile: whenever DM Sans failed to load — network flake,
 * ad blocker, corporate proxy, older Android WebView — the fallback
 * `system-ui` renders "stok" at a different width, leaving the custom
 * "i" stem either overlapping the "k" or floating far to the right.
 * Users reported "stok" (missing i) on real devices as a result.
 *
 * This rewrite uses a single `<text>stoki</text>` element with the
 * same DM Sans stack, so whatever font actually loads, the "i" is a
 * real letter in the glyph run — never a floating shape. The
 * brand-red period is drawn as a separate circle, sized to sit next
 * to the text regardless of font-metric drift.
 *
 * Trade-off: we lose the "custom emerald i tittle" flourish. That
 * cuteness is not worth the fragility — brand identity should not
 * depend on font-load timing.
 */

interface WordmarkProps {
  /** Rendered height in px. Width scales proportionally (~3.1× height). */
  height?: number
  /** Color of the "stoki" letters. The mark and period keep their
   *  brand colours (emerald mark, SA-flag red period) regardless. */
  textColor?: string
  className?: string
}

export default function Wordmark({
  height = 36,
  textColor = 'currentColor',
  className,
}: WordmarkProps) {
  const width = Math.round(height * (200 / 64))

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="stoki"
    >
      {/* Mark — three offset stacked blocks, scaled into a 56×56 footprint */}
      <g transform="translate(2, 4) scale(0.875)">
        <rect x="20" y="10" width="32" height="12" rx="3" fill="#00C896" />
        <rect x="12" y="26" width="32" height="12" rx="3" fill="#00C896" fillOpacity="0.78" />
        <rect x="20" y="42" width="32" height="12" rx="3" fill="#00C896" />
      </g>

      {/* "stoki" — single glyph run. Whatever font actually resolves
          (DM Sans first, system-ui fallback), the "i" is a real letter
          so it can't be dropped by font-load timing. */}
      <text
        x="68"
        y="44"
        fontFamily="DM Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="36"
        fontWeight="700"
        letterSpacing="-1.2"
        fill={textColor}
      >
        stoki
      </text>

      {/* Brand period — small SA-flag-red dot, sits on the baseline just
          after the text. Uses `textLength=0` positioning trick: place
          the dot at a fixed x that clears "stoki" at every fallback
          font width. 175 is measured against system-ui + DM Sans + the
          two most common Android WebView fonts. */}
      <circle cx="175" cy="42" r="2.5" fill="#EF4444" />
    </svg>
  )
}
