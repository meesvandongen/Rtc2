import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import * as Icons from './primitives/Icons'
import type {
  DataTableComponents,
  RtcBadgeProps,
  RtcButtonProps,
  RtcCheckboxProps,
  RtcDialogProps,
  RtcIconButtonProps,
  RtcIconName,
  RtcIconProps,
  RtcMenuProps,
  RtcMultiSelectProps,
  RtcNumberInputProps,
  RtcPopoverProps,
  RtcProgressBarProps,
  RtcRadioProps,
  RtcRangeSliderProps,
  RtcSelectProps,
  RtcSkeletonProps,
  RtcSwitchProps,
  RtcTextInputProps,
  RtcTooltipProps,
} from './registry'

const cx = (...v: Array<string | false | undefined>) => v.filter(Boolean).join(' ') || undefined

const spread = (attributes: Record<string, string> | undefined) => attributes ?? {}

// ---------------------------------------------------------------- icons ----

const ICONS: Record<RtcIconName, (props: { className?: string }) => ReactNode> = {
  sortAsc: Icons.ArrowUpIcon,
  sortDesc: Icons.ArrowDownIcon,
  sortNone: Icons.ArrowUpDownIcon,
  chevronRight: Icons.ChevronRightIcon,
  chevronLeft: Icons.ChevronLeftIcon,
  chevronDown: Icons.ChevronDownIcon,
  chevronsLeft: Icons.ChevronsLeftIcon,
  chevronsRight: Icons.ChevronsRightIcon,
  search: Icons.SearchIcon,
  close: Icons.CloseIcon,
  filter: Icons.FilterIcon,
  columns: Icons.ColumnsIcon,
  density: Icons.DensityIcon,
  fullScreen: Icons.FullScreenIcon,
  exitFullScreen: Icons.ExitFullScreenIcon,
  more: Icons.MoreVerticalIcon,
  eye: Icons.EyeIcon,
  eyeOff: Icons.EyeOffIcon,
  pin: Icons.PinIcon,
  pinOff: Icons.PinOffIcon,
  group: Icons.GroupIcon,
  drag: Icons.DragIcon,
  edit: Icons.EditIcon,
  save: Icons.SaveIcon,
  alert: Icons.AlertIcon,
  reset: Icons.ResetIcon,
}

function Icon({ name, className }: RtcIconProps) {
  const Glyph = ICONS[name]
  return <Glyph className={className} />
}

// -------------------------------------------------------------- buttons ----

const Button = forwardRef<HTMLButtonElement, RtcButtonProps>(function Button(
  { children, onClick, disabled, variant = 'default', size, type = 'button', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('rtc-button', className)}
      data-rtc-variant={variant === 'default' ? undefined : variant}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
})

const IconButton = forwardRef<HTMLButtonElement, RtcIconButtonProps>(function IconButton(
  { label, children, active, size = 'md', className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx('rtc-icon-button', className)}
      title={label}
      aria-label={label}
      data-rtc-active={active ? 'true' : undefined}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
})

// --------------------------------------------------------------- inputs ----

const TextInput = forwardRef<HTMLInputElement, RtcTextInputProps>(function TextInput(
  { value, onChange, label, placeholder, type = 'text', size, autoFocus, disabled, onBlur, onKeyDown, dataAttributes },
  ref,
) {
  return (
    <input
      ref={ref}
      className="rtc-input"
      type={type}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      {...spread(dataAttributes)}
    />
  )
})

function NumberInput({ value, onChange, label, placeholder, min, max, size, ...rest }: RtcNumberInputProps) {
  return (
    <input
      className="rtc-input"
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      aria-label={label}
      placeholder={placeholder}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      onChange={(event) =>
        onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
      }
      onBlur={rest.onBlur}
      onKeyDown={rest.onKeyDown}
      autoFocus={rest.autoFocus}
      disabled={rest.disabled}
      {...spread(rest.dataAttributes)}
    />
  )
}

