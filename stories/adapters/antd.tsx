import {
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Input,
  InputNumber,
  Modal,
  Popover,
  Progress,
  Radio,
  Select,
  Skeleton,
  Slider,
  Switch,
  Tag,
  Tooltip,
  type MenuProps,
} from 'antd'
import dayjs from 'dayjs'

import type { DataTableComponents, RtcMenuItem } from '../../src'

/**
 * Ant Design adapter.
 *
 * This is the adapter that justifies the registry's data-driven contract.
 * Ant's `Dropdown` takes `menu={{ items }}` and `Select` takes `options` — a
 * children-based menu API could not be backed by it at all. Mapping
 * `RtcMenuItem[]` onto Ant's item shape is a direct translation, which is the
 * signal the contract is at the right level.
 *
 * Ant also renders a real date picker, so this adapter overrides `TextInput`
 * for `type="date"` — a nice demonstration that the seam allows richer
 * controls than the built-ins, not just restyled ones.
 */

function toAntItems(items: RtcMenuItem[]): NonNullable<MenuProps['items']> {
  return items.map((item) => {
    if (item.type === 'separator') return { type: 'divider', key: item.id }
    if (item.type === 'label') return { type: 'group', key: item.id, label: item.label }
    if (item.type === 'custom') return { key: item.id, label: item.content }
    const isCheckbox = item.type === 'checkbox'
    return {
      key: item.id,
      icon: item.icon,
      danger: !isCheckbox && item.danger,
      disabled: item.disabled,
      label: (
        <span
          // Ant renders menu items as `role="menuitem"`; announce the checked
          // state so the semantics match the other adapters.
          role={isCheckbox ? 'menuitemcheckbox' : undefined}
          aria-checked={isCheckbox ? item.checked : undefined}
          style={
            (isCheckbox ? item.checked : item.active)
              ? { color: 'var(--rtc-color-accent)', fontWeight: 600 }
              : undefined
          }
        >
          {item.label}
        </span>
      ),
      onClick: () => item.onSelect?.(),
    }
  })
}

export function createAntComponents(defaults: DataTableComponents): DataTableComponents {
  return {
    ...defaults,

    Button: ({ children, onClick, disabled, variant = 'default', size, className }) => (
      <Button
        className={className}
        size={size === 'sm' ? 'small' : 'middle'}
        type={variant === 'primary' ? 'primary' : variant === 'quiet' ? 'link' : 'default'}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    ),

    IconButton: ({ label, children, active, size, className, disabled, ...rest }) => (
      <Tooltip title={label}>
        <Button
          className={className}
          type={active ? 'primary' : 'text'}
          size={size === 'sm' ? 'small' : 'middle'}
          aria-label={label}
          disabled={disabled}
          icon={children}
          {...rest}
        />
      </Tooltip>
    ),

    TextInput: ({ value, onChange, label, placeholder, type, size, autoFocus, disabled, onBlur, onKeyDown, dataAttributes }) => {
      if (type === 'date' || type === 'datetime-local') {
        const withTime = type === 'datetime-local'
        return (
          <DatePicker
            value={value ? dayjs(value) : null}
            showTime={withTime ? { format: 'HH:mm' } : false}
            size={size === 'sm' ? 'small' : 'middle'}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={label}
            onChange={(date) =>
              onChange(date ? date.format(withTime ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD') : '')
            }
            style={{ width: '100%' }}
            {...dataAttributes}
          />
        )
      }
      return (
        <Input
          value={value}
          size={size === 'sm' ? 'small' : 'middle'}
          placeholder={placeholder}
          allowClear={type === 'search'}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          type={type === 'time' ? 'time' : undefined}
          {...dataAttributes}
        />
      )
    },

    NumberInput: ({ value, onChange, label, placeholder, min, max, size, ...rest }) => (
      <InputNumber
        value={value ?? null}
        min={min}
        max={max}
        size={size === 'sm' ? 'small' : 'middle'}
        placeholder={placeholder}
        aria-label={label}
        disabled={rest.disabled}
        autoFocus={rest.autoFocus}
        onChange={(next) => onChange(next ?? undefined)}
        onBlur={rest.onBlur}
        onKeyDown={rest.onKeyDown}
        style={{ width: '100%' }}
        {...rest.dataAttributes}
      />
    ),

    Select: ({ value, onChange, options, label, placeholder, size, disabled, dataAttributes }) => (
      <Select
        value={value === '' ? undefined : value}
        size={size === 'sm' ? 'small' : 'middle'}
        placeholder={placeholder}
        disabled={disabled}
        allowClear={placeholder !== undefined}
        aria-label={label}
        // Config-object API: options as data, exactly what the registry hands over.
        options={options}
        onChange={(next) => onChange(next ?? '')}
        style={{ width: '100%', minWidth: 120 }}
        {...dataAttributes}
      />
    ),

    MultiSelect: ({ value, onChange, options, label, placeholder, size }) => (
      <Select
        mode="multiple"
        value={value}
        size={size === 'sm' ? 'small' : 'middle'}
        placeholder={placeholder}
        aria-label={label}
        options={options}
        onChange={onChange}
        style={{ width: '100%', minWidth: 160 }}
      />
    ),

    Checkbox: ({ checked, indeterminate, onChange, label, disabled, onClick }) => (
      <Checkbox
        checked={checked}
        indeterminate={!checked && indeterminate}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
    ),

    Radio: ({ checked, onChange, label, disabled, onClick, name }) => (
      <Radio
        checked={checked}
        name={name}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
    ),

    Switch: ({ checked, onChange, label, disabled, onClick }) => (
      <span onClick={onClick} role="none">
        <Switch checked={checked} disabled={disabled} aria-label={label} onChange={onChange} size="small" />
      </span>
    ),

    RangeSlider: ({ value, onChange, min, max, step, label }) => (
      <Slider
        range
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(next) => onChange(next as [number, number])}
        style={{ margin: '4px 8px' }}
      />
    ),

    Popover: ({ trigger, children, label, align = 'start', open, onOpenChange }) => (
      <Popover
        content={<div aria-label={label}>{children}</div>}
        trigger="click"
        open={open}
        onOpenChange={onOpenChange}
        placement={align === 'end' ? 'bottomRight' : 'bottomLeft'}
        // Ant clones the child to attach its own handlers, so the rendered
        // trigger node passes through unchanged.
      >
        {trigger}
      </Popover>
    ),

    Menu: ({ trigger, items, label, align = 'start' }) => (
      <Dropdown
        menu={{ items: toAntItems(items), 'aria-label': label } as MenuProps}
        trigger={['click']}
        placement={align === 'end' ? 'bottomRight' : 'bottomLeft'}
      >
        {trigger}
      </Dropdown>
    ),

    Dialog: ({ open, onClose, title, children, footer, label }) => (
      <Modal open={open} onCancel={onClose} title={title} aria-label={label} footer={footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </Modal>
    ),

    Tooltip: ({ label, children }) => (
      <Tooltip title={label}>
        <span>{children}</span>
      </Tooltip>
    ),

    Badge: ({ children, onRemove, removeLabel }) => (
      <Tag
        closable={!!onRemove}
        onClose={onRemove}
        closeIcon={onRemove ? <span aria-label={removeLabel}>×</span> : undefined}
      >
        {children}
      </Tag>
    ),

    Skeleton: ({ width }) => (
      <Skeleton.Input active size="small" style={{ width: width ?? '80%', height: 14 }} />
    ),

    ProgressBar: ({ label }) => (
      <Progress percent={100} status="active" showInfo={false} aria-label={label} size="small" />
    ),
  }
}
