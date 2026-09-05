import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react'

/**
 * The component contract.
 *
 * Everything interactive the table renders goes through this registry, so a
 * host application can supply its own design system instead of the built-in
 * primitives. Three constraints shaped the prop shapes below, learned from
 * making MUI, Radix and Mantine all satisfy them:
 *
 * 1. **Overlays take a rendered `trigger` node, not a render prop.** Radix
 *    needs a real element to clone with `asChild`, MUI needs one to anchor to,
 *    and Mantine's `Popover.Target` clones its child. A render prop would suit
 *    none of them.
 * 2. **Lists are data, not children.** Mantine's `Select`/`MultiSelect` take a
 *    `data` array and cannot accept arbitrary children; MUI and Radix can map
 *    an array to children trivially. Data is the portable form.
 * 3. **Overlays own their open state by default.** Each library manages focus,
 *    dismissal and portalling differently; forcing our own state on them
 *    fights their internals. `open`/`onOpenChange` exist for the cases where
 *    the table genuinely needs control.
 *
 * Structural markup (`table`, `tr`, `th`, `td`) is deliberately *not* in the
 * registry: column pinning, resizing and virtualization all depend on the
 * exact DOM and data attributes the table emits, so those stay ours and are
 * themed with CSS variables instead.
 */

export type RtcSize = 'sm' | 'md'

export interface RtcOption {
  label: string
  value: string
  disabled?: boolean
}

/**
 * Props an overlay library injects onto a trigger it did not render.
 *
 * **The contract's one hard rule: `Button` and `IconButton` must spread every
 * prop they do not recognise onto the underlying element, and accept a `ref`.**
 *
 * Buttons are the trigger for menus and popovers, and each library delivers a
 * trigger differently: Radix merges props through `asChild`, MUI clones to
 * attach an `anchorEl`, Mantine clones to attach a reference ref and its own
 * handlers. An adapter that destructures only the props below and drops the
 * rest silently produces a button that looks right and opens nothing — or an
 * overlay that measures against nothing and lands in the corner of the
 * viewport.
 *
 * `e2e/overlays.spec.ts` opens every overlay in every adapter for exactly this
 * reason; it is the only thing that actually enforces the rule.
 */
export interface RtcTriggerSlotProps {
  /** Deliberately `any`: the underlying element differs per adapter. */
  ref?: React.Ref<any>
  id?: string
  onPointerDown?: (event: React.PointerEvent) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  onFocus?: (event: React.FocusEvent) => void
  onBlur?: (event: React.FocusEvent) => void
  'aria-haspopup'?: 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid' | boolean
  'aria-expanded'?: boolean
  'aria-controls'?: string
  /** Overlay libraries tag their triggers; the tag has to reach the DOM. */
  [key: `data-${string}`]: string | number | boolean | undefined
}

export interface RtcButtonProps extends RtcTriggerSlotProps {
  children: ReactNode
  onClick?: (event: React.MouseEvent) => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'quiet'
  size?: RtcSize
  type?: 'button' | 'submit'
  className?: string
}

export interface RtcIconButtonProps extends RtcTriggerSlotProps {
  /** Required: these controls are icon-only, so the name comes from here. */
  label: string
  children: ReactNode
  onClick?: (event: React.MouseEvent) => void
  disabled?: boolean
  /** Rendered in a pressed/selected state. */
  active?: boolean
  size?: RtcSize
  className?: string
}

export interface RtcTextInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  /** `search` renders a clearable search affordance where the library has one. */
  type?: 'text' | 'search' | 'number' | 'date' | 'datetime-local' | 'time'
  size?: RtcSize
  autoFocus?: boolean
  disabled?: boolean
  onBlur?: () => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  /** Forwarded so tests and the table can target specific inputs. */
  dataAttributes?: Record<string, string>
}

export interface RtcNumberInputProps extends Omit<RtcTextInputProps, 'value' | 'onChange' | 'type'> {
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
}

export interface RtcSelectProps {
  value: string
  onChange: (value: string) => void
  options: RtcOption[]
  label: string
  placeholder?: string
  size?: RtcSize
  disabled?: boolean
  dataAttributes?: Record<string, string>
}

export interface RtcMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  options: RtcOption[]
  label: string
  placeholder?: string
  size?: RtcSize
}

export interface RtcCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  /** Stop row-level click handlers from double-toggling. */
  onClick?: (event: React.MouseEvent) => void
}

export interface RtcRadioProps extends Omit<RtcCheckboxProps, 'indeterminate'> {
  name?: string
}

export type RtcSwitchProps = Omit<RtcCheckboxProps, 'indeterminate'>

export interface RtcRangeSliderProps {
  value: [number, number]
  onChange: (value: [number, number]) => void
  min: number
  max: number
  step?: number
  label: string
  /**
   * Accessible names for the two thumbs.
   *
   * Two thumbs need two names, and an adapter cannot build them: deriving
   * `${label} minimum` in the adapter is how the built-in and Radix sliders
   * ended up announcing English inside an otherwise translated table. Both are
   * localized upstream and passed in; an adapter whose slider has a single
   * label may ignore them and use `label`.
   */
  minLabel?: string
  maxLabel?: string
}

