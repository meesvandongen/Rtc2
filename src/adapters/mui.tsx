import {
  Button as MuiButton,
  Checkbox as MuiCheckbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer as MuiDrawer,
  IconButton as MuiIconButton,
  LinearProgress,
  Menu as MuiMenu,
  MenuItem as MuiMenuItem,
  Divider,
  FormLabel,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Popover as MuiPopover,
  Radio as MuiRadio,
  Select as MuiSelect,
  Skeleton as MuiSkeleton,
  Slider,
  Switch as MuiSwitch,
  TextField,
  Tooltip as MuiTooltip,
} from '@mui/material'
import { cloneElement, isValidElement, useState, type ReactElement } from 'react'

import type { DataTableComponents } from '../index'

/**
 * Material UI adapter — `@mvd/table/mui`.
 *
 * `@mui/material` is a peer dependency of this entry point only (see
 * `package.json`); the root `@mvd/table` import never pulls it in. Bring your
 * own `ThemeProvider` — this module renders MUI components but does not
 * provide one.
 *
 * The interesting constraint is the overlay trigger: MUI positions menus and
 * popovers against an `anchorEl`, so the adapter has to `cloneElement` the
 * trigger to attach a ref and an onClick. That is exactly why the registry
 * hands over a *rendered element* rather than a render prop — a render prop
 * would give MUI nothing to anchor to.
 */

/**
 * MUI's `medium` text field is a 56px form-page control — a third taller than
 * a table row at the default density, and it set the height of the whole top
 * toolbar. `small` is MUI's own dense size and the register a data grid reads
 * in, so every input the table asks for gets it; the registry's `sm` has
 * nowhere smaller to go, MUI offering only the two.
 */
const INPUT_SIZE = 'small' as const

function useAnchor() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return {
    anchor,
    open: Boolean(anchor),
    close: () => setAnchor(null),
    /** Clones the caller's trigger so MUI gets something to anchor against. */
    bind: (trigger: React.ReactNode) =>
      isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<any>, {
            onClick: (event: React.MouseEvent<HTMLElement>) => setAnchor(event.currentTarget),
          })
        : trigger,
  }
}

