import type { RowData } from '@tanstack/react-table'

import { CellEditor } from './CellEditor'
import { useComponents } from './registry'
import { commitRowEdit } from '../editing'
import { isDisplayColumnId } from '../displayColumns'
import { getColumnLabel } from '../utils'
import type { DataTableInstance } from '../types'

/**
 * Modal editor for `editMode: 'modal'`.
 *
 * The dialog shell comes from the registry, so a host design system supplies
 * its own modal (with its own focus trap and portal); only the field list is
 * ours.
 */
export function EditRowDialog<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const editingRowId = table.ui.editingRowId

  const row = editingRowId
    ? table.getRowModel().rows.find((candidate) => candidate.id === editingRowId)
    : undefined

  const open = !!row && options.editMode === 'modal'

  const close = () => {
    if (row) {
      options.onEditingRowCancel?.({ table, row: row as never })
      table.clearEditValues(row.id)
    }
    table.setEditingRowId(null)
  }

  const editableColumns = table
    .getAllLeafColumns()
    .filter((column) => !isDisplayColumnId(column.id) && !!column.accessorFn)

  return (
    <ui.Dialog
      open={open}
      onClose={close}
      title={localization.edit}
      label={localization.edit}
      footer={
        <>
          <ui.Button onClick={close}>{localization.cancel}</ui.Button>
          <ui.Button
            variant="primary"
            onClick={() => row && commitRowEdit(table, row as never)}
          >
            {localization.save}
          </ui.Button>
        </>
      }
    >
      {row
        ? editableColumns.map((column) => (
            <label className="rtc-field" key={column.id}>
              <ui.Label className="rtc-field-label">{getColumnLabel(column, localization)}</ui.Label>
              <CellEditor table={table} row={row as never} columnId={column.id} />
            </label>
          ))
        : null}
    </ui.Dialog>
  )
}
