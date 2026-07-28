import type { RowData } from '@tanstack/react-table'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { CellEditor } from './CellEditor'
import { commitRowEdit } from '../editing'
import { isDisplayColumnId } from '../displayColumns'
import { getColumnLabel } from '../utils'
import { Button } from './primitives/Controls'
import type { DataTableInstance } from '../types'

/**
 * Modal editor for `editMode: 'modal'`.
 *
 * Rendered in a portal with focus trapped inside the dialog so the underlying
 * table cannot be tabbed into while the modal is open.
 */
export function EditRowDialog<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const { localization } = options
  const editingRowId = table.ui.editingRowId
  const dialogRef = useRef<HTMLDivElement>(null)

  const row = editingRowId
    ? table.getRowModel().rows.find((candidate) => candidate.id === editingRowId)
    : undefined

  useEffect(() => {
    if (!row) return
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
  }, [row])

  useEffect(() => {
    if (!row) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
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
  })

  if (!row || options.editMode !== 'modal' || typeof document === 'undefined') return null

  const close = () => {
    options.onEditingRowCancel?.({ table, row: row as never })
    table.clearEditValues(row.id)
    table.setEditingRowId(null)
  }

  const editableColumns = table
    .getAllLeafColumns()
    .filter((column) => !isDisplayColumnId(column.id))

  return createPortal(
    <div className="rtc-dialog-backdrop rtc-root" onPointerDown={close} data-rtc-edit-dialog="">
      <div
        ref={dialogRef}
        className="rtc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={localization.edit}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className="rtc-dialog-title">{localization.edit}</h2>
        <div className="rtc-dialog-fields">
          {editableColumns.map((column) => (
            <label className="rtc-field" key={column.id}>
              <span className="rtc-field-label">{getColumnLabel(column)}</span>
              <CellEditor table={table} row={row as never} columnId={column.id} />
            </label>
          ))}
        </div>
        <div className="rtc-dialog-actions">
          <Button onClick={close}>{localization.cancel}</Button>
          <Button variant="primary" onClick={() => commitRowEdit(table, row as never)}>
            {localization.save}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
