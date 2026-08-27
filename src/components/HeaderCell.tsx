import type { RowData } from '@tanstack/react-table'

import { ColumnActionsMenu } from './ColumnActionsMenu'
import { ColumnFilterPopover } from './ColumnFilterPopover'
import { useComponents } from './registry'
import { isDisplayColumnId } from '../displayColumns'
import { useDrag } from '../dragContext'
import { resolveLayoutMode } from '../layoutMode'
import { formatMessage } from '../locale'
import { cx, getColumnLabel } from '../utils'
import type { DataTableHeader, DataTableInstance } from '../types'

/**
 * Which columns absorb the space left over once every column has its width.
 *
 * A table is nearly always wider than the sum of its columns, and that surplus
 * has to land somewhere. It must not land on the utility columns: a checkbox,
 * a chevron or a row-actions button is sized for the control it holds, and
 * stretching it to 150px only pushes the data away from the reader. Pinned
 * columns keep their declared width too — their sticky offsets are computed
 * from `getSize()`, so a column that renders wider than it measures would sit
 * at the wrong offset.
 *
 * What is left — the ordinary data columns — shares the surplus.
 */
function columnCanGrow<TData extends RowData>(
  column: DataTableHeader<TData, any>['column'],
  pinned: false | 'start' | 'end',
): boolean {
  return !pinned && !isDisplayColumnId(column.id)
}

/** Sticky-offset and layout attributes shared by header, body and footer cells. */
export function getCellLayoutProps<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableHeader<TData, any>['column'],
  kind: 'head' | 'body' | 'foot',
) {
  const options = table.dataTableOptions
  const pinned = (options.enableColumnPinning ?? false) ? column.getIsPinned() : false
  // The mode the table renders in, not the option: virtualization switches a
  // table to `grid` without the caller naming it, and a cell sized for a
  // semantic table inside a grid one gets no header floor at all.
  const layoutMode = resolveLayoutMode(options)
  const isGrid = layoutMode !== 'semantic'

  let pinOffset: string | undefined
  let isPinEdge = false
  if (pinned === 'start') {
    pinOffset = `${column.getStart('start')}px`
    isPinEdge = table.getStartVisibleLeafColumns().at(-1)?.id === column.id
  } else if (pinned === 'end') {
    pinOffset = `${column.getAfter('end')}px`
    isPinEdge = table.getEndVisibleLeafColumns().at(0)?.id === column.id
  }

  const size = column.getSize()
  // The floor is applied to head, body and footer alike: raising only the
  // header would slide the columns out of alignment in the grid layouts,
  // where each row is its own flex container.
  const minSize = Math.max(column.columnDef.minSize ?? 0, table.headerMinSizes?.[column.id] ?? 0)
  const canGrow = layoutMode !== 'grid-no-grow' && columnCanGrow(column, pinned)

  return {
    'data-rtc-column-id': column.id,
    'data-rtc-pinned': pinned || undefined,
    'data-rtc-pin-edge': isPinEdge ? 'true' : undefined,
    'data-rtc-align': column.columnDef.meta?.align,
    'data-rtc-grow': canGrow ? 'true' : undefined,
    className: cx(kind === 'body' ? 'rtc-td' : 'rtc-th', column.columnDef.meta?.className),
    style: {
      '--rtc-col-size': `${size}px`,
      ...(minSize ? { '--rtc-col-min-size': `${minSize}px` } : {}),
      ...(pinOffset ? { '--rtc-pin-offset': pinOffset } : {}),
      // A semantic table is laid out by the browser, and the browser hands the
      // surplus to the columns that did *not* ask for a width — so the growing
      // columns deliberately declare none. Their `size` reaches the stylesheet
      // as `--rtc-col-size` and is applied there as a floor instead.
      ...(isGrid || canGrow ? {} : { width: size, minWidth: minSize || undefined }),
    } as React.CSSProperties,
  }
}

