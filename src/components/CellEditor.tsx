import type { RowData } from '@tanstack/react-table'
import { useEffect, useRef } from 'react'

import { commitCellEdit, getEditValue } from '../editing'
import { getColumnLabel, normalizeOptions, stringifyValue } from '../utils'
import { Select, TextInput } from './primitives/Controls'
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
  const column = table.getColumn(columnId)
  const meta = column?.columnDef.meta
  const variant = meta?.editVariant ?? 'text'
  const value = getEditValue(table, row, columnId)
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  const stage = (next: unknown) => table.setEditValue(row.id, columnId, next)

  const commit = (next: unknown) => {
    commitCellEdit(table, row, columnId, next)
    onFinish?.()
  }

  const label = column ? getColumnLabel(column) : columnId

  if (variant === 'checkbox') {
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        className="rtc-checkbox"
        type="checkbox"
        aria-label={label}
        checked={!!value}
        onChange={(event) => {
          stage(event.target.checked)
          commit(event.target.checked)
        }}
      />
    )
  }

  if (variant === 'select') {
    const options = normalizeOptions(meta?.editSelectOptions)
    return (
      <Select
        ref={ref as never}
        label={label}
        value={stringifyValue(value)}
        options={[{ label: '', value: '' }, ...options]}
        onChange={(event) => {
          stage(event.target.value)
          commit(event.target.value)
        }}
      />
    )
  }

  const inputType = variant === 'number' ? 'number' : variant === 'date' ? 'date' : 'text'

  return (
    <TextInput
      ref={ref as React.Ref<HTMLInputElement>}
      type={inputType}
      aria-label={label}
      value={stringifyValue(value)}
      onChange={(event) => {
        stage(inputType === 'number' ? event.target.valueAsNumber : event.target.value)
      }}
      onBlur={(event) =>
        commit(inputType === 'number' ? event.target.valueAsNumber : event.target.value)
      }
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          ;(event.target as HTMLInputElement).blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          table.clearEditValues(row.id)
          onFinish?.()
        }
      }}
    />
  )
}
