/**
 * Stoki wordmark — the mark + lowercase "stoki" with the "i" tittle replaced
 * by a small emerald block that echoes the mark's shape vocabulary, plus
 * the brand-red period as a closing flourish.
 *
 *  ▰▰
 * ▰▰   stok·  ─ — ─
 *  ▰▰         "i" stem + tiny block (replaces the regular tittle)
 *
 * Geometry:
 *   - canvas        fixed 200×64 viewBox — caller sizes via `height`
 *   - mark area     0–60  (left-aligned)
 *   - text area     70–155 ("stok" → 70-122, "i" stem → 128-132, period → 145)
 *   - tittle block  centred above the i stem, 8w × 5h, brand emerald
 *   - period        2.5r dot in SA-flag red, baseline-aligned with text
 */

interface WordmarkProps {
  /** Rendered height in px. Width scales proportionally (~3.1× height). */
  height?: number
  /** Color of the "stok" letters. The mark + tittle stay brand emerald
   *  and the period stays brand red regardless of this prop. */
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

      {/* "stok" — slightly tighter letter-spacing for a refined feel.
          y baseline tuned so the visual middle of the cap-height sits on
          the canvas centre line, matching the mark's vertical centre. */}
      <text
        x="68"
        y="44"
        fontFamily="DM Sans, system-ui, sans-serif"
        fontSize="36"
        fontWeight="700"
        letterSpacing="-1.2"
        fill={textColor}
      >
        stok
      </text>

      {/* Custom "i" — stem + stacked-block tittle. Position calibrated to
          land just after the "k" in DM Sans 36px / weight 700 / -1.2 spacing.
          The stem matches the lowercase x-height of the rest of the wordmark;
          the block above is intentionally a bit wider than a normal tittle so
          it reads as a deliberate brand element, not a misprint. */}
      <rect x="143" y="26" width="4" height="18" rx="1" fill={textColor} />
      <rect x="140" y="16" width="10" height="6" rx="1.5" fill="#00C896" />

      {/* Brand period — small SA-flag-red dot, sits on the baseline. */}
      <circle cx="160" cy="42" r="2.5" fill="#EF4444" />
    </svg>
  )
}
