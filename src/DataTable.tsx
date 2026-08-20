import { useCallback, useEffect, useRef } from 'react'
import type { RowData } from '@tanstack/react-table'

import { defaultComponents } from './components/defaultComponents'
import { EditRowDialog } from './components/EditRowDialog'
import { DataTableFilterDrawer } from './components/FilterDrawer'
import { DataTableFilterPanel } from './components/FilterPanel'
import { DataTableComponentsProvider, useComponents } from './components/registry'
import { DataTableScrollArea } from './components/TableScrollArea'
import { BottomToolbar, TopToolbar } from './components/Toolbar'
import { DragProvider, type DropEdge } from './dragContext'
import { usesFilterDrawer } from './responsive'
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

  // The render order is resolved here so the virtualizer and the body agree
  // on which rows they are counting.
  const rows = table.getRenderRows()

  // Virtualization positions rows absolutely, which the browser's native table
  // layout cannot do; fall back to the grid layout automatically.
  const layoutMode = options.layoutMode ?? (options.enableRowVirtualization ? 'grid' : 'semantic')

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
      const cellIndex = Array.from(row?.children ?? []).indexOf(target)
      const rows = Array.from(
        containerRef.current?.querySelectorAll<HTMLTableRowElement>('tbody > tr') ?? [],
      )
      const rowIndex = row ? rows.indexOf(row as HTMLTableRowElement) : -1
      if (rowIndex === -1) return

      const nextRow = rows[rowIndex + delta[0]]
      const nextCell = nextRow?.children[cellIndex + delta[1]] as HTMLElement | undefined
      nextCell?.focus()
    },
    [options.enableKeyboardNavigation],
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

  return (
    <DragProvider
      onDropColumn={handleDropColumn}
      onDropRow={handleDropRow}
      onDropColumnOnGrouping={handleDropColumnOnGrouping}
    >
      <div
        className={cx('rtc-root', options.className, options.classNames?.root)}
        dir={options.direction ?? 'ltr'}
        data-rtc-density={table.ui.density}
        data-rtc-layout={layoutMode}
        data-rtc-header-fit={(options.enableHeaderContentFit ?? true) ? undefined : 'clip'}
        data-rtc-cell-selection={(options.enableCellSelection ?? false) ? 'true' : undefined}
        data-rtc-fullscreen={table.ui.isFullScreen ? 'true' : undefined}
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

          <DataTableScrollArea
            table={table}
            rows={rows}
            columnCount={columnCount}
            containerRef={containerRef}
            onKeyDown={onKeyDown}
            showProgress={showProgress}
          />

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
