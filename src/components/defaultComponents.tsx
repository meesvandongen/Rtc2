import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal, flushSync } from 'react-dom'

import * as Icons from './primitives/Icons'
import type {
  DataTableComponents,
  RtcBadgeProps,
  RtcButtonProps,
  RtcCheckboxProps,
  RtcDialogProps,
  RtcDrawerProps,
  RtcIconButtonProps,
  RtcIconName,
  RtcIconProps,
  RtcLabelProps,
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

function RangeSlider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  minLabel,
  maxLabel,
}: RtcRangeSliderProps) {
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
        aria-label={minLabel ?? label}
        onChange={(event) => onChange([Math.min(Number(event.target.value), high), high])}
      />
      <input
        className="rtc-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={high}
        aria-label={maxLabel ?? label}
        onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
      />
    </div>
  )
}

// ------------------------------------------------------------- overlays ----

/**
 * The built-in overlays are native popovers.
 *
 * `popover` puts the surface in the **top layer**, so it escapes the table's
 * `overflow: auto` scroll containers and every `z-index` stack without being
 * portalled. Not portalling is the point: a menu opened from inside a filter
 * popover stays a real DOM descendant of it, which is how the platform decides
 * that one popover is nested inside another. Light dismiss, Escape, and
 * "closing me closes my children but not the other way round" then come from
 * the browser instead of a hand-rolled overlay stack.
 *
 * Positioning is still JavaScript. CSS anchor positioning would replace it,
 * but it is not yet in Firefox or Safari, and an overlay that lands in the
 * corner is a worse failure than a few lines of measurement.
 */
function useAnchoredPopover(align: 'start' | 'center' | 'end', open: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)

  const update = () => {
    const anchor = triggerRef.current
    const surface = surfaceRef.current
    if (!anchor || !surface || !surface.matches(':popover-open')) return
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
    surface.style.top = `${Math.round(top)}px`
    surface.style.left = `${Math.round(left)}px`
    surface.style.visibility = 'visible'
  }

  // Before the first measurement the surface would flash at the origin, so it
  // is shown hidden and revealed once positioned.
  useLayoutEffect(() => {
    if (!open) return
    const surface = surfaceRef.current
    if (surface) surface.style.visibility = 'hidden'
    update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onReflow = () => update()
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    // The surface is sized by its content, which can change while open — a
    // faceted list arriving, an operand editor swapping shape.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => update())
    if (observer && surfaceRef.current) observer.observe(surfaceRef.current)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align])

  return { triggerRef, surfaceRef, reposition: update }
}

/**
 * Keeps a native popover's open state and React's in step.
 *
 * The trigger drives the popover through `popovertarget` wherever it can, so
 * the browser owns the toggle. That matters for the case every hand-rolled
 * overlay gets wrong: clicking the trigger of an open popover light-dismisses
 * it *and* fires a click, which a naive handler reads as "open it again".
 */
