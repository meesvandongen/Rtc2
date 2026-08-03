import '@mantine/core/styles.layer.css'
import '@mantine/dates/styles.layer.css'

import {
  ActionIcon,
  Button,
  Checkbox,
  Drawer as MantineDrawer,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Pill,
  Popover,
  Progress,
  Radio,
  RangeSlider,
  Select,
  Skeleton,
  Switch,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { DateInput, DateTimePicker } from '@mantine/dates'
import dayjs from 'dayjs'

import type { ReactNode } from 'react'

import type { DataTableComponents, RtcMenuItem, RtcSize } from '../../src'

/**
 * Mantine adapter.
 *
 * This is the adapter that justifies the data-driven parts of the contract.
 * Mantine's `Select` and `MultiSelect` take a `data` array and render a
 * combobox rather than a native `<select>` — a children-based option API could
 * not be backed by them at all. Mapping `RtcOption[]` onto Mantine's item shape
 * is a direct translation, which is the signal the contract is at the right
 * level.
 *
 * Mantine also ships real date and date-time pickers, so this adapter overrides
 * `TextInput` for `type="date"` and `type="datetime-local"` — a demonstration
 * that the seam allows richer controls than the built-ins, not just restyled
 * ones.
 *
 * The stylesheets are imported in their `@layer mantine` form. Mantine's reset
 * is global, and the table's own rules are unlayered: keeping Mantine in a
 * layer means an adapted table is styled by Mantine while the surrounding
 * stories — which share this bundle — keep the appearance they had before the
 * adapter existed.
 */

/** The registry's two sizes onto Mantine's scale; the table runs compact. */
const toSize = (size: RtcSize | undefined) => (size === 'sm' ? 'xs' : 'sm')

function toMenuItems(items: RtcMenuItem[]): ReactNode {
  return items.map((item) => {
    if (item.type === 'separator') return <Menu.Divider key={item.id} />
    if (item.type === 'label') return <Menu.Label key={item.id}>{item.label}</Menu.Label>
    if (item.type === 'custom') {
      return (
        <div key={item.id} style={{ padding: 8 }}>
          {item.content}
        </div>
      )
    }
    if (item.type === 'checkbox') {
      // `Menu.CheckboxItem` renders `role="menuitemcheckbox"` with `aria-checked`
      // and, unlike `Menu.Item`, leaves the menu open when toggled — which is
      // what a column-visibility list wants.
      return (
        <Menu.CheckboxItem
          key={item.id}
          checked={item.checked}
          disabled={item.disabled}
          onChange={() => item.onSelect?.()}
        >
          {item.label}
        </Menu.CheckboxItem>
      )
    }
    return (
      <Menu.Item
        key={item.id}
        leftSection={item.icon}
        disabled={item.disabled}
        color={item.danger ? 'red' : undefined}
        fw={item.active ? 600 : undefined}
        onClick={() => item.onSelect?.()}
      >
        {item.label}
      </Menu.Item>
    )
  })
}

export function createMantineComponents(defaults: DataTableComponents): DataTableComponents {
  return {
    // Mantine ships no icon set of its own — `@tabler/icons-react` is a
    // separate dependency — so keep the built-in glyphs.
    Icon: defaults.Icon,

    // `...rest` carries the ref and the handlers `Popover.Target` clones onto
    // its child. Without it the overlay has nothing to anchor to and the button
    // opens nothing.
    Button: ({ children, onClick, disabled, variant = 'default', size, className, type, ...rest }) => (
      <Button
        className={className}
        size={toSize(size)}
        // `subtle` is Mantine's de-emphasised button. Not `transparent`: that
        // drops the hover affordance the filter operator picker relies on.
        variant={variant === 'primary' ? 'filled' : variant === 'quiet' ? 'subtle' : 'default'}
        type={type ?? 'button'}
        disabled={disabled}
        onClick={onClick}
        {...rest}
      >
        {children}
      </Button>
    ),

    IconButton: ({ label, children, active, size, className, disabled, ...rest }) => (
      <Tooltip label={label} withinPortal>
        <ActionIcon
          className={className}
          variant={active ? 'filled' : 'subtle'}
          color={active ? undefined : 'gray'}
          size={size === 'sm' ? 'md' : 'lg'}
          aria-label={label}
          disabled={disabled}
          {...rest}
        >
          {children}
        </ActionIcon>
      </Tooltip>
    ),

    TextInput: ({ value, onChange, label, placeholder, type, size, autoFocus, disabled, onBlur, onKeyDown, dataAttributes }) => {
      if (type === 'date') {
        return (
          <DateInput
            value={value || null}
            valueFormat="YYYY-MM-DD"
            size={toSize(size)}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={label}
            popoverProps={{ withinPortal: true, classNames: { dropdown: 'rtc-vars' } }}
            onChange={(next) => onChange(next ?? '')}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            {...dataAttributes}
          />
        )
      }

      if (type === 'datetime-local') {
        // Mantine's date strings are `YYYY-MM-DD HH:mm:ss`; the table speaks
        // the `datetime-local` wire format, so the two are translated here
        // rather than leaking a picker's format into the filter values.
        return (
          <DateTimePicker
            value={value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : null}
            size={toSize(size)}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={label}
            popoverProps={{ withinPortal: true, classNames: { dropdown: 'rtc-vars' } }}
            onChange={(next) => onChange(next ? dayjs(next).format('YYYY-MM-DDTHH:mm') : '')}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            {...dataAttributes}
          />
        )
      }

      return (
        <TextInput
          value={value}
          type={type}
          size={toSize(size)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          {...dataAttributes}
        />
      )
    },

    NumberInput: ({ value, onChange, label, placeholder, min, max, size, ...rest }) => (
      <NumberInput
        value={value ?? ''}
        min={min}
        max={max}
        size={toSize(size)}
        placeholder={placeholder}
        aria-label={label}
        disabled={rest.disabled}
        autoFocus={rest.autoFocus}
        onChange={(next) => onChange(next === '' ? undefined : Number(next))}
        onBlur={rest.onBlur}
        onKeyDown={rest.onKeyDown}
        {...rest.dataAttributes}
      />
    ),

    Select: ({ value, onChange, options, label, placeholder, size, disabled, dataAttributes }) => (
      <Select
        // Config-object API: options as data, exactly what the registry hands
        // over. `RtcOption` and Mantine's `ComboboxItem` are the same shape.
        data={options}
        value={value === '' ? null : value}
        size={toSize(size)}
        placeholder={placeholder}
        disabled={disabled}
        clearable={placeholder !== undefined}
        allowDeselect={false}
        aria-label={label}
        comboboxProps={{ withinPortal: true, classNames: { dropdown: 'rtc-vars' } }}
        onChange={(next) => onChange(next ?? '')}
        {...dataAttributes}
      />
    ),

    MultiSelect: ({ value, onChange, options, label, placeholder, size }) => (
      <MultiSelect
        data={options}
        value={value}
        size={toSize(size)}
        placeholder={value.length > 0 ? undefined : placeholder}
        aria-label={label}
        comboboxProps={{ withinPortal: true, classNames: { dropdown: 'rtc-vars' } }}
        onChange={onChange}
      />
    ),

    Checkbox: ({ checked, indeterminate, onChange, label, disabled, onClick }) => (
      <Checkbox
        checked={checked}
        indeterminate={!checked && indeterminate}
        disabled={disabled}
        size="xs"
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.checked)}
        onClick={onClick}
      />
    ),

    Radio: ({ checked, onChange, label, disabled, onClick, name }) => (
      <Radio
        checked={checked}
        name={name}
        disabled={disabled}
        size="xs"
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.checked)}
        onClick={onClick}
      />
    ),

    Switch: ({ checked, onChange, label, disabled, onClick }) => (
      <Switch
        checked={checked}
        disabled={disabled}
        size="sm"
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.checked)}
        onClick={onClick}
      />
    ),

    // A slider's thumb overhangs the track by half its width at either end, so
    // the control needs gutters of its own or it spills out of the filter
    // field. `minRange` defaults to 10 in Mantine, which would silently refuse
    // to let the two handles meet on a short numeric column.
    RangeSlider: ({ value, onChange, min, max, step, label }) => (
      <div style={{ width: '100%', paddingInline: 10, boxSizing: 'border-box' }}>
        <RangeSlider
          value={value}
          min={min}
          max={max}
          step={step}
          minRange={0}
          size="sm"
          thumbLabel={label}
          onChange={onChange}
        />
      </div>
    ),

    /**
     * Mantine closes its dropdown on Escape from a capture handler on the
     * dropdown itself, so the key only reaches it once focus is inside.
     * `trapFocus` is what puts it there — without it the popover is a keyboard
     * trap, open with no way out but the mouse.
     */
    Popover: ({ trigger, children, label, align = 'start', open, onOpenChange }) => (
      <Popover
        position={align === 'end' ? 'bottom-end' : 'bottom-start'}
        opened={open}
        onChange={onOpenChange}
        trapFocus
        returnFocus
        withinPortal
        // Portalled to `document.body`, where `--rtc-*` is not in scope.
        classNames={{ dropdown: 'rtc-vars' }}
        shadow="md"
      >
        <Popover.Target>{trigger}</Popover.Target>
        <Popover.Dropdown aria-label={label}>{children}</Popover.Dropdown>
      </Popover>
    ),

    Menu: ({ trigger, items, label, align = 'start' }) => (
      <Menu
        position={align === 'end' ? 'bottom-end' : 'bottom-start'}
        withinPortal
        // Icons travel into the dropdown as menu-item content; outside the
        // table `--rtc-icon-size` is undefined and they render at their
        // intrinsic size.
        classNames={{ dropdown: 'rtc-vars' }}
        shadow="md"
      >
        <Menu.Target>{trigger}</Menu.Target>
        <Menu.Dropdown aria-label={label}>{toMenuItems(items)}</Menu.Dropdown>
      </Menu>
    ),

    Dialog: ({ open, onClose, title, children, footer, label }) => (
      <Modal
        opened={open}
        onClose={onClose}
        title={title}
        aria-label={label}
        centered
        classNames={{ content: 'rtc-vars' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
        {footer ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            {footer}
          </div>
        ) : null}
      </Modal>
    ),

    Drawer: ({ open, onClose, title, children, footer, label, closeLabel, side = 'bottom' }) => (
      <MantineDrawer
        opened={open}
        onClose={onClose}
        position={side === 'bottom' ? 'bottom' : side === 'start' ? 'left' : 'right'}
        title={title}
        aria-label={label}
        closeButtonProps={{ 'aria-label': closeLabel }}
        size={side === 'bottom' ? '88%' : 'min(360px, 90vw)'}
        // Mantine portals its overlay outside the table, where the `--rtc-*`
        // lookups the filter panel is styled with resolve to nothing.
        classNames={{ content: 'rtc-vars' }}
        styles={{
          content: { display: 'flex', flexDirection: 'column' },
          body: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 0 },
        }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>{children}</div>
        {footer ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              padding: 12,
              borderTop: '1px solid var(--mantine-color-default-border)',
            }}
          >
            {footer}
          </div>
        ) : null}
      </MantineDrawer>
    ),

    Tooltip: ({ label, children }) => (
      <Tooltip label={label} withinPortal>
        <span>{children}</span>
      </Tooltip>
    ),

    Badge: ({ children, onRemove, removeLabel }) => (
      <Pill
        withRemoveButton={!!onRemove}
        onRemove={onRemove}
        // Mantine's remove button is an icon with no accessible name.
        removeButtonProps={{ 'aria-label': removeLabel }}
      >
        {children}
      </Pill>
    ),

    Skeleton: ({ width }) => <Skeleton height={14} width={width ?? '80%'} radius="sm" />,

    ProgressBar: ({ label }) => (
      <Progress value={100} animated size="sm" aria-label={label} />
    ),
  }
}
