import * as Checkbox from '@radix-ui/react-checkbox'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import * as Slider from '@radix-ui/react-slider'
import * as Switch from '@radix-ui/react-switch'

import type { DataTableComponents } from '../../src'
import './radix.css'

/**
 * Radix adapter, in a shadcn/ui-like flavour.
 *
 * Every portalled surface carries `rtc-vars`. Radix renders overlays into
 * `document.body`, outside the table, and `radix.css` is written against the
 * table's `--rtc-*` variables — which are declared on the table. Without the
 * class those lookups resolve to nothing and a menu renders with no
 * background at all.
 *
 * The constraint this one exercises is `asChild`: Radix wants the trigger to
 * be a real element it can merge props and a ref onto. Because the registry
 * passes a rendered node, `<Popover.Trigger asChild>{trigger}</Popover.Trigger>`
 * just works — but only if the element forwards its ref, which is why the
 * built-in Button and IconButton use `forwardRef`.
 *
 * Radix is unstyled by design, so the visual layer is `radix.css`, written
 * against the same `--rtc-*` variables as the table itself.
 */
export function createRadixComponents(defaults: DataTableComponents): DataTableComponents {
  const Icon = defaults.Icon

  return {
    ...defaults,
    Icon,

    // `...rest` is not optional decoration: Radix's `asChild` merges its ref
    // and handlers in through these props, and dropping them leaves a button
    // that opens nothing.
    Button: ({ children, onClick, disabled, variant = 'default', size, className, ...rest }) => (
      <button
        type="button"
        className={['rx-button', className].filter(Boolean).join(' ')}
        data-variant={variant}
        data-size={size}
        disabled={disabled}
        onClick={onClick}
        {...rest}
      >
        {children}
      </button>
    ),

    IconButton: ({ label, children, active, size, className, disabled, onClick, ...rest }) => (
      <button
        type="button"
        className={['rx-icon-button', className].filter(Boolean).join(' ')}
        aria-label={label}
        title={label}
        data-active={active ? 'true' : undefined}
        data-size={size}
        disabled={disabled}
        onClick={onClick}
        {...rest}
      >
        {children}
      </button>
    ),

    /**
     * Radix ships no text input or native-select primitive — shadcn styles
     * plain elements for those. Falling through to the built-ins instead would
     * leave the filter panel half shadcn and half ours, which is the single
     * most visible way an adapter can look broken.
     */
    TextInput: ({ value, onChange, label, placeholder, type = 'text', size, autoFocus, disabled, onBlur, onKeyDown, dataAttributes }) => (
      <input
        className="rx-input"
        type={type}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        data-size={size}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        {...dataAttributes}
      />
    ),

    NumberInput: ({ value, onChange, label, placeholder, min, max, size, disabled, autoFocus, onBlur, onKeyDown, dataAttributes }) => (
      <input
        className="rx-input"
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        aria-label={label}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        data-size={size}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
        }
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        {...dataAttributes}
      />
    ),

    Select: ({ value, onChange, options, label, placeholder, size, disabled, dataAttributes }) => (
      <select
        className="rx-select"
        value={value}
        aria-label={label}
        title={label}
        disabled={disabled}
        data-size={size}
        onChange={(event) => onChange(event.target.value)}
        {...dataAttributes}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    ),

    MultiSelect: ({ value, onChange, options, label, size }) => (
      <select
        className="rx-select"
        multiple
        value={value}
        aria-label={label}
        data-size={size}
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
    ),

    Checkbox: ({ checked, indeterminate, onChange, label, disabled, onClick }) => (
      <Checkbox.Root
        className="rx-checkbox"
        checked={!checked && indeterminate ? 'indeterminate' : checked}
        disabled={disabled}
        aria-label={label}
        onCheckedChange={(next) => onChange(next === true)}
        onClick={onClick}
      >
        <Checkbox.Indicator className="rx-checkbox-indicator">
          {!checked && indeterminate ? '–' : '✓'}
        </Checkbox.Indicator>
      </Checkbox.Root>
    ),

    Switch: ({ checked, onChange, label, disabled, onClick }) => (
      <Switch.Root
        className="rx-switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onCheckedChange={onChange}
        onClick={onClick}
      >
        <Switch.Thumb className="rx-switch-thumb" />
      </Switch.Root>
    ),

    RangeSlider: ({ value, onChange, min, max, step, label }) => (
      <Slider.Root
        className="rx-slider"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        minStepsBetweenThumbs={0}
        onValueChange={(next) => onChange([next[0]!, next[1]!])}
      >
        <Slider.Track className="rx-slider-track">
          <Slider.Range className="rx-slider-range" />
        </Slider.Track>
        <Slider.Thumb className="rx-slider-thumb" aria-label={`${label} minimum`} />
        <Slider.Thumb className="rx-slider-thumb" aria-label={`${label} maximum`} />
      </Slider.Root>
    ),

    Popover: ({ trigger, children, label, align = 'start', open, onOpenChange }) => (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        {/* asChild merges Radix's props and ref onto our own element. */}
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="rtc-vars rx-surface rx-popover"
            align={align}
            sideOffset={4}
            aria-label={label}
          >
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    ),

    Menu: ({ trigger, items, label, align = 'start' }) => (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="rtc-vars rx-surface rx-menu"
            align={align}
            sideOffset={4}
            aria-label={label}
          >
            {items.map((item) => {
              if (item.type === 'separator') {
                return <DropdownMenu.Separator key={item.id} className="rx-menu-separator" />
              }
              if (item.type === 'label') {
                return (
                  <DropdownMenu.Label key={item.id} className="rx-menu-label">
                    {item.label}
                  </DropdownMenu.Label>
                )
              }
              if (item.type === 'custom') {
                return (
                  <div key={item.id} className="rx-menu-custom">
                    {item.content}
                  </div>
                )
              }
              if (item.type === 'checkbox') {
                return (
                  <DropdownMenu.CheckboxItem
                    key={item.id}
                    className="rx-menu-item"
                    checked={item.checked}
                    disabled={item.disabled}
                    // Radix closes on select by default; keep the menu open so
                    // several columns can be toggled in one pass.
                    onSelect={(event) => {
                      event.preventDefault()
                      item.onSelect?.()
                    }}
                  >
                    {item.icon ? <span className="rx-menu-icon">{item.icon}</span> : null}
                    {item.label}
                  </DropdownMenu.CheckboxItem>
                )
              }
              return (
                <DropdownMenu.Item
                  key={item.id}
                  className="rx-menu-item"
                  disabled={item.disabled}
                  data-danger={item.danger ? 'true' : undefined}
                  data-active={item.active ? 'true' : undefined}
                  onSelect={() => item.onSelect?.()}
                >
                  {item.icon ? <span className="rx-menu-icon">{item.icon}</span> : null}
                  {item.label}
                </DropdownMenu.Item>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    ),

    Dialog: ({ open, onClose, title, children, footer, label }) => (
      <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="rtc-vars rx-overlay" />
          <Dialog.Content className="rtc-vars rx-surface rx-dialog" aria-label={label}>
            <Dialog.Title className="rx-dialog-title">{title}</Dialog.Title>
            <div className="rx-dialog-body">{children}</div>
            <div className="rx-dialog-footer">{footer}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  }
}
