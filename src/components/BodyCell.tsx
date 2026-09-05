import type { RowData } from '@tanstack/react-table'
import { CellEditor } from './CellEditor'
import { CopyCell, clickToCopyEnabled } from './CopyCell'
import { getCellLayoutProps } from './HeaderCell'
import { DISPLAY_COLUMN_IDS, rendersOnGroupedRow } from '../displayColumnIds'
import { resolveGroupingLayout } from '../displayColumns'
import { cellEditId, isCellEditing } from '../editing'
import type { TransposedPin } from '../transpose'
import { cx, stringifyValue } from '../utils'
import type { DataTableCell, DataTableInstance, DataTableRow } from '../types'

/**
 * What a cell of a transposed table carries that its row would have carried
 * upright.
 *
 * A record is a column there, so the state that belongs to a record — its
 * stripe, its selection, its pinning, whether clicking it selects — has nowhere
 * to live but on each of its cells. Upright, all of it sits once on the `<tr>`.
 */
export interface TransposedRecordState {
  /** Zebra parity of the record, counted over the rendered records. */
  parity: 'odd' | 'even'
  selected: boolean
  /**
   * How the record is held, if at all. `both` is the sticky mode, where the
   * record keeps its place in the order and is held against either inline edge;
   * `start` and `end` are a section lifted out to one of them.
   */
  pinned: TransposedPin
  /** Where it docks at the inline start, as CSS. Set for `both` and `start`. */
  pinStart?: string
  /** …and at the inline end. Set for `both` and `end`. */
  pinEnd?: string
  /** Innermost record of a pinned block: the one that carries the shadow. */
  pinEdge?: boolean
  /** Whether clicking the cell toggles the record's selection. */
  clickable: boolean
  /** Set while this record is being dragged by `enableRowOrdering`. */
  dragging?: boolean
  /** Set while this record is the drop target, with the edge it would land on. */
  dropEdge?: 'before' | 'after'
  /**
   * What `rowProps` returned for the record.
   *
   * Applied to every cell of its column, because that column *is* the record —
   * there is no single element the props could go on instead. A slot that
   * returns something a document may only carry once, an `id` say, is the one
   * thing to keep out of it in a transposed table.
   */
  attributes?: React.HTMLAttributes<HTMLTableCellElement>
}

export interface BodyCellProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  cell: DataTableCell<TData, any>
  /**
   * Position along the inline axis — the column upright, the record when the
   * table is transposed. Not the position among the cells this row happens to
   * render, which under column virtualization is a window. Drives the cell's
   * reported column position.
   */
  columnIndex: number
  /** Set only by the transposed body; see `TransposedRecordState`. */
  record?: TransposedRecordState
}

/**
 * One body cell.
 *
 * Handles the four content modes TanStack can produce — normal, grouped,
 * aggregated and placeholder — plus inline editing and cell-selection state.
 */
export function BodyCell<TData extends RowData>({
  table,
  row,
  cell,
  columnIndex,
  record,
}: BodyCellProps<TData>) {
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
      {...record?.attributes}
      {...userProps}
      className={cx(layout.className, record?.attributes?.className, userProps?.className)}
      style={{
        ...layout.style,
        // Two offsets, not one: a record pinned in the sticky mode is held
        // against both inline edges, which is what lets it keep its place in
        // the order and still never leave the screen. A section record sets
        // only the edge it was lifted to.
        ...(record?.pinStart ? ({ '--rtc-pin-start': record.pinStart } as React.CSSProperties) : {}),
        ...(record?.pinEnd ? ({ '--rtc-pin-end': record.pinEnd } as React.CSSProperties) : {}),
        ...record?.attributes?.style,
        ...userProps?.style,
      }}
      // Stated rather than counted: with the columns virtualized, the cells
      // either side of this one may not be in the DOM at all.
      aria-colindex={columnIndex + 1}
      // The record's own state, which only a transposed table puts here: its
      // column is this cell and every cell above and below it, so each one has
      // to carry what the upright table states once on the row.
      data-rtc-row-id={record ? row.id : undefined}
      data-rtc-parity={record?.parity}
      data-rtc-selected={record?.selected ? 'true' : undefined}
      data-rtc-clickable={record?.clickable ? 'true' : undefined}
      data-rtc-pinned={record?.pinned || layout['data-rtc-pinned']}
      data-rtc-pin-edge={record?.pinEdge ? 'true' : layout['data-rtc-pin-edge']}
      data-rtc-dragging={record?.dragging ? 'true' : undefined}
      data-rtc-drop-target={record?.dropEdge ? 'true' : undefined}
      data-rtc-drop-edge={record?.dropEdge}
      data-rtc-grouped={isGrouped || carriesGroupLabel ? 'true' : undefined}
      data-rtc-cell-selected={isSelected ? 'true' : undefined}
      data-rtc-cell-focused={isFocused ? 'true' : undefined}
      // A selection range is a rectangle in the *model*, and the model's rows
      // run down the record axis. Transposed, the edge towards the previous row
      // is the one facing the previous record — the cell to the left, not the
      // one above — so the four sides turn with the table or the outline is
      // drawn around a rectangle nobody selected.
      data-rtc-cell-edge-top={(record ? edges?.left : edges?.top) ? 'true' : undefined}
      data-rtc-cell-edge-bottom={(record ? edges?.right : edges?.bottom) ? 'true' : undefined}
      data-rtc-cell-edge-left={(record ? edges?.top : edges?.left) ? 'true' : undefined}
      data-rtc-cell-edge-right={(record ? edges?.bottom : edges?.right) ? 'true' : undefined}
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
      // `enableClickToSelect` upright is one handler on the row; transposed the
      // record has no row of its own, so every cell in its column carries it —
      // alongside whatever `rowProps` and `cellProps` put there, in that order.
      // The handler is installed for every transposed cell rather than only the
      // clickable ones, because the explicit prop overrides the spreads above
      // and a record whose `rowProps` returned an `onClick` would otherwise
      // have lost it.
      onClick={
        record
          ? (event) => {
              record.attributes?.onClick?.(event)
              userProps?.onClick?.(event)
              if (record.clickable && !event.defaultPrevented) row.toggleSelected()
            }
          : userProps?.onClick
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
