import type { RowData } from '@tanstack/react-table'
import { commitRowEdit, isRowEditable } from '../editing'
import { IconButton } from './primitives/Controls'
import { Menu, MenuItem } from './primitives/Menu'
import { CloseIcon, EditIcon, MoreVerticalIcon, SaveIcon } from './primitives/Icons'
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
        <IconButton
          size="sm"
          label={localization.save}
          onClick={() => commitRowEdit(table, row)}
        >
          <SaveIcon />
        </IconButton>
        <IconButton
          size="sm"
          label={localization.cancel}
          onClick={() => {
            options.onEditingRowCancel?.({ table, row })
            table.clearEditValues(row.id)
            table.setEditingRowId(null)
          }}
        >
          <CloseIcon />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="rtc-row-actions">
      {showEditButton ? (
        <IconButton
          size="sm"
          label={localization.edit}
          onClick={(event) => {
            event.stopPropagation()
            table.setEditingRowId(row.id)
          }}
        >
          <EditIcon />
        </IconButton>
      ) : null}

      {options.renderRowActions?.({ table, row })}

      {options.renderRowActionMenuItems ? (
        <Menu
          align="end"
          label={localization.rowActions}
          trigger={(triggerProps) => (
            <IconButton size="sm" label={localization.rowActions} {...(triggerProps as any)}>
              <MoreVerticalIcon />
            </IconButton>
          )}
        >
          {(close) => (
            <div onClick={close} role="none">
              {options.renderRowActionMenuItems?.({ table, row })}
            </div>
          )}
        </Menu>
      ) : null}
    </div>
  )
}

export { MenuItem as RowActionMenuItem }
