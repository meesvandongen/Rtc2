import type { RowData } from '@tanstack/react-table'
import { Subscribe } from '@tanstack/react-table'

import { useComponents } from './registry'
import type { DataTableInstance, DataTableRow } from '../types'

/**
 * Selection controls subscribe to the `rowSelection` atom directly.
 *
 * v9's guidance is that a nested component holding a stable `row` hides its
 * state read behind `row.getIsSelected()`, which React Compiler cannot see.
 * `Subscribe` makes the dependency explicit.
 */
export function SelectRowCheckbox<TData extends RowData>({
  table,
  row,
}: {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
}) {
  const ui = useComponents()
  const { localization, selectDisplayMode, enableMultiRowSelection } = table.dataTableOptions
  const Control =
    selectDisplayMode === 'radio' ? ui.Radio : selectDisplayMode === 'switch' ? ui.Switch : ui.Checkbox

  return (
    <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => !!selection[row.id]}>
      {(selected) => (
        <Control
          {...(selectDisplayMode === 'radio' ? { name: 'rtc-row-select' } : {})}
          checked={selected}
          indeterminate={row.getIsSomeSelected()}
          disabled={!row.getCanSelect()}
          label={localization.toggleSelectRow}
          onChange={(checked) => {
            // Radio mode is single-select: replace rather than merge.
            if (selectDisplayMode === 'radio' && enableMultiRowSelection === false) {
              table.setRowSelection({ [row.id]: true })
              return
            }
            row.toggleSelected(checked)
          }}
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </Subscribe>
  )
}

export function SelectAllCheckbox<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const ui = useComponents()
  const { localization, enablePagination } = table.dataTableOptions
  // Select-all follows what the user can actually see: the page when
  // paginating, the whole filtered set otherwise.
  const pageScoped = enablePagination !== false

  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => (
        <ui.Checkbox
          checked={pageScoped ? table.getIsAllPageRowsSelected() : table.getIsAllRowsSelected()}
          indeterminate={
            pageScoped ? table.getIsSomePageRowsSelected() : table.getIsSomeRowsSelected()
          }
          label={localization.toggleSelectAll}
          onChange={(checked) =>
            pageScoped
              ? table.toggleAllPageRowsSelected(checked)
              : table.toggleAllRowsSelected(checked)
          }
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </Subscribe>
  )
}
