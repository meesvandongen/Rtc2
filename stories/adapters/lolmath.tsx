import '@lolmath/ui/css'
import '@lolmath/ui/font/beaufort'
import '@lolmath/ui/font/spiegel'

import {
  Button,
  Checkbox,
  DialogButtons,
  DialogHeading,
  DialogTrigger,
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
  Modal,
  MultipleSelect,
  NumberField,
  Popover,
  ProgressBar,
  Radio,
  RadioGroup,
  SearchField,
  Select,
  SelectButton,
  SelectListBox,
  SelectListBoxItem,
  SelectPopover,
  SelectValue,
  Slider,
  SliderOutput,
  Switch,
  TagGroup,
  TagList,
  TextField,
} from '@lolmath/ui'

import type { CSSProperties, Key, ReactNode } from 'react'

import type { DataTableComponents, RtcMenuItem, RtcOption, RtcSize } from '../../src'
import './lolmath.css'

/**
 * `@lolmath/ui` adapter — https://github.com/lolmath/lolmath/tree/main/packages/ui
 *
 * The fourth API shape in the set, and the one that stresses parts of the
 * contract MUI, Radix and Mantine never touch:
 *
 * 1. **React Aria Components underneath.** Its `Button` deliberately drops
 *    `onClick` in favour of `onPress`, so the registry's mouse-event handlers
 *    cannot be forwarded straight through — see `clickable` below.
 * 2. **Compound *and* data-driven at once.** `Select` is assembled from six
 *    pieces, but its list is a collection built from an `items` array whose
 *    entries must carry an `id`. `RtcOption` keys on `value`, so options are
 *    re-keyed rather than handed over as-is.
 * 3. **Overlays own their trigger through context, not cloning.** RAC's
 *    `MenuTrigger`/`DialogTrigger` wire the trigger with a `PressResponder`
 *    context instead of injecting props onto it. That is the one delivery
 *    mechanism the "spread the rest" rule does *not* cover — and it still
 *    works, because the trigger this registry passes is a real RAC button
 *    somewhere in the subtree rather than a render prop.
 * 4. **One colour scheme, and it is not ours.** The library is dark-only and
 *    themed as League of Legends chrome, so rather than meet it halfway the
 *    adapter remaps every `--rtc-*` colour onto a `--lol-*` token — see
 *    `lolmathCssVars` below, which the story hands to the table and the
 *    adapter applies to every surface React Aria portals out of it.
 *
 * The library ships no icon set and, by an explicit decision in its source, no
 * tooltip — so those two keep the built-in implementations. Everything else is
 * a lolmath component.
 */

/**
 * The table's palette, mapped onto the library's tokens.
 *
 * Named tokens rather than the hex values behind them, for the reason the
 * Mantine adapter learned the hard way: pick colours by hand and some surface
 * ends up on a different scale from the one beside it.
 *
 * It lives here rather than in the story because it has to reach two places.
 * The table gets it through `cssVars`, which is an inline style on the root —
 * and React Aria portals its overlays to `document.body`, where an inline
 * style on the table cannot follow. Those surfaces carry `rtc-vars` so the
 * variables are *declared* out there, but declared at the stock defaults; the
 * same object is applied to each of them so a portalled filter editor is
 * painted in the same colours as the one docked in the panel.
 */
