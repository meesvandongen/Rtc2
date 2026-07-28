import type { RowData } from '@tanstack/react-table'
import { CellEditor } from './CellEditor'
import { RowExpandToggle } from './RowExpandToggle'
import { getCellLayoutProps } from './HeaderCell'
import { cellEditId, isCellEditing } from '../editing'
import { cx } from '../utils'
import type { DataTableCell, DataTableInstance, DataTableRow } from '../types'

export interface BodyCellProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  cell: DataTableCell<TData, any>
  /** Index among visible cells, used for cell-range selection geometry. */
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

  const cellSelectionEnabled = options.enableCellSelection ?? false
  const isSelected = cellSelectionEnabled && cell.getIsSelected()
  const isFocused = cellSelectionEnabled && cell.getIsFocused()
  const edges = cellSelectionEnabled ? cell.getSelectionEdges() : undefined

  const userProps = options.cellProps?.({ table, row, cell, column })

  // Tree indentation belongs on the first non-display column so nested rows
  // read as a hierarchy rather than a flat list.
  const isFirstDataColumn = columnIndex === 0
  const indent = options.enableExpanding && row.depth > 0 && isFirstDataColumn ? row.depth * 16 : 0

  const canActivateEditor =
    !!options.enableEditing && options.editMode === 'cell' && !editing && !isGrouped && !isAggregated

  return (
    <td
      {...layout}
      {...userProps}
      className={cx(layout.className, userProps?.className)}
      style={{ ...layout.style, ...userProps?.style }}
      data-rtc-grouped={isGrouped ? 'true' : undefined}
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
        {indent > 0 ? <span className="rtc-cell-indent" style={{ width: indent }} /> : null}

        {isGrouped ? (
          <>
            <RowExpandToggle table={table} row={row} />
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
        ) : (
          <span className={cx('rtc-cell-value', isAggregated && 'rtc-aggregate')}>
            <table.FlexRender cell={cell} />
          </span>
        )}
      </div>
    </td>
  )
}
