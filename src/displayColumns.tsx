import type { RowData } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'

import { RowActionsCell } from './components/RowActionsCell'
import { RowDragHandle } from './components/RowDragHandle'
import { RowExpandToggle } from './components/RowExpandToggle'
import { SelectAllCheckbox, SelectRowCheckbox } from './components/SelectionCells'
import { DISPLAY_COLUMN_IDS } from './displayColumnIds'
import type { DataTableFeatures } from './features'
import type { DataTableLocalization } from './locale'
import { treeIndentReserve } from './treeIndent'
import { getColumnLabel } from './utils'
import type { DataTableColumn, DataTableInstance, DataTableOptions, DataTableRow } from './types'

export {
  DISPLAY_COLUMN_IDS,
  isDisplayColumnId,
  getDisplayColumnLabel,
  type DisplayColumnId,
} from './displayColumnIds'

export interface GroupingLayout {
  /** Grouping is on and at least one column is grouped. */
  active: boolean
  /** The expand column stands in for the columns `remove` took away. */
  carriesGroupLabel: boolean
}

/**
 * Resolves what the current grouping state does to the columns.
 *
 * TanStack applies `groupedColumnMode` to the column order itself — `reorder`
 * moves the grouped columns to the front, `remove` drops them, `false` leaves
 * the order alone. What it cannot do is put the group value back on screen
 * once `remove` has taken the column away, which is what this describes.
 */
export function resolveGroupingLayout<TData extends RowData>(
  options: DataTableOptions<TData>,
  grouping: string[],
): GroupingLayout {
  const active = !!options.enableGrouping && grouping.length > 0
  return { active, carriesGroupLabel: active && options.groupedColumnMode === 'remove' }
}

/**
 * Whether rows can expand.
 *
 * Grouping implies it: a group row that cannot open is a dead end, so
 * `enableGrouping` turns expanding on unless the caller says otherwise.
 */
export function resolveEnableExpanding<TData extends RowData>(
  options: DataTableOptions<TData>,
): boolean {
  return options.enableExpanding ?? (!!options.renderDetailPanel || !!options.enableGrouping)
}

/** Width of the expand column while it stands in for a removed grouped column. */
const GROUP_LABEL_COLUMN_SIZE = 180

/**
 * Width of the expand column at the root level: the chevron plus the cell's
 * own gutters. Every level of nesting adds an indent step on top of this —
 * see `treeIndent.ts`.
 */
const EXPAND_COLUMN_SIZE = 48

/**
 * The value a `remove`-mode group row shows in place of its grouped column.
 *
 * Booleans go through the localization rather than `String(value)`: grouping a
 * yes/no column produced group rows reading "true" and "false" while the
 * column's own filter offered "Ja" and "Nee".
 */
function groupingValueLabel(
  value: unknown,
  localization: DataTableLocalization,
): string | number {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') {
    return value ? localization.booleanTrue : localization.booleanFalse
  }
  return value == null ? '' : String(value)
}

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
  /** Active grouping. Grouping alone brings the expand column into the table. */
  grouping: string[]
  /**
   * Depth of the deepest row the table can render, counting roots as 0. The
   * expand column reserves an indent step per level so the chevron of a nested
   * row still fits inside it.
   */
  maxRowDepth: number
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
  grouping,
  maxRowDepth,
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

  // Grouping brings the expand column along even when sub-row expanding is
  // off, because the chevron that opens a group lives in it. Standing in for
  // removed grouped columns also earns it the width of a data column.
  const { active: isGrouped, carriesGroupLabel } = resolveGroupingLayout(options, grouping)
  const hasExpanding = options.enableExpanding || !!options.renderDetailPanel || isGrouped

  if (hasExpanding) {
    const showExpandAll = options.enableExpandAll !== false && !options.renderDetailPanel

    // The chevron is indented inside this column, so the column has to be wide
    // enough for the deepest one. Reserved from the whole tree's depth rather
    // than the part of it that happens to be open: a column that widened as
    // branches expanded would shift every column after it sideways on a click.
    const indentReserve = treeIndentReserve(maxRowDepth)
    const chevronSize = EXPAND_COLUMN_SIZE + indentReserve

    leading.push(
      helper.display({
        ...inertColumnDef,
        id: DISPLAY_COLUMN_IDS.expand,
        size: (carriesGroupLabel ? GROUP_LABEL_COLUMN_SIZE : EXPAND_COLUMN_SIZE) + indentReserve,
        // A column standing in for the grouped columns can be narrowed to the
        // label it carries, but never past the chevron in front of it.
        minSize: chevronSize,
        header: () => {
          const table = getTable()
          const expandAll = showExpandAll ? <RowExpandToggle table={table} /> : null
          if (!carriesGroupLabel) return expandAll
          // Stands in for the removed columns' headers. Nested grouping reads
          // as a sequence — "Department, then by Role" — so the separator is a
          // localized string rather than a comma.
          const { localization } = table.dataTableOptions
          const label = table.state.grouping
            .map((columnId) => {
              const column = table.getColumn(columnId)
              return column ? getColumnLabel(column, localization) : columnId
            })
            .join(localization.thenBy)
          return (
            <>
              {expandAll}
              <span className="rtc-group-label">{label}</span>
            </>
          )
        },
        cell: ({ row }) => {
          const table = getTable()
          const groupRow = row as unknown as DataTableRow<TData>
          const toggle = <RowExpandToggle table={table} row={groupRow} />
          const groupingColumnId = groupRow.groupingColumnId
          if (!carriesGroupLabel || !groupingColumnId) return toggle
          const { localization } = table.dataTableOptions
          const column = table.getColumn(groupingColumnId)
          const label = column ? getColumnLabel(column, localization) : undefined
          return (
            <span className="rtc-group-label-cell">
              {toggle}
              <span className="rtc-group-label" title={label}>
                {groupingValueLabel(groupRow.groupingValue, localization)}
              </span>
              <span className="rtc-group-count">({groupRow.subRows.length})</span>
            </span>
          )
        },
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
    // Row pinning puts pin/unpin in the overflow menu, which needs a cell to
    // live in; without this the feature is again reachable only from code.
    !!options.enableRowPinning ||
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