export const lolmathCssVars: Record<string, string> = {
  '--rtc-color-surface': 'var(--lol-color-hextech-black)',
  '--rtc-color-surface-sunken': 'var(--lol-color-grey-300)',
  '--rtc-color-surface-raised': 'var(--lol-color-grey-cool)',
  // Rows sit at grey-100 and come up to gold-100 under the pointer — the
  // library's `Table` treats row text as recessed until you reach for it.
  '--rtc-color-text': 'var(--lol-color-grey-100)',
  '--rtc-color-text-muted': 'var(--lol-color-grey-150)',
  // The hairline its `Table` separates the header from the body with. There is
  // no rule between rows at all, which `enableBorders: 'none'` takes care of.
  '--rtc-color-border': 'rgb(from var(--lol-color-grey-100) r g b / 0.25)',
  '--rtc-color-border-strong': 'var(--lol-color-gold-600)',
  '--rtc-color-accent': 'var(--lol-color-gold-400)',
  '--rtc-color-accent-hover': 'var(--lol-color-gold-200)',
  '--rtc-color-accent-contrast': 'var(--lol-color-hextech-black)',
  '--rtc-color-accent-subtle': 'rgb(200 155 60 / 14%)',
  '--rtc-color-danger': 'var(--lol-color-gold-400)',
  '--rtc-color-overlay': 'rgb(1 10 19 / 75%)',
  // Row states, copied from `table.module.css` rather than approximated: hover
  // is a gold wash that fades out to the right, and a selected row is a blue
  // sweep with a gold spine down its leading edge. Both are gradients, which
  // is why the table applies these through `background` and not a colour.
  '--rtc-row-bg-hover':
    'linear-gradient(90deg, rgb(from var(--lol-color-gold-100) r g b / 0.08), transparent)',
  '--rtc-row-bg-selected':
    'linear-gradient(90deg, var(--lol-color-gold-500) 0 0.25rem, transparent 0.25rem) no-repeat,' +
    'linear-gradient(90deg, rgb(from var(--lol-color-blue-400) r g b / 0.55), rgb(from var(--lol-color-blue-300) r g b / 0.1))',
  '--rtc-row-bg-selected-hover':
    'linear-gradient(90deg, var(--lol-color-gold-500) 0 0.25rem, transparent 0.25rem) no-repeat,' +
    'linear-gradient(90deg, rgb(from var(--lol-color-blue-400) r g b / 0.7), rgb(from var(--lol-color-blue-300) r g b / 0.2))',
  '--rtc-cell-bg-selected': 'rgb(from var(--lol-color-blue-400) r g b / 0.55)',
  // Spiegel for the body, Beaufort for the header — the split the library
  // itself makes between body text and display type.
  '--rtc-font-family': 'var(--lol-font-family-spiegel), sans-serif',
  '--rtc-font-size': 'var(--lol-font-size-sm)',
  '--rtc-line-height': 'var(--lol-line-height-sm)',
  '--rtc-header-font-size': '0.75rem',
  '--rtc-header-font-weight': '700',
  '--rtc-header-text-transform': 'uppercase',
  '--rtc-header-letter-spacing': '0.075em',
  '--rtc-header-color': 'var(--lol-color-gold-100)',
  // Its header carries no fill of its own, only the hairline underneath. The
  // table paints this *over* the surface rather than instead of it, so a sticky
  // header stays opaque with rows scrolling behind it.
  '--rtc-header-bg': 'transparent',
  '--rtc-footer-bg': 'transparent',
  // Nothing in the design system is rounded — every border is a straight gold
  // edge — so a rounded table would read as foreign.
  '--rtc-radius': '0px',
  '--rtc-radius-sm': '0px',
  '--rtc-radius-lg': '0px',
  // `0.375rem 0.75rem`, its own cell padding, and rows sized to match.
  '--rtc-cell-padding-x': '0.75rem',
  '--rtc-cell-padding-y-comfortable': '0.375rem',
  '--rtc-row-height-comfortable': '36px',
  '--rtc-scrollbar-thumb': 'var(--lol-color-gold-600)',
}

/**
 * What every portalled surface needs.
 *
 * `rtc-vars` is the library's documented opt-in for anything rendered outside
 * the table; `data-rtc-theme` is what makes the browser paint its own chrome —
 * scrollbars, form controls — dark out there too, since lolmath has no light
 * scheme to fall back on.
 */
const surface = {
  className: 'rtc-vars lol-popover',
  'data-rtc-theme': 'dark',
  style: lolmathCssVars as CSSProperties,
}

/** The registry's two sizes onto lolmath's three; the table runs compact. */
const toSize = (size: RtcSize | undefined) => (size === 'sm' ? 'small' : 'medium')

/** RAC collections key on `id`; `RtcOption` keys on `value`. */
const toItems = (options: RtcOption[]) => options.map((option) => ({ ...option, id: option.value }))

/**
 * `onClick`, which React Aria types away but still honours.
 *
 * Every RAC control omits `onClick` from its props and offers `onPress`
 * instead, and a wrapper that listens for the click itself does not work:
 * `usePress` calls `stopPropagation()` on the native click, so it never
 * reaches an ancestor. `onPress` is not a substitute either — it reports a
 * synthetic `PressEvent`, and the registry's handlers want the real thing.
 * The sort button reads `shiftKey` off the event to decide whether to add to
 * the sort rather than replace it, and the selection checkbox calls
 * `stopPropagation()` so the row underneath does not toggle a second time.
 *
 * `useButton` and `useToggle` both pass `onClick` straight into `usePress`,
 * which invokes it with the genuine React mouse event, for exactly this case.
 * So the prop is supported, just absent from the published types — hence the
 * spread, which says so once rather than at every call site.
 */
