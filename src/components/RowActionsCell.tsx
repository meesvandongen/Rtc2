import type { RowData } from '@tanstack/react-table'

import { useComponents } from './registry'
import { commitRowEdit, isRowEditable } from '../editing'
import type { DataTableInstance, DataTableRow } from '../types'

/**
 * Contents of the generated actions column: the edit affordance for `row` and
 * `modal` edit modes, any custom actions, and the overflow menu.
 */
export function RowActionsCell<TData extends RowData>({
  table,
  row,
}: {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
}) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const isEditing = table.ui.editingRowId === row.id
  const showEditButton =
    !!options.enableEditing &&
    (options.editMode === 'row' || options.editMode === 'modal') &&
    isRowEditable(table, row)

  if (isEditing && options.editMode === 'row') {
    return (
      <div className="rtc-edit-actions">
        <ui.IconButton size="sm" label={localization.save} onClick={() => commitRowEdit(table, row)}>
          <ui.Icon name="save" />
        </ui.IconButton>
        <ui.IconButton
          size="sm"
          label={localization.cancel}
          onClick={() => {
            options.onEditingRowCancel?.({ table, row })
            table.clearEditValues(row.id)
            table.setEditingRowId(null)
          }}
        >
          <ui.Icon name="close" />
        </ui.IconButton>
      </div>
    )
  }

  return (
    <div className="rtc-row-actions">
      {showEditButton ? (
        <ui.IconButton
          size="sm"
          label={localization.edit}
          onClick={(event) => {
            event.stopPropagation()
            table.setEditingRowId(row.id)
          }}
        >
          <ui.Icon name="edit" />
        </ui.IconButton>
      ) : null}

      {options.renderRowActions?.({ table, row })}

      {options.rowActionMenuItems ? (
        <ui.Menu
          align="end"
          label={localization.rowActions}
          items={options.rowActionMenuItems({ table, row })}
          trigger={
            <ui.IconButton size="sm" label={localization.rowActions}>
              <ui.Icon name="more" />
            </ui.IconButton>
          }
        />
      ) : null}
    </div>
  )
}
