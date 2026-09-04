import type { RowData } from '@tanstack/react-table'

import { useComponents, type DataTableComponents, type RtcMenuItem } from './registry'
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

  const items = [
    ...rowPinItems(table, row, ui),
    ...(options.rowActionMenuItems?.({ table, row }) ?? []),
  ]

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

      {items.length > 0 ? (
        <ui.Menu
          align="end"
          label={localization.rowActions}
          items={items}
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

/**
 * Pin/unpin entries for the row's overflow menu.
 *
 * `enableRowPinning` used to buy the sticky rendering and nothing else — the
 * only way to pin was to call `row.pin()` from your own `renderRowActions`,
 * which every consumer then had to build and name in English. The rendering
 * was already ours; the control belongs with it.
 */
function rowPinItems<TData extends RowData>(
  table: DataTableInstance<TData>,
  row: DataTableRow<TData>,
  ui: DataTableComponents,
): RtcMenuItem[] {
  const { localization } = table.dataTableOptions
  if (!table.dataTableOptions.enableRowPinning || !row.getCanPin()) return []

  const pinned = row.getIsPinned()
  const mode = table.dataTableOptions.rowPinningDisplayMode ?? 'sticky'
  // `top`/`bottom` lift pinned rows into a section of their own, so offering
  // the direction the table has no section for would pin a row out of sight.
  const canTop = mode !== 'bottom'
  const canBottom = mode !== 'top'

  // A pinned row sticks to the top or bottom upright, and to the start or end
  // of the record axis once it *is* a column. Same state, same command, and the
  // menu has to say which of the two it will do.
  const transposed = table.ui.transposed
  const topLabel = transposed ? localization.pinToStart : localization.pinToTop
  const bottomLabel = transposed ? localization.pinToEnd : localization.pinToBottom

  const items: RtcMenuItem[] = []
  if (canTop) {
    items.push({
      id: 'rtc-pin-top',
      label: pinned === 'top' ? localization.unpin : topLabel,
      icon: <ui.Icon name={pinned === 'top' ? 'pinOff' : 'pin'} />,
      active: pinned === 'top',
      onSelect: () => row.pin(pinned === 'top' ? false : 'top'),
    })
  }
  if (canBottom) {
    items.push({
      id: 'rtc-pin-bottom',
      label: pinned === 'bottom' ? localization.unpin : bottomLabel,
      icon: <ui.Icon name={pinned === 'bottom' ? 'pinOff' : 'pin'} />,
      active: pinned === 'bottom',
      onSelect: () => row.pin(pinned === 'bottom' ? false : 'bottom'),
    })
  }
  return items
}