const clickable = (onClick: ((event: React.MouseEvent) => void) | undefined) => ({ onClick })

/**
 * The registry's flat item list as a RAC menu collection.
 *
 * RAC gets `role="menuitemcheckbox"` from a *selection mode*, not from a
 * per-item flag, and the mode lives on the menu or on a section. Every menu
 * the table builds keeps its checkbox items together — the column-visibility
 * list, the filter operator picker — so consecutive runs are collected into a
 * multi-selection `MenuSection`, which is also what keeps the menu open while
 * several columns are toggled.
 */
function toMenuNodes(items: RtcMenuItem[]): ReactNode[] {
  const nodes: ReactNode[] = []
  let run: Extract<RtcMenuItem, { type: 'checkbox' }>[] = []

  const flushCheckboxes = () => {
    if (run.length === 0) return
    const group = run
    run = []
    const selected = group.filter((item) => item.checked).map((item) => item.id)
    nodes.push(
      <MenuSection
        key={`section-${group[0]!.id}`}
        selectionMode="multiple"
        selectedKeys={selected}
        // RAC reports the whole selection; the table wants the one item that
        // moved, so the two sets are diffed back into a single `onSelect`.
        onSelectionChange={(keys) => {
          const next = keys === 'all' ? new Set(group.map((item) => item.id)) : keys
          const changed = group.find((item) => item.checked !== next.has(item.id))
          changed?.onSelect?.()
        }}
      >
        {group.map((item) => (
          <MenuItem key={item.id} id={item.id} isDisabled={item.disabled} textValue={String(item.label)}>
            {item.icon ? <span className="lol-menu-icon">{item.icon}</span> : null}
            <span>{item.label}</span>
          </MenuItem>
        ))}
      </MenuSection>,
    )
  }

  for (const item of items) {
    if (item.type === 'checkbox') {
      run.push(item)
      continue
    }
    flushCheckboxes()

    if (item.type === 'separator') {
      nodes.push(<MenuSeparator key={item.id} />)
    } else if (item.type === 'label') {
      nodes.push(<MenuHeader key={item.id}>{item.label}</MenuHeader>)
    } else if (item.type === 'custom') {
      // A RAC menu is a collection and cannot hold arbitrary markup, so custom
      // content is carried by an item that does nothing when activated.
      nodes.push(
        <MenuItem key={item.id} id={item.id} textValue={item.id}>
          {item.content}
        </MenuItem>,
      )
    } else {
      nodes.push(
        <MenuItem
          key={item.id}
          id={item.id}
          isDisabled={item.disabled}
          textValue={String(item.label)}
          data-danger={item.danger ? 'true' : undefined}
          data-active={item.active ? 'true' : undefined}
          onAction={() => item.onSelect?.()}
        >
          {item.icon ? <span className="lol-menu-icon">{item.icon}</span> : null}
          <span>{item.label}</span>
        </MenuItem>,
      )
    }
  }

  flushCheckboxes()
  return nodes
}