export interface RtcPopoverProps {
  /** A single rendered element. Adapters clone it or wrap it as their trigger. */
  trigger: ReactNode
  children: ReactNode
  label?: string
  align?: 'start' | 'center' | 'end'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type RtcMenuItem =
  | {
      type?: 'item'
      id: string
      label: ReactNode
      icon?: ReactNode
      onSelect?: () => void
      disabled?: boolean
      danger?: boolean
      active?: boolean
    }
  | {
      type: 'checkbox'
      id: string
      label: ReactNode
      icon?: ReactNode
      checked: boolean
      onSelect?: () => void
      disabled?: boolean
    }
  | { type: 'separator'; id: string }
  | { type: 'label'; id: string; label: ReactNode }
  /** Arbitrary content, e.g. an embedded editor. Not all libraries style it. */
  | { type: 'custom'; id: string; content: ReactNode }

export interface RtcMenuProps {
  trigger: ReactNode
  items: RtcMenuItem[]
  label?: string
  align?: 'start' | 'end'
}

export interface RtcDialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  label?: string
}

/**
 * A sheet that slides in from an edge of the viewport — shadcn's drawer, MUI's
 * `Drawer`, Mantine's `Drawer`, or the built-in native `<dialog>`.
 *
 * Deliberately close in shape to `RtcDialogProps` so an adapter that already
 * has a modal can satisfy both with the same component; `side` is the only
 * addition, and an adapter that only has a centred dialog may ignore it.
 *
 * Unlike `Dialog`, this one may be rendered while closed — the built-in keeps
 * the `<dialog>` mounted so the sheet can animate out. Implementations are
 * free to render `children` lazily.
 */
export interface RtcDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Action row pinned below the scrolling content. */
  footer?: ReactNode
  label?: string
  /** Accessible name for the close control. */
  closeLabel?: string
  /** Edge the sheet is anchored to. Defaults to `bottom`. */
  side?: 'bottom' | 'start' | 'end'
}

export interface RtcTooltipProps {
  label: string
  children: ReactNode
}

/**
 * The text of a field's label.
 *
 * Presentational only: the table owns the *association* — in the modal editor
 * the field is a `<label>` wrapping its control, and every registry control
 * takes an `aria-label` of its own — so this slot supplies typography and
 * nothing else. An adapter whose library labels with a `<label>` element should
 * render it as a span (React Aria's `Label` takes an `elementType` for exactly
 * this); nesting one inside the table's own `<label>` is invalid and breaks the
 * association the table already made.
 */
export interface RtcLabelProps {
  children: ReactNode
  /** A structural hook; see the class-name rules in the README. */
  className?: string
}

export interface RtcBadgeProps {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
}

export interface RtcSkeletonProps {
  width?: string
}

export interface RtcProgressBarProps {
  label: string
}

/** Icons the table asks for by name, so an adapter can swap in its own set. */
export type RtcIconName =
  | 'sortAsc'
  | 'sortDesc'
  | 'sortNone'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronsLeft'
  | 'chevronsRight'
  | 'search'
  | 'close'
  | 'filter'
  | 'columns'
  | 'density'
  | 'transpose'
  | 'fullScreen'
  | 'exitFullScreen'
  | 'more'
  | 'eye'
  | 'eyeOff'
  | 'pin'
  | 'pinOff'
  | 'group'
  | 'drag'
  | 'edit'
  | 'save'
  | 'alert'
  | 'reset'

export interface RtcIconProps {
  name: RtcIconName
  className?: string
}

export interface DataTableComponents {
  Button: ComponentType<RtcButtonProps>
  IconButton: ComponentType<RtcIconButtonProps>
  TextInput: ComponentType<RtcTextInputProps>
  NumberInput: ComponentType<RtcNumberInputProps>
  Select: ComponentType<RtcSelectProps>
  MultiSelect: ComponentType<RtcMultiSelectProps>
  Checkbox: ComponentType<RtcCheckboxProps>
  Radio: ComponentType<RtcRadioProps>
  Switch: ComponentType<RtcSwitchProps>
  RangeSlider: ComponentType<RtcRangeSliderProps>
  Popover: ComponentType<RtcPopoverProps>
  Menu: ComponentType<RtcMenuProps>
  Dialog: ComponentType<RtcDialogProps>
  Drawer: ComponentType<RtcDrawerProps>
  Tooltip: ComponentType<RtcTooltipProps>
  Label: ComponentType<RtcLabelProps>
  Badge: ComponentType<RtcBadgeProps>
  Skeleton: ComponentType<RtcSkeletonProps>
  ProgressBar: ComponentType<RtcProgressBarProps>
  Icon: ComponentType<RtcIconProps>
}

/** A partial override; anything omitted falls back to the built-in component. */
export type DataTableComponentsOverride = Partial<DataTableComponents>

const ComponentsContext = createContext<DataTableComponents | null>(null)

/**
 * Reads the active component set.
 *
 * Throws rather than silently falling back: a missing provider means the
 * defaults were never installed, and a half-rendered table is harder to
 * diagnose than an explicit error.
 */
export function useComponents(): DataTableComponents {
  const components = useContext(ComponentsContext)
  if (!components) {
    throw new Error(
      '[@mvd/table] No component registry found. Render inside <DataTable /> or wrap your tree in <DataTableComponentsProvider>.',
    )
  }
  return components
}

export interface DataTableComponentsProviderProps {
  components?: DataTableComponentsOverride
  /** The set to fall back to. `<DataTable />` passes the built-in defaults. */
  base: DataTableComponents
  children: ReactNode
}

export function DataTableComponentsProvider({
  components,
  base,
  children,
}: DataTableComponentsProviderProps) {
  const merged = useMemo<DataTableComponents>(
    () => (components ? { ...base, ...components } : base),
    [base, components],
  )
  return <ComponentsContext.Provider value={merged}>{children}</ComponentsContext.Provider>
}
