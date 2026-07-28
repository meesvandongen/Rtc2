import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export interface MenuProps {
  /** Renders the element that opens the menu. */
  trigger: (props: {
    ref: React.Ref<any>
    onClick: (event: React.MouseEvent) => void
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    'aria-controls': string | undefined
  }) => ReactNode
  children: (close: () => void) => ReactNode
  /** Preferred edge alignment relative to the trigger. */
  align?: 'start' | 'end'
  label?: string
}

/**
 * A portalled dropdown with roving focus, outside-click and Escape dismissal.
 *
 * Portalling matters here: menus are opened from `<th>` and toolbar buttons
 * inside a scroll container with `overflow: auto`, which would otherwise clip
 * them. Position is recomputed on scroll and resize while open.
 */
export function Menu({ trigger, children, align = 'start', label }: MenuProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const updatePosition = useCallback(() => {
    const anchor = triggerRef.current
    const menu = menuRef.current
    if (!anchor || !menu) return

    const rect = anchor.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const gutter = 8

    let top = rect.bottom + 4
    if (top + menuRect.height > window.innerHeight - gutter) {
      top = Math.max(gutter, rect.top - menuRect.height - 4)
    }

    let left = align === 'end' ? rect.right - menuRect.width : rect.left
    left = Math.min(left, window.innerWidth - menuRect.width - gutter)
    left = Math.max(gutter, left)

    setPosition({ top, left })
  }, [align])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }
    const onReflow = () => updatePosition()

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open, close, updatePosition])

  // Move focus into the menu so keyboard users land on the first action.
  useEffect(() => {
    if (!open || !position) return
    const first = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled]), input, select',
    )
    first?.focus()
  }, [open, position])

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])',
      ) ?? [],
    )
    if (items.length === 0) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const next = (current + delta + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation()
          setOpen((value) => !value)
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? id : undefined,
      })}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={id}
            ref={menuRef}
            className="rtc-menu"
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              // Avoid a one-frame flash at (0,0) before measurement lands.
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  )
}

export interface MenuItemProps {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  danger?: boolean
  role?: 'menuitem' | 'menuitemcheckbox'
  checked?: boolean
}

export function MenuItem({
  icon,
  children,
  onClick,
  disabled,
  active,
  danger,
  role = 'menuitem',
  checked,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role={role}
      className="rtc-menu-item"
      disabled={disabled}
      data-rtc-active={active ? 'true' : undefined}
      data-rtc-danger={danger ? 'true' : undefined}
      aria-checked={role === 'menuitemcheckbox' ? !!checked : undefined}
      onClick={onClick}
    >
      {icon ? <span className="rtc-menu-item-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}

export function MenuSeparator() {
  return <hr className="rtc-menu-separator" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="rtc-menu-label">{children}</div>
}
