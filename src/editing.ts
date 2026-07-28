import type { RowData } from '@tanstack/react-table'
import { isDisplayColumnId } from './displayColumns'
import type { DataTableInstance, DataTableRow } from './types'

/** Composite key identifying a cell in edit mode. */
export function cellEditId(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`
}

export function isRowEditable<TData extends RowData>(
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
): boolean {
  const { enableEditing } = table.dataTableOptions
  if (typeof enableEditing === 'function') return enableEditing(row)
  return !!enableEditing
}

/**
 * True when this specific cell should render its editor right now.
 *
 * `table` mode edits everything inline at once; `cell` mode edits only the
 * activated cell; `row` mode edits every cell of the activated row; `modal`
 * mode edits in a dialog, so no inline editor is shown.
 */
export function isCellEditing<TData extends RowData>(
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
  columnId: string,
): boolean {
  const { enableEditing, editMode = 'modal' } = table.dataTableOptions
  if (!enableEditing || !isRowEditable(table, row)) return false
  // Generated columns (select, expand, actions, …) hold controls, not data.
  if (isDisplayColumnId(columnId)) return false
  // Display columns declared by the caller have no accessor to write back to.
  if (!table.getColumn(columnId)?.accessorFn) return false
  if (editMode === 'table') return true
  if (editMode === 'row') return table.ui.editingRowId === row.id
  if (editMode === 'cell') return table.ui.editingCellId === cellEditId(row.id, columnId)
  return false
}

/** The value an editor should show: the pending edit if any, else the source value. */
export function getEditValue<TData extends RowData>(
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
  columnId: string,
): unknown {
  const pending = table.editValues[row.id]
  if (pending && columnId in pending) return pending[columnId]
  return row.getValue(columnId)
}

/** Collects a row's pending edits and hands them to `onEditingRowSave`. */
export function commitRowEdit<TData extends RowData>(
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
): void {
  const changes = table.editValues[row.id] ?? {}
  const values = { ...(row.original as object), ...changes } as TData
  const exitEditingMode = () => {
    table.clearEditValues(row.id)
    table.setEditingRowId(null)
  }

  const result = table.dataTableOptions.onEditingRowSave?.({
    table,
    row,
    values,
    changes,
    exitEditingMode,
  })

  // With no handler there is nothing async to wait for; close immediately.
  // With one, the handler decides when to exit via `exitEditingMode`.
  if (!table.dataTableOptions.onEditingRowSave) exitEditingMode()
  else void result
}

/**
 * Applies a single committed cell change.
 *
 * In `table` edit mode the change is written straight through to `onDataChange`
 * because there is no explicit save step.
 */
export function commitCellEdit<TData extends RowData>(
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
  columnId: string,
  value: unknown,
): void {
  const options = table.dataTableOptions
  const cell = row.getAllCells().find((candidate) => candidate.column.id === columnId)

  if (cell) {
    options.onCellEditComplete?.({
      table,
      row,
      cell: cell as never,
      column: cell.column as never,
      value,
    })
  }

  if (options.editMode === 'table' || options.editMode === 'cell') {
    if (options.onDataChange) {
      const next = options.data.map((item) =>
        item === row.original ? ({ ...(item as object), [columnId]: value } as TData) : item,
      )
      options.onDataChange(next)
      table.clearEditValues(row.id)
    }
  }
}
