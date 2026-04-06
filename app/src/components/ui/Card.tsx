import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'brand' | 'danger' | 'warning'
}

const variantClasses = {
  default: 'bg-navy-card border-white/5',
  brand: 'bg-gradient-to-br from-brand/20 to-brand/5 border-brand/20',
  danger: 'bg-danger/10 border-danger/20',
  warning: 'bg-warning/10 border-warning/20',
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={['rounded-2xl border p-4', variantClasses[variant], className].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-muted text-xs uppercase tracking-wide mb-1 ${className}`}>{children}</p>
  )
}