function useNativePopoverSync(
  surfaceRef: React.RefObject<HTMLDivElement | null>,
  triggerRef: React.MutableRefObject<HTMLElement | null>,
  isOpen: boolean,
  setOpen: (next: boolean) => void,
  reposition: () => void,
) {
  const openRef = useRef(isOpen)
  openRef.current = isOpen
  /**
   * True between `beforetoggle` and `toggle`, i.e. while the browser is in the
   * middle of showing or hiding the surface itself.
   *
   * `beforetoggle` commits the state synchronously, which runs the reconcile
   * effect below — at a moment when React thinks the popover is open and the
   * DOM does not yet agree. Calling `showPopover()` there throws
   * `InvalidStateError: Invalid to show a popover during another show
   * operation`, the exception unwinds through the click handler, and the
   * browser's own show never completes. Chrome tolerated the re-entrant call
   * until recently, which is the worst kind of bug: correct-looking, and
   * version-dependent.
   */
  const midToggleRef = useRef(false)

  // Wire the trigger to the surface declaratively when it is a button; other
  // elements fall back to the click handler on the wrapper.
  useEffect(() => {
    const trigger = triggerRef.current
    const surface = surfaceRef.current
    if (!surface || !(trigger instanceof HTMLButtonElement)) return
    trigger.popoverTargetElement = surface
    trigger.popoverTargetAction = 'toggle'
    return () => {
      trigger.popoverTargetElement = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    // `beforetoggle` runs before the surface enters the top layer, which is
    // the only moment at which the contents can be committed *first*. The
    // surface renders its children lazily, so without the synchronous flush
    // the browser would show an empty box for a frame and then reflow it —
    // and it would be measured, and mispositioned, while still empty.
    const onBeforeToggle = (event: Event) => {
      const next = (event as ToggleEvent).newState === 'open'
      if (next) surface.style.visibility = 'hidden'
      midToggleRef.current = true
      if (next !== openRef.current) flushSync(() => setOpen(next))
    }
    // Position once the surface is actually in the top layer and measurable.
    const onToggle = (event: Event) => {
      midToggleRef.current = false
      const next = (event as ToggleEvent).newState === 'open'
      if (next !== openRef.current) setOpen(next)
      if (next) reposition()
    }
    surface.addEventListener('beforetoggle', onBeforeToggle)
    surface.addEventListener('toggle', onToggle)
    return () => {
      surface.removeEventListener('beforetoggle', onBeforeToggle)
      surface.removeEventListener('toggle', onToggle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOpen, reposition])

  // Reconcile in the other direction, for controlled `open` and for triggers
  // that could not be wired declaratively.
  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface || !surface.isConnected || midToggleRef.current) return
    const shown = surface.matches(':popover-open')
    // Guarded: the DOM is the source of truth for whether a popover is shown,
    // and a throw inside an effect takes the whole tree down with it.
    try {
      if (isOpen && !shown) surface.showPopover()
      else if (!isOpen && shown) surface.hidePopover()
    } catch {
      /* the browser is mid-transition; the toggle event will resync us */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
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
        // A button trigger is wired to the surface with `popovertarget`, so
        // the browser owns the toggle — including the case a hand-rolled
        // overlay always gets wrong, where clicking an open popover's trigger
        // light-dismisses it and then reads the same click as "open again".
        //
        // Nothing may be stopped on the way: a button's popover activation
        // behaviour runs only if the event actually reaches it, so calling
        // `stopPropagation` here — even in the capture phase, even for an
        // unrelated reason — silently disables every built-in overlay.
        if (triggerRef.current instanceof HTMLButtonElement) return
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
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange],
  )

  const { triggerRef, surfaceRef, reposition } = useAnchoredPopover(align, isOpen)
  useNativePopoverSync(surfaceRef, triggerRef, isOpen, setOpen, reposition)

  return (
    <>
      <TriggerSlot
        node={trigger}
        triggerRef={triggerRef}
        onToggle={() => setOpen(!isOpen)}
        controls={id}
        expanded={isOpen}
        haspopup="dialog"
      />
      {/* Always mounted so `popovertarget` has a stable target; the contents
          are not, so a closed filter editor costs nothing. */}
      <div
        id={id}
        ref={surfaceRef}
        popover="auto"
        className="rtc-surface rtc-popover"
        // Role and name only while shown. A closed surface is `display: none`
        // and empty, so advertising it as a named dialog would add a phantom
        // node that assistive tech — and anything querying by accessible
        // name — has to step over.
        role={isOpen ? 'dialog' : undefined}
        aria-label={isOpen ? label : undefined}
        data-rtc-popover=""
      >
        {isOpen ? children : null}
      </div>
    </>
  )
}

function Menu({ trigger, items, label, align = 'start' }: RtcMenuProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const { triggerRef, surfaceRef, reposition } = useAnchoredPopover(align, open)
  useNativePopoverSync(surfaceRef, triggerRef, open, setOpen, reposition)

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Focus the first action so keyboard users land inside the menu.
  useEffect(() => {
    if (!open) return
    surfaceRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])')
      ?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
        controls={id}
        expanded={open}
        haspopup="menu"
      />
      <div
        id={id}
        ref={surfaceRef}
        popover="auto"
        className="rtc-surface rtc-menu"
        role={open ? 'menu' : undefined}
        aria-label={open ? label : undefined}
        data-rtc-menu=""
        onKeyDown={onKeyDown}
      >
        {open
          ? items.map((item) => {
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
                  data-rtc-active={(isCheckbox ? item.checked : item.active) ? 'true' : undefined}
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
            })
          : null}
      </div>
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

/**
 * How long the sheet is given to slide out, in step with `styles.css`.
 *
 * Only used to decide when the contents may be unmounted; the animation
 * itself is entirely CSS, so a browser without `transition-behavior:
 * allow-discrete` simply hides the sheet at once and unmounts a beat later.
 */
const DRAWER_EXIT_MS = 220

/** Drag distance past which releasing the sheet dismisses it. */
const DRAWER_DISMISS_RATIO = 0.3
const DRAWER_DISMISS_MIN_PX = 64

/**
 * The built-in drawer is a native modal `<dialog>`.
 *
 * `showModal()` supplies everything a sheet needs and a hand-rolled one has to
 * reimplement: the top layer, a `::backdrop`, a focus trap, the rest of the
 * page made inert, Escape to dismiss, and focus returned to the trigger
 * afterwards. What is left here is the sheet's own manners — sliding in and
 * out (pure CSS: `@starting-style` plus `allow-discrete`) and swiping it down
 * to dismiss.
 *
 * Every dismissal path goes through the dialog's own `close` event, so
 * `onClose` fires exactly once whether the user pressed Escape, clicked the
 * backdrop, dragged the sheet away or hit the close button.
 */
function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  label,
  closeLabel = 'Close',
  side = 'bottom',
}: RtcDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // The contents mount with the sheet and stay mounted until it has finished
  // sliding out: a closed drawer should cost nothing, and an empty box gliding
  // off-screen is worse than no exit animation at all.
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  // `drag` is the sheet's inline offset; `dragging` is whether a finger is on
  // it. They are separate because the dismissal animates the offset *after*
  // the finger has gone, and that last stretch is the one that needs the
  // transition back.
  const [drag, setDrag] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragFrom = useRef<{ pointerId: number; y: number } | null>(null)
  const flingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openRef = useRef(open)
  openRef.current = open
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open, mounted])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onNativeClose = () => {
      setDrag(null)
      setDragging(false)
      dragFrom.current = null
      if (flingTimer.current) clearTimeout(flingTimer.current)
      // Reached only when the browser closed the sheet — Escape, the backdrop,
      // the close button. Our own `dialog.close()` above runs when `open` is
      // already false, and telling the owner to close again would be noise.
      if (openRef.current) onCloseRef.current()
    }
    dialog.addEventListener('close', onNativeClose)
    return () => dialog.removeEventListener('close', onNativeClose)
  }, [])

  useEffect(() => {
    if (open) return
    const timer = setTimeout(() => setMounted(false), DRAWER_EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  // A sheet over a page that still scrolls behind it is the classic bottom-
  // sheet annoyance; `inert` does not cover it.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const canDrag = side === 'bottom'

  const onPointerDown = (event: React.PointerEvent) => {
    if (!canDrag || event.button !== 0) return
    // The close button lives in the same strip; a press on it is not a drag.
    if ((event.target as HTMLElement).closest('button, a, input, select')) return
    if (flingTimer.current) clearTimeout(flingTimer.current)
    dragFrom.current = { pointerId: event.pointerId, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    setDrag(0)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const from = dragFrom.current
    if (!from || from.pointerId !== event.pointerId) return
    // Downwards only: dragging up would lift the sheet off its own edge.
    setDrag(Math.max(0, event.clientY - from.y))
  }

  const onPointerUp = (event: React.PointerEvent) => {
    const from = dragFrom.current
    if (!from || from.pointerId !== event.pointerId) return
    dragFrom.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const offset = Math.max(0, event.clientY - from.y)
    const height = dialogRef.current?.getBoundingClientRect().height ?? 0
    // Transitions come back the moment the finger leaves, so both outcomes are
    // animated: the sheet either springs back to its edge or carries on off
    // the bottom, and only then is the dialog actually closed.
    setDragging(false)
    if (offset > Math.max(DRAWER_DISMISS_MIN_PX, height * DRAWER_DISMISS_RATIO)) {
      setDrag(height)
      flingTimer.current = setTimeout(() => dialogRef.current?.close(), DRAWER_EXIT_MS)
    } else {
      setDrag(null)
    }
  }

  return (
    // `rtc-vars` because a drawer may be opened from the standalone filter
    // panel, outside any `<DataTable>`; harmless inside one, where the block
    // does not apply and the variables are inherited instead.
    <dialog
      ref={dialogRef}
      className="rtc-vars rtc-drawer"
      data-rtc-drawer=""
      data-rtc-side={side}
      data-rtc-dragging={dragging ? 'true' : undefined}
      aria-label={label}
      style={drag === null ? undefined : { translate: `0 ${drag}px` }}
      // A click that lands on the dialog itself came through the backdrop:
      // the sheet fills the element completely.
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close()
      }}
    >
      {mounted ? (
        <div className="rtc-drawer-sheet">
          <div
            className="rtc-drawer-handle"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {canDrag ? <span className="rtc-drawer-grabber" aria-hidden="true" /> : null}
            <div className="rtc-drawer-header">
              <h2 className="rtc-drawer-title">{title}</h2>
              <IconButton
                size="sm"
                label={closeLabel}
                className="rtc-drawer-close"
                onClick={() => dialogRef.current?.close()}
              >
                <Icon name="close" />
              </IconButton>
            </div>
          </div>

          <div className="rtc-drawer-body">{children}</div>
          {footer ? <div className="rtc-drawer-footer">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  )
}

function Tooltip({ label, children, className }: RtcTooltipProps) {
  // The native title attribute keeps the default set dependency-free; adapters
  // that have a real tooltip should override this.
  return (
    <span className={className} title={label}>
      {children}
    </span>
  )
}

/** A span, so it nests inside the `<label>` the modal editor wraps a field in. */
function Label({ children, className }: RtcLabelProps) {
  return <span className={className}>{children}</span>
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
  Drawer,
  Tooltip,
  Label,
  Badge,
  Skeleton,
  ProgressBar,
  Icon,
}
