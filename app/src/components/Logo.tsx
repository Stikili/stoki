interface LogoProps {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export default function Logo({
  size = 24,
  color = '#00C896',
  className,
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Stoki"
    >
      <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="3" />
      <path d="M 32 32 L 47 16 A 22 22 0 1 1 28 10 Z" fill={color} />
    </svg>
  )
}
