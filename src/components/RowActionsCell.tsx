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

  // A sticky row keeps its place and is held against both edges, so there is no
  // direction to choose: one entry pins and unpins. (The pinning state still
  // takes a side — `top`, arbitrarily — because that is the shape TanStack
  // stores, and it decides only where a row a filter has dropped is put back.)
  if (mode === 'sticky') {
    return [
      {
        id: 'rtc-pin',
        label: pinned ? localization.unpin : localization.pin,
        icon: <ui.Icon name={pinned ? 'pinOff' : 'pin'} />,
        active: !!pinned,
        onSelect: () => row.pin(pinned ? false : 'top'),
      },
    ]
  }

  // `top`/`bottom` name the one direction that table pins in, so the other is
  // not offered — except to a row already pinned to it, from `initialState` or
  // from `row.pin()`, which would otherwise have no way back.
  const canTop = mode !== 'bottom' || pinned === 'top'
  const canBottom = mode !== 'top' || pinned === 'bottom'

  const items: RtcMenuItem[] = []
  if (canTop) {
    items.push({
      id: 'rtc-pin-top',
      label: pinned === 'top' ? localization.unpin : localization.pinToTop,
      icon: <ui.Icon name={pinned === 'top' ? 'pinOff' : 'pin'} />,
      active: pinned === 'top',
      onSelect: () => row.pin(pinned === 'top' ? false : 'top'),
    })
  }
  if (canBottom) {
    items.push({
      id: 'rtc-pin-bottom',
      label: pinned === 'bottom' ? localization.unpin : localization.pinToBottom,
      icon: <ui.Icon name={pinned === 'bottom' ? 'pinOff' : 'pin'} />,
      active: pinned === 'bottom',
      onSelect: () => row.pin(pinned === 'bottom' ? false : 'bottom'),
    })
  }
  return items
}