export function HeaderCell<TData extends RowData>({
  table,
  header,
  colIndex,
}: {
  table: DataTableInstance<TData>
  header: DataTableHeader<TData, any>
  /**
   * Position in the full column order, set only while columns are virtualized.
   * The cells around it may be missing from the DOM, so the position a reader
   * is given has to be stated rather than counted.
   */
  colIndex?: number
}) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const column = header.column
  const drag = useDrag()

  const layout = getCellLayoutProps(table, column, 'head')
  const canSort = (options.enableSorting ?? true) && column.getCanSort()
  const sorted = column.getIsSorted()
  const sortIndex = column.getSortIndex()
  const canResize = (options.enableColumnResizing ?? false) && column.getCanResize()
  const canDrag =
    (options.enableColumnDragging ?? options.enableColumnOrdering ?? false) &&
    !header.isPlaceholder &&
    column.depth === 0
  // Display columns — select, expand, row numbers, actions — have nothing to
  // sort, group, pin or hide, and are sized for one control. Giving them a
  // menu overflowed a 40px cell.
  const showActions =
    (options.enableColumnActions ?? false) && !header.isPlaceholder && !isDisplayColumnId(column.id)

  const filterMode = options.filterDisplayMode ?? 'popover'
  const showFilter =
    (options.enableColumnFilters ?? true) &&
    (filterMode === 'popover' || filterMode === 'popover-and-panel') &&
    !header.isPlaceholder &&
    column.getCanFilter()

  const label = getColumnLabel(column, localization)

  const isDropTarget =
    drag.kind === 'column' && drag.overId === column.id && drag.activeId !== column.id

  const ariaSort: React.AriaAttributes['aria-sort'] = !canSort
    ? undefined
    : sorted === 'asc'
      ? 'ascending'
      : sorted === 'desc'
        ? 'descending'
        : 'none'

  // Sorted state first, since that is what a reader most needs confirmed;
  // otherwise the tooltip promises what the next click will do.
  const sortTooltip = formatMessage(
    sorted === 'asc'
      ? localization.sortedByColumnAsc
      : sorted === 'desc'
        ? localization.sortedByColumnDesc
        : localization.sortByColumnAsc,
    { column: label },
  )

  const userProps = options.headCellProps?.({ table, header, column })

  return (
    <th
      {...layout}
      {...userProps}
      className={cx(layout.className, userProps?.className)}
      style={{ ...layout.style, ...userProps?.style }}
      colSpan={header.colSpan > 1 ? header.colSpan : undefined}
      rowSpan={header.rowSpan > 1 ? header.rowSpan : undefined}
      scope={header.colSpan > 1 ? 'colgroup' : 'col'}
      aria-colindex={colIndex === undefined ? undefined : colIndex + 1}
      aria-sort={ariaSort}
      data-rtc-filtered={column.getIsFiltered() ? 'true' : undefined}
      data-rtc-dragging={drag.kind === 'column' && drag.activeId === column.id ? 'true' : undefined}
      data-rtc-drop-target={isDropTarget ? 'true' : undefined}
      data-rtc-drop-edge={isDropTarget ? drag.overEdge : undefined}
    >
      {header.isPlaceholder ? null : (
        <div className="rtc-th-content">
          {canDrag ? (
            <ui.IconButton
              className="rtc-drag-handle"
              size="sm"
              label={`${localization.grab} ${label}`}
              onPointerDown={(event) => drag.start('column', column.id, event)}
            >
              <ui.Icon name="drag" />
            </ui.IconButton>
          ) : null}

          {canSort ? (
            // The tooltip states the current sort and, when unsorted, what a
            // click will do — the indicator glyph alone cannot say "descending,
            // third key". It went missing when this control moved from a raw
            // `<button title=…>` to the registry, which carries tooltips in a
            // slot of their own rather than as a prop on every control.
            <ui.Tooltip label={sortTooltip}>
              {/* Through the registry, not a raw `<button>`: it sits beside the
                  filter and column-menu buttons, and a header whose controls
                  come half from the host's design system and half from ours
                  reads as a rendering bug. */}
              <ui.Button
                variant="quiet"
                className="rtc-th-sort"
                onClick={column.getToggleSortingHandler() as (event: React.MouseEvent) => void}
              >
                <span className="rtc-th-label">
                  <table.FlexRender header={header} />
                </span>
                <span className="rtc-sort-indicator" data-rtc-active={sorted ? 'true' : undefined}>
                  <ui.Icon
                    name={sorted === 'asc' ? 'sortAsc' : sorted === 'desc' ? 'sortDesc' : 'sortNone'}
                  />
                  {sortIndex > 0 ? <span className="rtc-sort-index">{sortIndex + 1}</span> : null}
                </span>
              </ui.Button>
            </ui.Tooltip>
          ) : (
            <span className="rtc-th-label">
              <table.FlexRender header={header} />
            </span>
          )}

          <span className="rtc-th-spacer" />

          {showFilter ? <ColumnFilterPopover table={table} column={column as never} /> : null}
          {showActions ? <ColumnActionsMenu table={table} column={column as never} /> : null}
        </div>
      )}

      {canResize ? <ColumnResizer table={table} header={header} /> : null}
    </th>
  )
}

/**
 * Resize grip. Exposed as a `separator` so keyboard users can resize with the
 * arrow keys — `getResizeHandler` only covers pointer input.
 *
 * Deliberately not a registry component: it is a bare hit area with no visual
 * identity of its own, and swapping in a design-system button would break the
 * absolute positioning the resize interaction depends on.
 */
function ColumnResizer<TData extends RowData>({
  table,
  header,
}: {
  table: DataTableInstance<TData>
  header: DataTableHeader<TData, any>
}) {
  const { localization } = table.dataTableOptions
  const column = header.column
  const resizeHandler = header.getResizeHandler()

  const nudge = (delta: number) => {
    const next = Math.max(column.columnDef.minSize ?? 20, column.getSize() + delta)
    table.setColumnSizing((old) => ({ ...old, [column.id]: next }))
  }

  return (
    <button
      type="button"
      className="rtc-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={`${localization.resetColumnSize}: ${getColumnLabel(column, localization)}`}
      data-rtc-resizing={column.getIsResizing() ? 'true' : undefined}
      onPointerDown={resizeHandler}
      onDoubleClick={() => column.resetSize()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          nudge(-16)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          nudge(16)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          column.resetSize()
        }
      }}
    />
  )
}
