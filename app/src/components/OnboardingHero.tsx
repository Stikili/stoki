/**
 * Onboarding hero — the first illustration a new user ever sees on stoki.
 *
 * Composition: an oversized version of the brand mark (three offset blocks)
 * surrounded by a small constellation of accent blocks at varying sizes,
 * floating against a soft radial wash. Reads as "your stack of stuff,
 * organised" without any literal storefront iconography that would limit
 * the brand to one customer segment.
 *
 * Pure SVG — scales crisply on every PWA splash size from 320×200 up.
 */
export default function OnboardingHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Stacks of stock arranged neatly"
    >
      <defs>
        {/* Soft emerald wash so the illustration anchors itself on dark bgs
            without a hard rectangle around it. */}
        <radialGradient id="oh-wash" cx="50%" cy="55%" r="60%">
          <stop offset="0%"   stopColor="#00C896" stopOpacity="0.18" />
          <stop offset="55%"  stopColor="#00C896" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#00C896" stopOpacity="0" />
        </radialGradient>
        {/* Drop-shadow under the main stack — gives the hero a sense of
            standing on something rather than floating in space. */}
        <radialGradient id="oh-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background wash */}
      <rect width="320" height="200" fill="url(#oh-wash)" />

      {/* Background accent blocks — small, dim, scattered to suggest
          inventory continuing past the frame. */}
      <g opacity="0.55">
        <rect x="36"  y="40"  width="22" height="8"  rx="2" fill="#00C896" fillOpacity="0.25" />
        <rect x="30"  y="52"  width="22" height="8"  rx="2" fill="#00C896" fillOpacity="0.18" />
        <rect x="270" y="36"  width="20" height="7"  rx="1.5" fill="#00C896" fillOpacity="0.22" />
        <rect x="278" y="48"  width="20" height="7"  rx="1.5" fill="#00C896" fillOpacity="0.16" />
        <rect x="248" y="156" width="16" height="6"  rx="1.5" fill="#00C896" fillOpacity="0.20" />
        <rect x="40"  y="160" width="14" height="6"  rx="1.5" fill="#00C896" fillOpacity="0.20" />
      </g>

      {/* Main mark — same proportions as Logo.tsx, blown up to 132×132,
          centred with a generous baseline glow. */}
      <ellipse cx="160" cy="178" rx="78" ry="8" fill="url(#oh-shadow)" />
      <g transform="translate(94, 30)">
        {/* Top block — right-aligned */}
        <rect x="40"  y="20"  width="64" height="24" rx="6" fill="#00C896" />
        {/* Middle block — left-aligned, dimmed for depth */}
        <rect x="24"  y="52"  width="64" height="24" rx="6" fill="#00C896" fillOpacity="0.78" />
        {/* Bottom block — right-aligned, mirroring the top */}
        <rect x="40"  y="84"  width="64" height="24" rx="6" fill="#00C896" />
      </g>

      {/* SA-flag-red brand period — keeps the dot present in the hero so
          users start to associate it with the wordmark they'll see later. */}
      <circle cx="232" cy="142" r="3.5" fill="#EF4444" />
    </svg>
  )
}