function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  size,
  disabled,
  dataAttributes,
}: RtcSelectProps) {
  return (
    <select
      className="rtc-select"
      value={value}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      onChange={(event) => onChange(event.target.value)}
      {...spread(dataAttributes)}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function MultiSelect({ value, onChange, options, label, size }: RtcMultiSelectProps) {
  return (
    <select
      className="rtc-select"
      multiple
      value={value}
      aria-label={label}
      data-rtc-size={size === 'sm' ? 'sm' : undefined}
      onChange={(event) =>
        onChange(Array.from(event.target.selectedOptions, (option) => option.value))
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function Checkbox({ checked, indeterminate, onChange, label, disabled, onClick }: RtcCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  // `indeterminate` is a DOM property, not an attribute.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && !!indeterminate
  }, [checked, indeterminate])

  return (
    <input
      ref={ref}
      className="rtc-checkbox"
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      title={label}
      onChange={(event) => onChange(event.target.checked)}
      onClick={onClick}
    />
  )
}

function Radio({ checked, onChange, label, disabled, onClick, name }: RtcRadioProps) {
  return (
    <input
      className="rtc-checkbox"
      type="radio"
      name={name}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      title={label}
      onChange={(event) => onChange(event.target.checked)}
      onClick={onClick}
    />
  )
}

function Switch({ checked, onChange, label, disabled, onClick }: RtcSwitchProps) {
  return (
    <span className="rtc-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
      <span className="rtc-switch-track" />
      <span className="rtc-switch-thumb" />
    </span>
  )
}

function RangeSlider({ value, onChange, min, max, step, label }: RtcRangeSliderProps) {
  const [low, high] = value
  return (
    <div className="rtc-filter-range">
      <input
        className="rtc-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={low}
        aria-label={`${label} minimum`}
        onChange={(event) => onChange([Math.min(Number(event.target.value), high), high])}
      />
      <input
        className="rtc-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={high}
        aria-label={`${label} maximum`}
        onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
      />
    </div>
  )
}

// ------------------------------------------------------------- overlays ----

/**
 * Shared positioning for the built-in popover and menu.
 *
 * Portalled because both are opened from inside a scroll container with
 * `overflow: auto`, which would otherwise clip them.
 */
function useOverlay(open: boolean, align: 'start' | 'center' | 'end') {
  const triggerRef = useRef<HTMLElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const update = () => {
    const anchor = triggerRef.current
    const surface = surfaceRef.current
    if (!anchor || !surface) return
    const rect = anchor.getBoundingClientRect()
    const box = surface.getBoundingClientRect()
    const gutter = 8

    let top = rect.bottom + 4
    if (top + box.height > window.innerHeight - gutter) {
      top = Math.max(gutter, rect.top - box.height - 4)
    }
    let left =
      align === 'end'
        ? rect.right - box.width
        : align === 'center'
          ? rect.left + rect.width / 2 - box.width / 2
          : rect.left
    left = Math.max(gutter, Math.min(left, window.innerWidth - box.width - gutter))
    setPosition({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onReflow = () => update()
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align])

  return { triggerRef, surfaceRef, position }
}

/**
 * Monotonic id per opened overlay, used to order the overlay stack.
 *
 * Overlays are portalled to `document.body`, so a menu opened from inside a
 * popover is a DOM *sibling* of that popover, not a descendant. Without this,
 * clicking the nested menu reads as an outside click and dismisses the popover
 * underneath it — which is exactly what the filter-operator menu does.
 */
let overlayCounter = 0

function useDismiss(
  open: boolean,
  close: () => void,
  refs: Array<React.RefObject<HTMLElement | null>>,
) {
  const depthRef = useRef(0)
  if (open && depthRef.current === 0) depthRef.current = ++overlayCounter
  if (!open) depthRef.current = 0

  useEffect(() => {
    if (!open) return
    const depth = depthRef.current

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (refs.some((ref) => ref.current?.contains(target))) return
      // Ignore clicks inside an overlay opened after this one: it is nested,
      // and dismissing its parent would tear it down mid-interaction.
      const surface = (target as Element).parentElement
        ? ((target as Element).closest?.('[data-rtc-overlay-depth]') ?? null)
        : null
      if (surface) {
        const other = Number(surface.getAttribute('data-rtc-overlay-depth'))
        if (other > depth) return
      }
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Only the topmost overlay reacts, so Escape peels one layer at a time.
      const top = Math.max(
        0,
        ...Array.from(document.querySelectorAll('[data-rtc-overlay-depth]')).map((node) =>
          Number(node.getAttribute('data-rtc-overlay-depth')),
        ),
      )
      if (depth !== top) return
      event.stopPropagation()
      close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close])

  return depthRef
}

/** Wraps a rendered trigger so we can attach a ref and a click handler to it. */
function TriggerSlot({
  node,
  triggerRef,
  onToggle,
  controls,
  expanded,
  haspopup,
}: {
  node: ReactNode
  triggerRef: React.MutableRefObject<HTMLElement | null>
  onToggle: () => void
  controls: string | undefined
  expanded: boolean
  haspopup: 'menu' | 'dialog'
}) {
  return (
    <span
      // A wrapper rather than cloneElement: the trigger is an arbitrary node
      // supplied by whatever renders the overlay, and may not forward a ref.
      ref={(node) => {
        triggerRef.current = (node?.firstElementChild as HTMLElement | null) ?? node
      }}
      style={{ display: 'contents' }}
      onClickCapture={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      aria-controls={controls}
    >
      {node}
    </span>
  )
}

function Popover({ trigger, children, label, align = 'start', open, onOpenChange }: RtcPopoverProps) {
  const id = useId()
  const [uncontrolled, setUncontrolled] = useState(false)
  const isOpen = open ?? uncontrolled
  const setOpen = (next: boolean) => {
    if (open === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }

  const { triggerRef, surfaceRef, position } = useOverlay(isOpen, align)
  const depthRef = useDismiss(isOpen, () => setOpen(false), [surfaceRef, triggerRef])

  return (
    <>
      <TriggerSlot
        node={trigger}
        triggerRef={triggerRef}
        onToggle={() => setOpen(!isOpen)}
        controls={isOpen ? id : undefined}
        expanded={isOpen}
        haspopup="dialog"
      />
      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={id}
              ref={surfaceRef}
              className="rtc-menu rtc-popover"
              role="dialog"
              aria-label={label}
              data-rtc-overlay-depth={depthRef.current}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function Menu({ trigger, items, label, align = 'start' }: RtcMenuProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const { triggerRef, surfaceRef, position } = useOverlay(open, align)

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const depthRef = useDismiss(open, close, [surfaceRef, triggerRef])

  // Focus the first action so keyboard users land inside the menu.
  useEffect(() => {
    if (!open || !position) return
    surfaceRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])')
      ?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const nodes = Array.from(
      surfaceRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])',
      ) ?? [],
    )
    if (nodes.length === 0) return
    event.preventDefault()
    const index = nodes.indexOf(document.activeElement as HTMLElement)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    nodes[(index + delta + nodes.length) % nodes.length]?.focus()
  }

  return (
    <>
      <TriggerSlot
        node={trigger}
        triggerRef={triggerRef}
        onToggle={() => setOpen((value) => !value)}
        controls={open ? id : undefined}
        expanded={open}
        haspopup="menu"
      />
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={id}
              ref={surfaceRef}
              className="rtc-menu"
              role="menu"
              aria-label={label}
              data-rtc-overlay-depth={depthRef.current}
              onKeyDown={onKeyDown}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              {items.map((item) => {
                if (item.type === 'separator') return <hr key={item.id} className="rtc-menu-separator" />
                if (item.type === 'label') {
                  return (
                    <div key={item.id} className="rtc-menu-label">
                      {item.label}
                    </div>
                  )
                }
                if (item.type === 'custom') {
                  return (
                    <div key={item.id} className="rtc-menu-section">
                      {item.content}
                    </div>
                  )
                }
                const isCheckbox = item.type === 'checkbox'
                return (
                  <button
                    key={item.id}
                    type="button"
                    role={isCheckbox ? 'menuitemcheckbox' : 'menuitem'}
                    aria-checked={isCheckbox ? item.checked : undefined}
                    className="rtc-menu-item"
                    disabled={item.disabled}
                    data-rtc-active={
                      (isCheckbox ? item.checked : item.active) ? 'true' : undefined
                    }
                    data-rtc-danger={!isCheckbox && item.danger ? 'true' : undefined}
                    onClick={() => {
                      item.onSelect?.()
                      close()
                    }}
                  >
                    {item.icon ? <span className="rtc-menu-item-icon">{item.icon}</span> : null}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function Dialog({ open, onClose, title, children, footer, label }: RtcDialogProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    surfaceRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = surfaceRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="rtc-dialog-backdrop rtc-root" onPointerDown={onClose} data-rtc-edit-dialog="">
      <div
        ref={surfaceRef}
        className="rtc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className="rtc-dialog-title">{title}</h2>
        <div className="rtc-dialog-fields">{children}</div>
        {footer ? <div className="rtc-dialog-actions">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

function Tooltip({ label, children }: RtcTooltipProps) {
  // The native title attribute keeps the default set dependency-free; adapters
  // that have a real tooltip should override this.
  return <span title={label}>{children}</span>
}

function Badge({ children, onRemove, removeLabel }: RtcBadgeProps) {
  return (
    <span className="rtc-chip">
      {children}
      {onRemove ? (
        <IconButton size="sm" label={removeLabel ?? 'Remove'} onClick={onRemove}>
          <Icon name="close" />
        </IconButton>
      ) : null}
    </span>
  )
}

function Skeleton({ width }: RtcSkeletonProps) {
  return <span className="rtc-skeleton" style={width ? { width } : undefined} aria-hidden="true" />
}

function ProgressBar({ label }: RtcProgressBarProps) {
  return <div className="rtc-progress" role="progressbar" aria-label={label} aria-busy="true" />
}

/** The built-in, dependency-free implementation of the component contract. */
export const defaultComponents: DataTableComponents = {
  Button,
  IconButton,
  TextInput,
  NumberInput,
  Select,
  MultiSelect,
  Checkbox,
  Radio,
  Switch,
  RangeSlider,
  Popover,
  Menu,
  Dialog,
  Tooltip,
  Badge,
  Skeleton,
  ProgressBar,
  Icon,
}
