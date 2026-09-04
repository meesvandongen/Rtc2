import type { RowData } from '@tanstack/react-table'
import { CellEditor } from './CellEditor'
import { CopyCell, clickToCopyEnabled } from './CopyCell'
import { getCellLayoutProps } from './HeaderCell'
import { DISPLAY_COLUMN_IDS, rendersOnGroupedRow } from '../displayColumnIds'
import { resolveGroupingLayout } from '../displayColumns'
import { cellEditId, isCellEditing } from '../editing'
import { cx, stringifyValue } from '../utils'
import type { DataTableCell, DataTableInstance, DataTableRow } from '../types'

export interface BodyCellProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  cell: DataTableCell<TData, any>
  /**
   * Position in the full column order — not the position among the cells this
   * row happens to render, which under column virtualization is a window.
   * Drives the cell's reported column position.
   */
  columnIndex: number
}

/**
 * One body cell.
 *
 * Handles the four content modes TanStack can produce — normal, grouped,
 * aggregated and placeholder — plus inline editing and cell-selection state.
 */
export function BodyCell<TData extends RowData>({ table, row, cell, columnIndex }: BodyCellProps<TData>) {
  const options = table.dataTableOptions
  const column = cell.column
  const layout = getCellLayoutProps(table, column, 'body')

  const isGrouped = cell.getIsGrouped()
  const isAggregated = cell.getIsAggregated()
  const isPlaceholder = cell.getIsPlaceholder()
  const editing = isCellEditing(table, row, column.id)

  // Under `groupedColumnMode: 'remove'` the grouped columns are gone from the
  // table and the expand column carries their value in its place, so it gets
  // the group cell's styling. (The depth is carried by the chevron in that
  // same cell — see `RowExpandToggle`.)
  const isExpandColumn = column.id === DISPLAY_COLUMN_IDS.expand
  const grouped = resolveGroupingLayout(options, table.state.grouping)
  const carriesGroupLabel = grouped.carriesGroupLabel && isExpandColumn && !!row.groupingColumnId
  // A group row stands for many records: the controls that address a single
  // one stay blank on it.
  const isInertOnGroupRow = row.getIsGrouped() && !rendersOnGroupedRow(column.id)

  const cellSelectionEnabled = options.enableCellSelection ?? false
  const isSelected = cellSelectionEnabled && cell.getIsSelected()
  const isFocused = cellSelectionEnabled && cell.getIsFocused()
  const edges = cellSelectionEnabled ? cell.getSelectionEdges() : undefined

  const userProps = options.cellProps?.({ table, row, cell, column })

  const canActivateEditor =
    !!options.enableEditing && options.editMode === 'cell' && !editing && !isGrouped && !isAggregated

  // Only a plain cell has one value to copy: a group cell shows the key its
  // rows share, an aggregate shows a computed summary, and a placeholder shows
  // nothing at all.
  const canCopy =
    clickToCopyEnabled(column.columnDef.meta, options.enableClickToCopy) &&
    !isGrouped &&
    !isAggregated &&
    !isPlaceholder &&
    !editing &&
    !isInertOnGroupRow

  return (
    <td
      {...layout}
      {...userProps}
      className={cx(layout.className, userProps?.className)}
      style={{ ...layout.style, ...userProps?.style }}
      // Stated rather than counted: with the columns virtualized, the cells
      // either side of this one may not be in the DOM at all.
      aria-colindex={columnIndex + 1}
      data-rtc-grouped={isGrouped || carriesGroupLabel ? 'true' : undefined}
      data-rtc-cell-selected={isSelected ? 'true' : undefined}
      data-rtc-cell-focused={isFocused ? 'true' : undefined}
      data-rtc-cell-edge-top={edges?.top ? 'true' : undefined}
      data-rtc-cell-edge-bottom={edges?.bottom ? 'true' : undefined}
      data-rtc-cell-edge-left={edges?.left ? 'true' : undefined}
      data-rtc-cell-edge-right={edges?.right ? 'true' : undefined}
      tabIndex={cellSelectionEnabled ? cell.getTabIndex() : undefined}
      onPointerDown={
        cellSelectionEnabled && cell.getCanSelect()
          ? (cell.getSelectionStartHandler() as React.PointerEventHandler)
          : undefined
      }
      onPointerEnter={
        cellSelectionEnabled && (options.enableCellRangeSelection ?? false)
          ? (cell.getSelectionExtendHandler() as React.PointerEventHandler)
          : undefined
      }
      onDoubleClick={
        canActivateEditor
          ? () => table.setEditingCellId(cellEditId(row.id, column.id))
          : undefined
      }
    >
      <div className="rtc-cell-inner">
        {isInertOnGroupRow ? null : isGrouped ? (
          // The chevron lives in the expand column, which grouping always adds.
          <>
            <span className="rtc-cell-value">
              <table.FlexRender cell={cell} />
            </span>
            <span className="rtc-group-count">({row.subRows.length})</span>
          </>
        ) : isPlaceholder ? null : editing ? (
          <CellEditor
            table={table}
            row={row}
            columnId={column.id}
            autoFocus={options.editMode === 'cell'}
            onFinish={() => table.setEditingCellId(null)}
          />
        ) : canCopy ? (
          <span className="rtc-cell-value">
            <CopyCell
              value={stringifyValue(cell.getValue())}
              localization={options.localization}
            >
              <table.FlexRender cell={cell} />
            </CopyCell>
          </span>
        ) : (
          <span className={cx('rtc-cell-value', isAggregated && 'rtc-aggregate')}>
            <table.FlexRender cell={cell} />
          </span>
        )}
      </div>
    </td>
  )
}
