import type { RowData } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'

import { RowActionsCell } from './components/RowActionsCell'
import { RowDragHandle } from './components/RowDragHandle'
import { RowExpandToggle } from './components/RowExpandToggle'
import { SelectAllCheckbox, SelectRowCheckbox } from './components/SelectionCells'
import { DISPLAY_COLUMN_IDS } from './displayColumnIds'
import type { DataTableFeatures } from './features'
import type { DataTableColumn, DataTableInstance, DataTableOptions } from './types'

export {
  DISPLAY_COLUMN_IDS,
  isDisplayColumnId,
  getDisplayColumnLabel,
  type DisplayColumnId,
} from './displayColumnIds'

/** Shared defaults: display columns never participate in data operations. */
const inertColumnDef = {
  enableSorting: false,
  enableColumnFilter: false,
  enableGlobalFilter: false,
  enableGrouping: false,
  enableHiding: false,
  enableResizing: false,
  size: 44,
  minSize: 32,
} as const

export interface BuildDisplayColumnsArgs<TData extends RowData> {
  options: DataTableOptions<TData>
  getTable: () => DataTableInstance<TData>
}

/**
 * Builds the leading/trailing utility columns for the enabled features.
 *
 * They are real TanStack columns rather than hard-coded markup so that
 * pinning, ordering, sizing and virtualization treat them like any other
 * column.
 */
export function buildDisplayColumns<TData extends RowData>({
  options,
  getTable,
}: BuildDisplayColumnsArgs<TData>): {
  leading: Array<DataTableColumn<TData, any>>
  trailing: Array<DataTableColumn<TData, any>>
} {
  const helper = createColumnHelper<DataTableFeatures, TData>()
  const leading: Array<DataTableColumn<TData, any>> = []
  const trailing: Array<DataTableColumn<TData, any>> = []

  if (options.enableRowOrdering) {
    leading.push(
      helper.display({
        ...inertColumnDef,
        id: DISPLAY_COLUMN_IDS.drag,
        size: 40,
        header: '',
        cell: ({ row }) => <RowDragHandle table={getTable()} row={row as any} />,
      }),
    )
  }

  if (options.enableRowSelection) {
    const multi = options.enableMultiRowSelection !== false && options.selectDisplayMode !== 'radio'
    leading.push(
      helper.display({
        ...inertColumnDef,
        id: DISPLAY_COLUMN_IDS.select,
        size: 44,
        header: () =>
          multi && options.enableSelectAll !== false ? (
            <SelectAllCheckbox table={getTable()} />
          ) : null,
        cell: ({ row }) => <SelectRowCheckbox table={getTable()} row={row as any} />,
      }),
    )
  }

  const hasExpanding = options.enableExpanding || !!options.renderDetailPanel
  if (hasExpanding) {
    leading.push(
      helper.display({
        ...inertColumnDef,
        id: DISPLAY_COLUMN_IDS.expand,
        size: 40,
        header: () =>
          options.enableExpandAll !== false && !options.renderDetailPanel ? (
            <RowExpandToggle table={getTable()} />
          ) : null,
        cell: ({ row }) => <RowExpandToggle table={getTable()} row={row as any} />,
      }),
    )
  }

  if (options.enableRowNumbers) {
    leading.push(
      helper.display({
        ...inertColumnDef,
        id: DISPLAY_COLUMN_IDS.rowNumber,
        size: 56,
        header: () => getTable().dataTableOptions.localization.rowNumber,
        cell: ({ row }) => {
          if (options.rowNumberDisplayMode === 'original') return row.index + 1
          const displayIndex = row.getDisplayIndex()
          return displayIndex === -1 ? '' : displayIndex + 1
        },
        meta: { align: 'right' },
      }),
    )
  }

  const showActions = options.enableRowActions || !!options.renderRowActions ||
    !!options.rowActionMenuItems ||
    (!!options.enableEditing && (options.editMode === 'row' || options.editMode === 'modal'))

  if (showActions) {
    const actionsColumn = helper.display({
      ...inertColumnDef,
      id: DISPLAY_COLUMN_IDS.actions,
      size: 72,
      header: () => getTable().dataTableOptions.localization.actions,
      cell: ({ row }) => <RowActionsCell table={getTable()} row={row as any} />,
      meta: { align: 'center' },
    })
    if (options.positionActionsColumn === 'first') leading.push(actionsColumn)
    else trailing.push(actionsColumn)
  }

  return { leading, trailing }
}
