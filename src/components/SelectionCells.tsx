import type { RowData } from '@tanstack/react-table'
import { Subscribe } from '@tanstack/react-table'

import { Checkbox } from './primitives/Controls'
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
  const { localization, selectDisplayMode, enableMultiRowSelection } = table.dataTableOptions
  const variant =
    selectDisplayMode === 'radio' ? 'radio' : selectDisplayMode === 'switch' ? 'switch' : 'checkbox'

  return (
    <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => !!selection[row.id]}>
      {(selected) => (
        <Checkbox
          variant={variant}
          name={variant === 'radio' ? 'rtc-row-select' : undefined}
          checked={selected}
          indeterminate={row.getIsSomeSelected()}
          disabled={!row.getCanSelect()}
          label={localization.toggleSelectRow}
          onChange={row.getToggleSelectedHandler()}
          onClick={(event) => {
            // Radio mode is single-select: clear siblings before selecting.
            if (variant === 'radio' && enableMultiRowSelection === false) {
              event.stopPropagation()
              table.setRowSelection({ [row.id]: true })
              return
            }
            event.stopPropagation()
          }}
        />
      )}
    </Subscribe>
  )
}

export function SelectAllCheckbox<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const { localization, enablePagination } = table.dataTableOptions
  // Select-all follows what the user can actually see: the page when
  // paginating, the whole filtered set otherwise.
  const pageScoped = enablePagination !== false

  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => (
        <Checkbox
          checked={pageScoped ? table.getIsAllPageRowsSelected() : table.getIsAllRowsSelected()}
          indeterminate={
            pageScoped ? table.getIsSomePageRowsSelected() : table.getIsSomeRowsSelected()
          }
          label={localization.toggleSelectAll}
          onChange={
            pageScoped
              ? table.getToggleAllPageRowsSelectedHandler()
              : table.getToggleAllRowsSelectedHandler()
          }
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </Subscribe>
  )
}
