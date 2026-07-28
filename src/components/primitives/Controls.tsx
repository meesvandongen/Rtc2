import { forwardRef, useEffect, useRef, type ReactNode } from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={['rtc-icon-button', className].filter(Boolean).join(' ')}
      title={label}
      aria-label={label}
      data-rtc-active={active ? 'true' : undefined}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      {...rest}
    >
      {children}
    </button>
  )
})

export interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  label: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClick?: (event: React.MouseEvent<HTMLInputElement>) => void
  variant?: 'checkbox' | 'radio' | 'switch'
  name?: string
}

/**
 * Selection control. `indeterminate` is a DOM property rather than an
 * attribute, so it has to be assigned through a ref.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  disabled,
  label,
  onChange,
  onClick,
  variant = 'checkbox',
  name,
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && indeterminate
  }, [checked, indeterminate])

  if (variant === 'switch') {
    return (
      <span className="rtc-switch">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-label={label}
          onChange={onChange}
          onClick={onClick}
        />
        <span className="rtc-switch-track" />
        <span className="rtc-switch-thumb" />
      </span>
    )
  }

  return (
    <input
      ref={ref}
      className="rtc-checkbox"
      type={variant === 'radio' ? 'radio' : 'checkbox'}
      name={name}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      title={label}
      onChange={onChange}
      onClick={onClick}
    />
  )
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Array<{ label: string; value: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, className, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={['rtc-select', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
})

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={['rtc-input', className].filter(Boolean).join(' ')} {...rest} />
  },
)

export function Button({
  variant = 'default',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' }) {
  return (
    <button
      type="button"
      className={['rtc-button', className].filter(Boolean).join(' ')}
      data-rtc-variant={variant === 'primary' ? 'primary' : undefined}
      {...rest}
    >
      {children}
    </button>
  )
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="rtc-visually-hidden">{children}</span>
}

export function Skeleton({ width }: { width?: string }) {
  return <span className="rtc-skeleton" style={width ? { width } : undefined} aria-hidden="true" />
}

export function LinearProgress({ label }: { label: string }) {
  return <div className="rtc-progress" role="progressbar" aria-label={label} aria-busy="true" />
}
