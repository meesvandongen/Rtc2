import { useCallback, useEffect, useRef } from 'react'
import type { RowData } from '@tanstack/react-table'

import { getBodyItems } from './components/bodyItems'
import { type ColumnWindow, WithColumnVirtualizer } from './components/columnVirtualizer'
import { defaultComponents } from './components/defaultComponents'
import { EditRowDialog } from './components/EditRowDialog'
import { DataTableFilterDrawer } from './components/FilterDrawer'
import { DataTableFilterPanel } from './components/FilterPanel'
import { DataTableComponentsProvider, useComponents } from './components/registry'
import { type RowVirtualizer, WithRowVirtualizer } from './components/rowVirtualizer'
import { TableBody } from './components/TableBody'
import { TableFoot } from './components/TableFoot'
import { TableHead } from './components/TableHead'
import { BottomToolbar, TopToolbar } from './components/Toolbar'
import { TransposedBody } from './components/TransposedBody'
import { WithTransposedWindows } from './components/transposedVirtualizer'
import { DragProvider, type DropEdge } from './dragContext'
import { resolveLayoutMode } from './layoutMode'
import { usesFilterDrawer } from './responsive'
import { transposedLayout, type TransposedLayout, type TransposedPlan } from './transpose'
import { cx, moveItem, toCssSize } from './utils'
import { useDataTable } from './useDataTable'
import type { DataTableInstance, DataTableOptions } from './types'

export type DataTableProps<TData extends RowData> =
  | (DataTableOptions<TData> & { table?: never })
  /** Pre-built instance from `useDataTable`, for reading state outside the table. */
  | { table: DataTableInstance<TData> }

/**
 * A fully-featured, CSS-variable-themable data table.
 *
 * Pass options directly for the common case, or build the instance yourself
 * with `useDataTable` and hand it over as `table` when the surrounding page
 * needs to read or drive table state.
 */
export function DataTable<TData extends RowData>(props: DataTableProps<TData>) {
  if ('table' in props && props.table) {
    return <DataTableView table={props.table} />
  }
  return <DataTableWithOwnInstance {...(props as DataTableOptions<TData>)} />
}

function DataTableWithOwnInstance<TData extends RowData>(options: DataTableOptions<TData>) {
  const table = useDataTable(options)
  return <DataTableView table={table} />
}

function DataTableView<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  return (
    <DataTableComponentsProvider
      base={defaultComponents}
      components={table.dataTableOptions.components}
    >
      <DataTableShell table={table} />
    </DataTableComponentsProvider>
  )
}

