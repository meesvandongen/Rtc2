import type { RowData } from '@tanstack/react-table'

import { useComponents } from './registry'
import { commitCellEdit, getEditValue } from '../editing'
import { getColumnLabel, normalizeOptions, stringifyValue } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface CellEditorProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  columnId: string
  /** Focus on mount — used by `cell` edit mode where the user just clicked in. */
  autoFocus?: boolean
  /** Commit and leave edit mode. */
  onFinish?: () => void
}

/**
 * The inline editor for one cell, chosen by `columnDef.meta.editVariant`.
 *
 * Edits are staged in `table.editValues` and committed on blur, Enter, or
 * change (for discrete inputs), so `row`/`modal` modes can cancel cleanly.
 */
export function CellEditor<TData extends RowData>({
  table,
  row,
  columnId,
  autoFocus,
  onFinish,
}: CellEditorProps<TData>) {
  const ui = useComponents()
  const column = table.getColumn(columnId)
  const meta = column?.columnDef.meta
  const variant = meta?.editVariant ?? 'text'
  const value = getEditValue(table, row, columnId)
  const label = column ? getColumnLabel(column) : columnId

  const stage = (next: unknown) => table.setEditValue(row.id, columnId, next)
  const commit = (next: unknown) => {
    commitCellEdit(table, row, columnId, next)
    onFinish?.()
  }

  if (variant === 'checkbox') {
    return (
      <ui.Checkbox
        checked={!!value}
        label={label}
        onChange={(checked) => {
          stage(checked)
          commit(checked)
        }}
      />
    )
  }

  if (variant === 'select') {
    return (
      <ui.Select
        label={label}
        size="sm"
        value={stringifyValue(value)}
        placeholder=""
        options={normalizeOptions(meta?.editSelectOptions)}
        onChange={(next) => {
          stage(next)
          commit(next)
        }}
      />
    )
  }

  if (variant === 'number') {
    return (
      <ui.NumberInput
        label={label}
        size="sm"
        autoFocus={autoFocus}
        value={typeof value === 'number' ? value : undefined}
        onChange={stage}
        onBlur={() => commit(getEditValue(table, row, columnId))}
        onKeyDown={(event) => handleKeys(event, table, row, onFinish)}
      />
    )
  }

  return (
    <ui.TextInput
      label={label}
      size="sm"
      type={variant === 'date' ? 'date' : 'text'}
      autoFocus={autoFocus}
      value={stringifyValue(value)}
      onChange={stage}
      onBlur={() => commit(getEditValue(table, row, columnId))}
      onKeyDown={(event) => handleKeys(event, table, row, onFinish)}
    />
  )
}

/** Enter commits via blur; Escape discards the staged edit. */
function handleKeys<TData extends RowData>(
  event: React.KeyboardEvent,
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
  onFinish?: () => void,
) {
  if (event.key === 'Enter') {
    event.preventDefault()
    ;(event.target as HTMLInputElement).blur()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    table.clearEditValues(row.id)
    onFinish?.()
  }
}
