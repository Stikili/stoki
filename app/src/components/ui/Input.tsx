import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-white font-medium">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full bg-surface rounded-xl px-4 py-3 text-white placeholder-muted outline-none border transition-colors text-sm',
          error ? 'border-danger focus:border-danger' : 'border-white/10 focus:border-brand',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
})
