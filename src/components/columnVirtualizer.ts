import { useCallback, useEffect, useMemo } from 'react'
import type { RowData } from '@tanstack/react-table'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'

import { useDrag } from '../dragContext'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * Columns kept mounted beyond each edge of the viewport.
 *
 * Lower than the row overscan on purpose: a column is a whole cell in every
 * mounted row, so one column of overscan costs as much as a screenful of rows.
 * Three is enough for the browser to have somewhere to scroll to before the
 * next window is committed, and enough that arrow-key navigation always finds
 * a cell to move to.
 */
const DEFAULT_OVERSCAN = 3

/**
 * Which columns every row renders, and where they sit.
 *
 * `indexes` are positions in the leaf-column order — the same order the header
 * groups and `row.getVisibleCells()` come back in — so a consumer looks up its
 * own header or cell by index and does not need the columns themselves.
 */
export interface ColumnWindow {
  /** Ascending positions in the leaf-column order. */
  indexes: number[]
  /**
   * Stands in for the columns left out, so the rendered ones land at the
   * offset they would have had with the whole table in the DOM. Applied to
   * every row that renders the window — header, body and footer alike.
   *
   * Padding on the row rather than the spacer cells other implementations
   * use, so nothing enters the DOM that keyboard navigation, `colSpan` or the
   * stylesheet has to know about. The one thing that buys with it: a row's
   * content box is the window's span, and `position: sticky` clamps a pinned
   * column to its containing block, so a window that described a different
   * scroll offset would let the pins ride along with it. Every window is
   * committed in the same frame as the scroll that asked for it, so this is
   * never a frame that gets painted — but it is why the window has to be
   * derived from the scroll offset rather than chased after it.
   */
  rowStyle: React.CSSProperties
  /** Changes only when the window does; see `WithColumnVirtualizer`. */
  key: string
}

/**
 * Leaf columns in the order they are rendered in.
 *
 * Not `getVisibleLeafColumns()`, which is declaration order: pinning moves
 * columns to the ends of every row (`row.getVisibleCells()`) and of every
 * header group, but leaves that list alone. Virtualizing against the wrong
 * order would hand each cell its neighbour's offset the moment anything is
 * pinned.
 */
function orderedLeafColumns<TData extends RowData>(
  table: DataTableInstance<TData>,
): Array<DataTableColumnInstance<TData, any>> {
  const pinning = table.state.columnPinning
  if (!pinning || (pinning.start.length === 0 && pinning.end.length === 0)) {
    return table.getVisibleLeafColumns() as Array<DataTableColumnInstance<TData, any>>
  }
  return [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ] as Array<DataTableColumnInstance<TData, any>>
}

/**
 * The width the column will actually render at.
 *
 * Every offset in the window is built from these, so it has to be the same
 * number the stylesheet resolves — `getSize()` raised by the column's own
 * `minSize` and by the floor measured from its header, exactly as
 * `getCellLayoutProps` applies them.
 */
function columnWidth<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): number {
  return Math.max(
    column.getSize(),
    column.columnDef.minSize ?? 0,
    table.headerMinSizes?.[column.id] ?? 0,
  )
}

/**
 * Horizontal virtualizer for the columns.
 *
 * The shape is the row virtualizer's, turned on its side, with two differences
 * that come from columns being the axis rows are laid out along:
 *
 * - **Nothing is measured.** A row virtualizer measures rows because their
 *   height is whatever their content makes it; a column's width is a number
 *   the table already knows, so it is estimated exactly and never re-read from
 *   the DOM.
 * - **Some columns cannot be dropped.** A pinned column is sticky — it has to
 *   stay mounted at any scroll offset or its edge of the table goes blank —
 *   and so does the column being dragged, whose pointer handlers live on the
 *   header that would unmount underneath the pointer. `rangeExtractor` adds
 *   them back to whatever the scroll offset asked for.
 */