export function createLolmathComponents(defaults: DataTableComponents): DataTableComponents {
  return {
    ...defaults,

    // lolmath ships no icon set of its own, and its source says in as many
    // words that it has no tooltip on purpose. Both keep the built-ins.
    Icon: defaults.Icon,
    Tooltip: defaults.Tooltip,

    // `...rest` still matters even though RAC wires its triggers through
    // context: the table passes ids and `aria-*` of its own, and an overlay
    // that has to fall back to `aria-controls` gets it from here.
    Button: ({ children, onClick, disabled, variant = 'default', size, className, type, ...rest }) => (
      <Button
        className={className}
        // `text` is lolmath's de-emphasised button; `secondary` is its
        // default gold-bordered one.
        preset={variant === 'primary' ? 'primary' : variant === 'quiet' ? 'text' : 'secondary'}
        size={toSize(size)}
        type={type ?? 'button'}
        isDisabled={disabled}
        {...clickable(onClick)}
        {...rest}
      >
        {children}
      </Button>
    ),

    IconButton: ({ label, children, active, size, className, disabled, onClick, ...rest }) => (
      <Button
        className={className}
        aria-label={label}
        // `square` is the shape that gives the button `aspect-ratio: 1`, which
        // is what keeps an icon-only control from stretching to the width of
        // the text padding a normal button carries.
        shape="square"
        preset={active ? 'hextech' : 'text'}
        size={toSize(size)}
        isDisabled={disabled}
        {...clickable(onClick)}
        {...rest}
      >
        {children}
      </Button>
    ),

    TextInput: ({ value, onChange, label, placeholder, type = 'text', size, autoFocus, disabled, onBlur, onKeyDown, dataAttributes }) => {
      if (type === 'search') {
        // lolmath's `SearchField` is a real search affordance — magnifier,
        // clear button, Escape to clear — which is exactly what the registry's
        // `type="search"` asks for and the built-in input only approximates.
        return (
          <SearchField
            className="lol-search"
            aria-label={label}
            value={value}
            size={toSize(size)}
            isDisabled={disabled}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            inputProps={{ placeholder, autoFocus, ...dataAttributes }}
          />
        )
      }

      return (
        <TextField
          aria-label={label}
          value={value}
          size={toSize(size)}
          isDisabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          // `TextField` hard-codes `type="text"` on its input and spreads
          // `inputProps` after it, so date and time variants are set here.
          inputProps={{ type, placeholder, autoFocus, ...dataAttributes }}
        />
      )
    },

    NumberInput: ({ value, onChange, label, placeholder, min, max, size, disabled, autoFocus, onBlur, onKeyDown, dataAttributes }) => (
      <NumberField
        aria-label={label}
        // RAC spells "no number" as `NaN`; the registry spells it `undefined`.
        value={value ?? Number.NaN}
        minValue={min}
        maxValue={max}
        size={toSize(size)}
        isDisabled={disabled}
        onChange={(next) => onChange(Number.isNaN(next) ? undefined : next)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        groupProps={{ className: 'lol-number-field' }}
        inputProps={{ placeholder, autoFocus, ...dataAttributes }}
      />
    ),

    Select: ({ value, onChange, options, label, placeholder, size, disabled, dataAttributes }) => (
      <Select
        aria-label={label}
        value={value === '' ? null : value}
        isDisabled={disabled}
        placeholder={placeholder}
        onChange={(next) => onChange(next == null ? '' : String(next))}
        {...dataAttributes}
      >
        <SelectButton size={toSize(size)} className="lol-select-button">
          <SelectValue />
        </SelectButton>
        {/* Portalled to `document.body`, where `--rtc-*` is out of scope. */}
        <SelectPopover {...surface}>
          <SelectListBox items={toItems(options)}>
            {(option: RtcOption & { id: string }) => (
              <SelectListBoxItem id={option.id} isDisabled={option.disabled} textValue={option.label}>
                {option.label}
              </SelectListBoxItem>
            )}
          </SelectListBox>
        </SelectPopover>
      </Select>
    ),

    /**
     * `MultipleSelect` is the richest control in the set: the chosen values are
     * a removable tag list and the picker is a searchable, virtualized listbox.
     * It is a config-object component — items in, keys out — so the registry's
     * data-driven option contract maps onto it directly.
     */
    MultiSelect: ({ value, onChange, options, label, placeholder, size }) => (
      <MultipleSelect
        aria-label={label}
        className="lol-select-button"
        items={toItems(options)}
        value={value}
        size={toSize(size)}
        emptyTags={placeholder}
        selectId={(option) => option.id}
        selectLabel={(option) => option.label}
        onChange={(keys: Key[]) => onChange(keys.map(String))}
      />
    ),

    Checkbox: ({ checked, indeterminate, onChange, label, disabled, onClick }) => (
      <Checkbox
        aria-label={label}
        isSelected={checked}
        isIndeterminate={!checked && !!indeterminate}
        isDisabled={disabled}
        onChange={onChange}
        {...clickable(onClick)}
      />
    ),

    /**
     * RAC radios are meaningless on their own — the roving tab index, the
     * arrow-key navigation and the `name` all belong to the group. The
     * registry hands over one radio at a time, so each gets a group of one.
     */
    Radio: ({ checked, onChange, label, disabled, onClick, name }) => (
      <RadioGroup
        aria-label={label}
        name={name}
        value={checked ? 'on' : null}
        isDisabled={disabled}
        onChange={() => onChange(true)}
      >
        <Radio value="on" aria-label={label} {...clickable(onClick)} />
      </RadioGroup>
    ),

    Switch: ({ checked, onChange, label, disabled, onClick }) => (
      <Switch
        aria-label={label}
        isSelected={checked}
        isDisabled={disabled}
        onChange={onChange}
        {...clickable(onClick)}
      />
    ),

    // The thumbs are 1.75rem discs centred on the track ends, so half of one
    // hangs outside the control at either extreme. Without gutters of its own
    // the slider spills out of the filter field it sits in.
    RangeSlider: ({ value, onChange, min, max, step, label }) => (
      <div className="lol-slider">
        <Slider<number[]>
          aria-label={label}
          value={value}
          minValue={min}
          maxValue={max}
          step={step}
          onChange={(next) => onChange([next[0]!, next[1]!])}
        >
          <SliderOutput />
        </Slider>
      </div>
    ),

    /**
     * RAC delivers the trigger through a `PressResponder` context rather than
     * by cloning, so `trigger` is rendered as-is and the button somewhere
     * inside it picks the handlers up. The `Popover` positions against that
     * same button, which is why nothing has to be measured here.
     */
    Popover: ({ trigger, children, label, align = 'start', open, onOpenChange }) => (
      <DialogTrigger isOpen={open} onOpenChange={onOpenChange}>
        {trigger}
        <Popover
          {...surface}
          placement={align === 'end' ? 'bottom end' : align === 'center' ? 'bottom' : 'bottom start'}
          aria-label={label}
        >
          {children}
        </Popover>
      </DialogTrigger>
    ),

    Menu: ({ trigger, items, label, align = 'start' }) => (
      <MenuTrigger>
        {trigger}
        <MenuPopover {...surface} placement={align === 'end' ? 'bottom end' : 'bottom start'}>
          <Menu aria-label={label}>{toMenuNodes(items)}</Menu>
        </MenuPopover>
      </MenuTrigger>
    ),

    Dialog: ({ open, onClose, title, children, footer, label }) => (
      <Modal
        isOpen={open}
        isDismissable
        onOpenChange={(next) => {
          if (!next) onClose()
        }}
        className="rtc-vars lol-modal"
        modalOverlayClassName="rtc-vars"
        data-rtc-theme="dark"
        style={lolmathCssVars as CSSProperties}
        dialogProps={{ 'aria-label': label }}
      >
        <DialogHeading slot="title">{title}</DialogHeading>
        <div className="lol-modal-fields">{children}</div>
        {footer ? <DialogButtons>{footer}</DialogButtons> : null}
      </Modal>
    ),

    /**
     * A badge is one tag, and a lolmath `Tag` only exists inside a `TagGroup`
     * whose `TagList` builds it from a collection — removal included, since
     * the remove handler is a property of the group rather than of the tag.
     */
    Badge: ({ children, onRemove, removeLabel }) => (
      <TagGroup
        aria-label={removeLabel ?? 'Tag'}
        className="lol-tag-group"
        onRemove={onRemove ? () => onRemove() : undefined}
      >
        <TagList
          items={[{ id: 'badge', label: children }]}
          // Typed as returning a string because a tag's text is normally
          // plain; the table's badges carry a node, which renders fine.
          selectLabel={(item) => item.label as string}
          variant="gold"
        />
      </TagGroup>
    ),

    // lolmath has a `Spinner` but no skeleton, and a spinner per cell is not
    // the same affordance, so this is drawn from the library's own tokens.
    Skeleton: ({ width }) => (
      <span className="lol-skeleton" style={width ? { width } : undefined} aria-hidden="true" />
    ),

    // lolmath's `ProgressBar` shows a caption and a percentage next to the
    // track. The table's is a thin busy indicator with neither, so the caption
    // row is hidden in CSS and the track is animated for the indeterminate
    // case the library does not draw itself.
    ProgressBar: ({ label }) => (
      <div className="lol-progress">
        <ProgressBar aria-label={label} label={label} isIndeterminate />
      </div>
    ),
  }
}