export function createMuiComponents(defaults: DataTableComponents): DataTableComponents {
  const Icon = defaults.Icon

  return {
    // MUI ships no icon set in its base package, so keep the built-in glyphs.
    Icon,

    // `...rest` carries the ref MUI clones onto the trigger to use as its
    // `anchorEl`; without it an overlay has nothing to position against.
    Button: ({ children, onClick, disabled, variant = 'default', size, className, ...rest }) => (
      <MuiButton
        className={className}
        size={size === 'sm' ? 'small' : 'medium'}
        variant={variant === 'primary' ? 'contained' : variant === 'quiet' ? 'text' : 'outlined'}
        disabled={disabled}
        onClick={onClick}
        {...rest}
      >
        {children}
      </MuiButton>
    ),

    IconButton: ({ label, children, active, size, className, disabled, ...rest }) => (
      <MuiTooltip title={label}>
        <span>
          <MuiIconButton
            className={className}
            aria-label={label}
            size={size === 'sm' ? 'small' : 'medium'}
            color={active ? 'primary' : 'default'}
            disabled={disabled}
            {...rest}
          >
            {children}
          </MuiIconButton>
        </span>
      </MuiTooltip>
    ),

    TextInput: ({ value, onChange, label, placeholder, type, autoFocus, disabled, onBlur, onKeyDown, dataAttributes }) => (
      <TextField
        value={value}
        type={type}
        label={undefined}
        placeholder={placeholder}
        size={INPUT_SIZE}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        slotProps={{ htmlInput: { 'aria-label': label, ...dataAttributes } }}
        fullWidth
      />
    ),

    NumberInput: ({ value, onChange, label, placeholder, min, max, ...rest }) => (
      <TextField
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        size={INPUT_SIZE}
        disabled={rest.disabled}
        autoFocus={rest.autoFocus}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
        onBlur={rest.onBlur}
        onKeyDown={rest.onKeyDown}
        slotProps={{ htmlInput: { 'aria-label': label, min, max, ...rest.dataAttributes } }}
        fullWidth
      />
    ),

    Select: ({ value, onChange, options, label, placeholder, disabled, dataAttributes }) => (
      <MuiSelect
        native
        value={value}
        size={INPUT_SIZE}
        disabled={disabled}
        onChange={(event) => onChange(String(event.target.value))}
        inputProps={{ 'aria-label': label, ...dataAttributes }}
        fullWidth
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </MuiSelect>
    ),

    MultiSelect: ({ value, onChange, options, label }) => (
      <MuiSelect
        multiple
        native
        value={value}
        size={INPUT_SIZE}
        onChange={(event) => {
          const select = event.target as unknown as HTMLSelectElement
          onChange(Array.from(select.selectedOptions, (option) => option.value))
        }}
        inputProps={{ 'aria-label': label }}
        fullWidth
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </MuiSelect>
    ),

    Checkbox: ({ checked, indeterminate, onChange, label, disabled, onClick }) => (
      <MuiCheckbox
        checked={checked}
        indeterminate={!checked && indeterminate}
        disabled={disabled}
        size="small"
        slotProps={{ input: { 'aria-label': label } }}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
    ),

    Radio: ({ checked, onChange, label, disabled, onClick, name }) => (
      <MuiRadio
        checked={checked}
        name={name}
        disabled={disabled}
        size="small"
        slotProps={{ input: { 'aria-label': label } }}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
    ),

    Switch: ({ checked, onChange, label, disabled, onClick }) => (
      <MuiSwitch
        checked={checked}
        disabled={disabled}
        size="small"
        slotProps={{ input: { 'aria-label': label } }}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
    ),

    // A slider's thumb overhangs the track by half its width at either end,
    // so the control needs gutters of its own; a plain `mx` pushes the track
    // inward but lets the thumb spill out of the filter field.
    RangeSlider: ({ value, onChange, min, max, step, label }) => (
      <div style={{ width: '100%', paddingInline: 10, boxSizing: 'border-box' }}>
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          size="small"
          getAriaLabel={() => label}
          onChange={(_, next) => onChange(next as [number, number])}
          valueLabelDisplay="auto"
          sx={{ width: '100%', display: 'block' }}
        />
      </div>
    ),

    Popover: ({ trigger, children, label, align = 'start' }) => {
      const anchor = useAnchor()
      return (
        <>
          {anchor.bind(trigger)}
          <MuiPopover
            open={anchor.open}
            anchorEl={anchor.anchor}
            onClose={anchor.close}
            anchorOrigin={{ vertical: 'bottom', horizontal: align === 'end' ? 'right' : 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: align === 'end' ? 'right' : 'left' }}
            // MUI portals its paper to `document.body`; `rtc-vars` puts the
            // table's tokens back in scope for the content we hand it.
            slotProps={{
              paper: { className: 'rtc-vars', sx: { p: 2, minWidth: 240 }, 'aria-label': label },
            }}
          >
            {children}
          </MuiPopover>
        </>
      )
    },

    Menu: ({ trigger, items, label, align = 'start' }) => {
      const anchor = useAnchor()
      return (
        <>
          {anchor.bind(trigger)}
          <MuiMenu
            open={anchor.open}
            anchorEl={anchor.anchor}
            onClose={anchor.close}
            anchorOrigin={{ vertical: 'bottom', horizontal: align === 'end' ? 'right' : 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: align === 'end' ? 'right' : 'left' }}
            slotProps={{
              list: { 'aria-label': label, dense: true },
              paper: { className: 'rtc-vars' },
            }}
          >
            {items.map((item) => {
              if (item.type === 'separator') return <Divider key={item.id} />
              if (item.type === 'label') {
                return <ListSubheader key={item.id}>{item.label}</ListSubheader>
              }
              if (item.type === 'custom') {
                return (
                  <div key={item.id} style={{ padding: 8 }}>
                    {item.content}
                  </div>
                )
              }
              const isCheckbox = item.type === 'checkbox'
              return (
                <MuiMenuItem
                  key={item.id}
                  disabled={item.disabled}
                  selected={isCheckbox ? item.checked : item.active}
                  // MUI has no menuitemcheckbox variant; set the role directly
                  // so assistive tech and the tests see the same semantics as
                  // the built-in menu.
                  role={isCheckbox ? 'menuitemcheckbox' : 'menuitem'}
                  aria-checked={isCheckbox ? item.checked : undefined}
                  onClick={() => {
                    item.onSelect?.()
                    anchor.close()
                  }}
                >
                  {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
                  <ListItemText
                    slotProps={
                      !isCheckbox && item.danger ? { primary: { color: 'error' } } : undefined
                    }
                  >
                    {item.label}
                  </ListItemText>
                </MuiMenuItem>
              )
            })}
          </MuiMenu>
        </>
      )
    },

    Dialog: ({ open, onClose, title, children, footer, label }) => (
      <Dialog open={open} onClose={onClose} aria-label={label} fullWidth maxWidth="sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {children}
        </DialogContent>
        <DialogActions>{footer}</DialogActions>
      </Dialog>
    ),

    Drawer: ({ open, onClose, title, children, footer, label, closeLabel, side = 'bottom' }) => (
      <MuiDrawer
        anchor={side === 'bottom' ? 'bottom' : side === 'start' ? 'left' : 'right'}
        open={open}
        onClose={onClose}
        aria-label={label}
        slotProps={{
          paper: {
            sx: {
              display: 'flex',
              maxHeight: side === 'bottom' ? '88svh' : undefined,
              width: side === 'bottom' ? undefined : 'min(360px, 90vw)',
              borderTopLeftRadius: side === 'bottom' ? 12 : 0,
              borderTopRightRadius: side === 'bottom' ? 12 : 0,
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
          {title}
          <MuiIconButton
            size="small"
            aria-label={closeLabel}
            onClick={onClose}
            sx={{ marginInlineStart: 'auto' }}
          >
            <Icon name="close" />
          </MuiIconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, overflowY: 'auto' }}>
          {children}
        </DialogContent>
        {footer ? <DialogActions>{footer}</DialogActions> : null}
      </MuiDrawer>
    ),

    Tooltip: ({ label, children, className }) => (
      <MuiTooltip title={label}>
        <span className={className}>{children}</span>
      </MuiTooltip>
    ),

    // `component="span"`: the modal editor already wraps each field in a
    // `<label>`, and MUI's `FormLabel` is a `<label>` element by default.
    Label: ({ children, className }) => (
      <FormLabel component="span" className={className}>
        {children}
      </FormLabel>
    ),

    Badge: ({ children, onRemove, removeLabel }) => (
      <Chip
        size="small"
        label={children}
        onDelete={onRemove}
        // Chip's delete button has no accessible name by default.
        deleteIcon={onRemove ? <span aria-label={removeLabel} role="button">×</span> : undefined}
      />
    ),

    Skeleton: ({ width }) => <MuiSkeleton variant="text" width={width ?? '80%'} />,

    ProgressBar: ({ label }) => <LinearProgress aria-label={label} />,
  }
}