function DataTableShell<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * Which way round the table is.
   *
   * Transposed, a column is a row and a record is a column — see `transpose.ts`
   * — so the two things that read the axes most directly, the layout mode and
   * the virtualizers, both have to be told which axis they are on.
   */
  const transposed = table.ui.transposed
  // Resolved here rather than inside the body, because the `<table>` is sized
  // and its `<colgroup>` written from the same numbers — see `transposedLayout`.
  const transposedLayoutData = transposed ? transposedLayout(table) : null

  // The render order is resolved here so the virtualizer and the body agree
  // on what they are counting — rows plus any open detail panels, each of
  // which the virtualizer positions and measures as an item of its own. The
  // transposed body has its own order, and lays panels out beside their record
  // rather than as items in a single list.
  const items = transposed ? [] : getBodyItems(table, table.getRenderRows())

  // Virtualization positions rows absolutely and offsets columns by an exact
  // number of pixels, neither of which the browser's native table layout can
  // do; `resolveLayoutMode` falls back to the grid layout automatically. It is
  // shared with the header cells and the header-fit measurement, which have to
  // size themselves for the mode the table actually renders in.
  const layoutMode = resolveLayoutMode(options, transposed)

  const singleHeaderRow = table.getHeaderGroups().length === 1

  /**
   * Both options still window the thing they name; transposed, that thing is on
   * the other axis. Records run across there and columns run down, so the
   * *record* window is the horizontal one and the *band* window the vertical
   * one — the two virtualizers have swapped places, not stood down.
   *
   * Upright, both need one of the grid layout modes, since a window is held
   * open by absolute positioning and by padding on a row, and the browser's
   * table algorithm honours neither. Transposed the window is held open by
   * spacers instead, which a real table understands — and which is what keeps
   * the `rowSpan` that grouped headers and detail panels are built on.
   */
  const virtualizeRows = options.enableRowVirtualization ?? false

  /**
   * Column virtualization needs two things the option alone cannot promise.
   *
   * The grid layout modes are the ones where the component resolves every
   * column width itself, and the window's padding is computed from those same
   * widths — under the browser's table algorithm the padding would be handed
   * to columns that then resize around it. And a window over the *leaf*
   * columns says nothing about a header that spans several of them, so a table
   * with grouped headers renders all of its columns rather than a misaligned
   * subset.
   *
   * Transposed only the second applies, and it applies twice over: a grouped
   * header spans bands, and so does a detail panel — both are `rowSpan`s over
   * the whole band order, and a window that dropped some of them would have no
   * span left to give. The records are windowed either way.
   */
  const virtualizeColumns =
    (options.enableColumnVirtualization ?? false) &&
    (transposed || layoutMode !== 'semantic') &&
    singleHeaderRow &&
    !(transposed && options.renderDetailPanel)

  const showTopToolbar = (options.enableToolbar ?? true) && (options.enableTopToolbar ?? true)
  const showBottomToolbar = (options.enableToolbar ?? true) && (options.enableBottomToolbar ?? true)

  const columnCount = table.getVisibleLeafColumns().length

  const borders = options.enableBorders ?? 'horizontal'
  const bordersValue = borders === true ? 'all' : borders === false ? 'none' : borders

  const filterMode = options.filterDisplayMode ?? 'popover'
  // Below the mobile breakpoint the panel is a modal sheet instead: there is
  // no room to dock 280px of controls beside the rows.
  const filterDrawer = usesFilterDrawer(table)
  const showPanel =
    (options.enableColumnFilters ?? true) &&
    (filterMode === 'panel' || filterMode === 'popover-and-panel') &&
    !filterDrawer &&
    table.ui.showFilterPanel
  const panelPosition = options.filterPanelPosition ?? 'end'

  const handleDropColumn = useCallback(
    (activeId: string, overId: string, edge: DropEdge) => {
      const order = table.getAllLeafColumns().map((column) => column.id)
      const currentOrder = table.state.columnOrder.length > 0 ? table.state.columnOrder : order
      table.setColumnOrder(moveItem(currentOrder, activeId, overId, edge))
    },
    [table],
  )

  const handleDropRow = useCallback(
    (activeId: string, overId: string, edge: DropEdge) => {
      table.setRowOrder((order) => moveItem(order, activeId, overId, edge))
    },
    [table],
  )

  const handleDropColumnOnGrouping = useCallback(
    (columnId: string) => {
      const column = table.getColumn(columnId)
      if (column?.getCanGroup() && !column.getIsGrouped()) column.toggleGrouping()
    },
    [table],
  )

  // Keyboard grid navigation over cells, gated behind `enableKeyboardNavigation`
  // so it never competes with a consumer's own key handling.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!options.enableKeyboardNavigation) return
      const target = event.target as HTMLElement
      if (!target.matches('td.rtc-td')) return

      const deltas: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }
      const delta = deltas[event.key]
      if (!delta) return

      event.preventDefault()
      const row = target.closest('tr')
      const rows = Array.from(
        containerRef.current?.querySelectorAll<HTMLTableRowElement>('tbody > tr') ?? [],
      )
      const rowIndex = row ? rows.indexOf(row as HTMLTableRowElement) : -1
      if (rowIndex === -1) return

      // Transposed, a band leads with its header cells and a grouped header
      // spans several bands, so two rows of the body do not hold their record
      // cells at the same DOM index. `aria-colindex` is the position the table
      // states rather than the one the DOM happens to have, and it is the same
      // number on every band — which is exactly what moving between them needs.
      if (transposed) {
        const column = Number(target.getAttribute('aria-colindex'))
        if (!column) return
        const nextRow = rows[rowIndex + delta[0]]
        const next = nextRow?.querySelector<HTMLElement>(
          `td.rtc-td[aria-colindex="${column + delta[1]}"]`,
        )
        next?.focus()
        return
      }

      const cellIndex = Array.from(row?.children ?? []).indexOf(target)
      const nextRow = rows[rowIndex + delta[0]]
      const nextCell = nextRow?.children[cellIndex + delta[1]] as HTMLElement | undefined
      nextCell?.focus()
    },
    [options.enableKeyboardNavigation, transposed],
  )

  // Prevent background scroll while the table owns the viewport.
  useEffect(() => {
    if (!table.ui.isFullScreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [table.ui.isFullScreen])

  const showProgress = !!options.isLoading || !!options.isSaving

  // Defined once and rendered through however many virtualizers the table
  // asked for: each owns its virtualizer above the container it measures, and
  // a table that does not virtualize builds neither and is handed nulls.
  const renderScrollArea = (
    rowVirtualizer: RowVirtualizer | null,
    columnWindow: ColumnWindow | null,
    transposedPlan: TransposedPlan<TData> | null,
    measureBand?: (node: HTMLTableRowElement | null) => void,
  ) => (
    <div
      ref={containerRef}
      className={cx('rtc-container', options.classNames?.container)}
      onKeyDown={onKeyDown}
      {...options.containerProps}
    >
      <table
        className={cx('rtc-table', options.classNames?.table)}
        {...options.tableProps}
        // `table-layout: fixed` only applies to a table whose own width is a
        // definite length; asked for `max-content` the browser falls back to
        // the automatic algorithm and sizes every column from its content,
        // which is exactly what the transposed layout is not allowed to do.
        style={
          transposedPlan
            ? { width: transposedPlan.width, ...options.tableProps?.style }
            : options.tableProps?.style
        }
        // Both counts follow the axes: transposed there is one row per column
        // and one column per record, and a reader told otherwise would be given
        // the table's dimensions the wrong way round. Both are the *whole*
        // table's, windowed or not — a window is not something a reader is
        // meant to be told about.
        aria-rowcount={(transposed ? columnCount : table.getRowCount()) || undefined}
        aria-colcount={(transposed ? table.getRowCount() : columnCount) || undefined}
        aria-busy={showProgress || undefined}
      >
        {options.caption || options.renderCaption ? (
          <caption>{options.renderCaption?.({ table }) ?? options.caption}</caption>
        ) : null}

        {transposedPlan ? (
          <>
            {/* Column widths, stated where the rows cannot state them: under a
                band window the first row is a spacer, and `table-layout: fixed`
                would take every column's width from that one wide cell. */}
            <colgroup>
              {transposedPlan.colWidths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
            <TransposedBody table={table} plan={transposedPlan} measureBand={measureBand} />
          </>
        ) : (
          <>
            {(options.enableTableHead ?? true) ? (
              <TableHead table={table} columnWindow={columnWindow} />
            ) : null}

            <TableBody
              table={table}
              items={items}
              rowVirtualizer={rowVirtualizer}
              columnWindow={columnWindow}
              columnCount={columnCount}
            />

            {(options.enableTableFooter ?? true) ? (
              <TableFoot table={table} columnWindow={columnWindow} />
            ) : null}
          </>
        )}
      </table>
    </div>
  )

  /** The row virtualizer nests inside the column one; both are optional. */
  const renderBody = (columnWindow: ColumnWindow | null) =>
    virtualizeRows ? (
      <WithRowVirtualizer table={table} containerRef={containerRef} count={items.length}>
        {(rowVirtualizer) => renderScrollArea(rowVirtualizer, columnWindow, null)}
      </WithRowVirtualizer>
    ) : (
      renderScrollArea(null, columnWindow, null)
    )

  /**
   * Transposed, one component owns both windows: they share a container, and
   * the plan they produce decides the `<colgroup>` as well as the body.
   */
  const renderTransposedBody = (layout: TransposedLayout<TData>) => (
    <WithTransposedWindows
      table={table}
      containerRef={containerRef}
      layout={layout}
      virtualizeBands={virtualizeColumns}
      virtualizeRecords={virtualizeRows}
    >
      {(plan, measureBand) => renderScrollArea(null, null, plan, measureBand)}
    </WithTransposedWindows>
  )

  return (
    <DragProvider
      onDropColumn={handleDropColumn}
      onDropRow={handleDropRow}
      onDropColumnOnGrouping={handleDropColumnOnGrouping}
      transposed={transposed}
    >
      <div
        className={cx('rtc-root', options.className, options.classNames?.root)}
        dir={options.direction ?? 'ltr'}
        data-rtc-density={table.ui.density}
        data-rtc-layout={layoutMode}
        data-rtc-transposed={transposed ? 'true' : undefined}
        data-rtc-header-fit={(options.enableHeaderContentFit ?? true) ? undefined : 'clip'}
        data-rtc-cell-selection={(options.enableCellSelection ?? false) ? 'true' : undefined}
        data-rtc-fullscreen={table.ui.isFullScreen ? 'true' : undefined}
        /* Report whether each option was honoured: column virtualization is
           declined for an upright semantic layout, and for a grouped header
           whichever way round the table is. */
        data-rtc-row-virtual={virtualizeRows ? 'true' : undefined}
        data-rtc-column-virtual={virtualizeColumns ? 'true' : undefined}
        data-rtc-sticky-header={(options.enableStickyHeader ?? false) ? 'true' : undefined}
        data-rtc-sticky-footer={(options.enableStickyFooter ?? false) ? 'true' : undefined}
        data-rtc-stripes={(options.enableStripes ?? false) ? 'true' : undefined}
        data-rtc-hover={(options.enableRowHover ?? true) ? 'true' : undefined}
        data-rtc-borders={bordersValue}
        style={{
          ...(options.cssVars as React.CSSProperties),
          ...(table.ui.isFullScreen
            ? {}
            : { height: toCssSize(options.height), maxHeight: toCssSize(options.maxHeight) }),
          ...options.style,
        }}
      >
        {showProgress ? <ui.ProgressBar label={options.localization.loading} /> : null}

        {showTopToolbar ? <TopToolbar table={table} /> : null}

        {/* The panel sits beside the scroll container, not inside it, so it
            stays put while the table scrolls and can scroll independently. */}
        <div className="rtc-body-area" data-rtc-panel={showPanel ? panelPosition : undefined}>
          {showPanel && panelPosition === 'start' ? (
            <DataTableFilterPanel table={table} className="rtc-filter-panel-docked" />
          ) : null}

          {/* Every virtualizer is created above the container it measures and
              below `DragProvider`, whose state decides which columns the
              window is not allowed to drop. */}
          {transposedLayoutData ? (
            renderTransposedBody(transposedLayoutData)
          ) : virtualizeColumns ? (
            <WithColumnVirtualizer table={table} containerRef={containerRef}>
              {(columnWindow) => renderBody(columnWindow)}
            </WithColumnVirtualizer>
          ) : (
            renderBody(null)
          )}

          {showPanel && panelPosition === 'end' ? (
            <DataTableFilterPanel table={table} className="rtc-filter-panel-docked" />
          ) : null}
        </div>

        {showBottomToolbar ? <BottomToolbar table={table} /> : null}

        {/* Inside the root, not beside it: the sheet is lifted into the top
            layer either way, and a descendant inherits `cssVars`, the theme
            attribute and the density the table was given. */}
        {filterDrawer ? <DataTableFilterDrawer table={table} /> : null}
      </div>

      <EditRowDialog table={table} />
    </DragProvider>
  )
}