export function useColumnWindow<TData extends RowData>(
  table: DataTableInstance<TData>,
  containerRef: React.RefObject<HTMLDivElement | null>,
): ColumnWindow {
  const options = table.dataTableOptions
  const drag = useDrag()

  const columns = orderedLeafColumns(table)
  const count = columns.length

  const widths = columns.map((column) => columnWidth(table, column))
  // Sizing changes — a resize, a density switch, a newly measured header
  // floor — do not invalidate the virtualizer's cache on their own.
  const widthKey = widths.join(',')

  // Only pinning that is actually turned on renders as sticky, and only a
  // sticky column has to be force-mounted.
  const pinningEnabled = options.enableColumnPinning ?? false
  const startCount = pinningEnabled ? table.getStartVisibleLeafColumns().length : 0
  const endCount = pinningEnabled ? table.getEndVisibleLeafColumns().length : 0

  const draggingIndex =
    drag.kind === 'column' && drag.activeId
      ? columns.findIndex((column) => column.id === drag.activeId)
      : -1

  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = new Set(defaultRangeExtractor(range))
      // Pinned columns sit at the two ends of the order, which is what makes
      // the padding below computable: the window is always
      // [start pins…, a contiguous run, …end pins].
      for (let index = 0; index < startCount; index++) indexes.add(index)
      for (let index = 0; index < endCount; index++) indexes.add(range.count - 1 - index)
      if (draggingIndex >= 0) indexes.add(draggingIndex)
      return [...indexes]
        .filter((index) => index >= 0 && index < range.count)
        .sort((a, b) => a - b)
    },
    [startCount, endCount, draggingIndex],
  )

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableCellElement>({
    horizontal: true,
    count,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => widths[index] ?? 0,
    overscan: options.columnVirtualizerOptions?.overscan ?? DEFAULT_OVERSCAN,
    rangeExtractor,
    // In RTL the container scrolls the other way, and the virtualizer has to
    // read `scrollLeft` with the sign the browser reports.
    isRtl: options.direction === 'rtl',
  })

  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, widthKey])

  const items = virtualizer.getVirtualItems()

  // What the skipped columns would have occupied. The pinned blocks are
  // stripped off both ends first: they are rendered in flow at the head and
  // tail of the row and only pulled to the viewport edges by `position:
  // sticky`, so the space they take up is not part of the gap.
  let paddingStart = 0
  let paddingEnd = 0
  if (items.length > startCount + endCount) {
    const totalSize = virtualizer.getTotalSize()
    const firstFree = items[startCount]!
    const lastFree = items[items.length - 1 - endCount]!
    const startPinnedWidth = startCount > 0 ? items[startCount - 1]!.end : 0
    const endPinnedWidth = endCount > 0 ? totalSize - items[items.length - endCount]!.start : 0
    paddingStart = Math.max(0, firstFree.start - startPinnedWidth)
    paddingEnd = Math.max(0, totalSize - lastFree.end - endPinnedWidth)
  }

  const indexes = items.map((item) => item.index)
  const key = `${indexes.join(',')}|${paddingStart}|${paddingEnd}`

  // Memoized on `key`, which stands in for `indexes` — a fresh array on every
  // render, but only a different *window* when the key changes. The window
  // reaches every mounted row through `memo`, and a new object on each
  // vertical scroll tick would re-render every cell in the table.
  return useMemo<ColumnWindow>(
    () => ({
      indexes,
      rowStyle: { paddingInlineStart: paddingStart, paddingInlineEnd: paddingEnd },
      key,
    }),
    [key],
  )
}

/**
 * Hosts the column virtualizer one level above the container it measures, for
 * the reason `WithRowVirtualizer` documents: `getScrollElement` has to resolve
 * on the first commit, and React attaches refs bottom-up.
 *
 * It also has to sit *inside* `DragProvider`, since a dragged column is one of
 * the things the window is not allowed to drop.
 */
export function WithColumnVirtualizer<TData extends RowData>({
  table,
  containerRef,
  children,
}: {
  table: DataTableInstance<TData>
  containerRef: React.RefObject<HTMLDivElement | null>
  children: (columnWindow: ColumnWindow) => React.ReactNode
}): React.ReactNode {
  const columnWindow = useColumnWindow(table, containerRef)
  return children(columnWindow)
}

/**
 * Picks the window's entries out of a full-width row of headers or cells.
 *
 * Returned with their index in the full order, which is what a cell needs to
 * report `aria-colindex` and to know whether it is the leading column.
 */
export function windowedEntries<T>(
  entries: T[],
  columnWindow: ColumnWindow | null,
): Array<{ entry: T; index: number }> {
  if (!columnWindow) return entries.map((entry, index) => ({ entry, index }))
  const result: Array<{ entry: T; index: number }> = []
  for (const index of columnWindow.indexes) {
    const entry = entries[index]
    if (entry !== undefined) result.push({ entry, index })
  }
  return result
}
