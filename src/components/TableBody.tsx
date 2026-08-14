import { useLayoutEffect, useState } from 'react'
import type { RowData } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { BodyRow } from './BodyRow'
import { useComponents } from './registry'
import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface TableBodyProps<TData extends RowData> {
  table: DataTableInstance<TData>
  containerRef: React.RefObject<HTMLDivElement | null>
  columnCount: number
}

const DENSITY_ROW_HEIGHT = { compact: 32, comfortable: 44, spacious: 60 } as const

export function TableBody<TData extends RowData>({ table, containerRef, columnCount }: TableBodyProps<TData>) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options

  if (options.isLoadingError) {
    return (
      <tbody className={cx('rtc-tbody', options.classNames?.body)}>
        <tr className="rtc-tr">
          <td className="rtc-td" colSpan={columnCount}>
            <div className="rtc-error" role="alert">
              {options.errorMessage ?? localization.errorLoadingData}
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  // Skeletons only replace the body on a first load; a refresh with data
  // already on screen shows the progress bar instead so rows do not flash.
  if (options.isLoading && !options.showProgressBars && options.data.length === 0) {
    const rowCount = options.skeletonRowCount ?? 5
    return (
      <tbody className={cx('rtc-tbody', options.classNames?.body)} aria-busy="true">
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <tr className="rtc-tr" key={rowIndex}>
            {Array.from({ length: columnCount }, (_, cellIndex) => (
              <td className="rtc-td" key={cellIndex}>
                <ui.Skeleton width={`${50 + ((rowIndex * 7 + cellIndex * 13) % 45)}%`} />
              </td>
            ))}
          </tr>
        ))}
        <tr className="rtc-visually-hidden">
          <td colSpan={columnCount}>{localization.loading}</td>
        </tr>
      </tbody>
    )
  }

  const rows = table.getRenderRows()
  const topRows = (options.enableRowPinning ?? false) ? (table.getTopRows() as Array<DataTableRow<TData>>) : []
  const bottomRows = (options.enableRowPinning ?? false)
    ? (table.getBottomRows() as Array<DataTableRow<TData>>)
    : []
  const pinnedMode = options.rowPinningDisplayMode ?? 'sticky'
  const showPinnedSections = (options.enableRowPinning ?? false) && pinnedMode !== 'sticky'

  if (rows.length === 0 && topRows.length === 0) {
    return (
      <tbody className={cx('rtc-tbody', options.classNames?.body)}>
        <tr className="rtc-tr">
          <td className="rtc-td" colSpan={columnCount}>
            {options.renderEmptyState?.({ table }) ?? (
              <div className="rtc-empty">
                {table.getPreFilteredRowModel().rows.length > 0
                  ? localization.noResultsFound
                  : localization.noRecordsToDisplay}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    )
  }

  if (options.enableRowVirtualization) {
    return (
      <VirtualBody
        table={table}
        rows={rows}
        containerRef={containerRef}
        columnCount={columnCount}
      />
    )
  }

  const showTop = showPinnedSections && (pinnedMode === 'top' || pinnedMode === 'top-and-bottom')
  const showBottom = showPinnedSections && (pinnedMode === 'bottom' || pinnedMode === 'top-and-bottom')

  return (
    <tbody className={cx('rtc-tbody', options.classNames?.body)}>
      {showTop
        ? topRows.map((row, index) => (
            <BodyRow key={`pinned-top-${row.id}`} table={table} row={row} renderIndex={index} />
          ))
        : null}

      {rows.map((row, index) => (
        <BodyRow key={row.id} table={table} row={row} renderIndex={index} />
      ))}

      {showBottom
        ? bottomRows.map((row, index) => (
            <BodyRow key={`pinned-bottom-${row.id}`} table={table} row={row} renderIndex={index} />
          ))
        : null}
    </tbody>
  )
}

/**
 * Windowed body.
 *
 * Rows are absolutely positioned inside a spacer of the full scroll height,
 * which requires the container to have a bounded height — hence the `height`
 * option being documented as mandatory for virtualization.
 */
function VirtualBody<TData extends RowData>({
  table,
  rows,
  containerRef,
  columnCount,
}: {
  table: DataTableInstance<TData>
  rows: Array<DataTableRow<TData>>
  containerRef: React.RefObject<HTMLDivElement | null>
  columnCount: number
}) {
  const options = table.dataTableOptions
  const estimate = DENSITY_ROW_HEIGHT[table.ui.density]

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: options.rowVirtualizerOptions?.estimateSize ?? (() => estimate),
    overscan: options.rowVirtualizerOptions?.overscan ?? 8,
    measureElement:
      typeof window !== 'undefined' && !navigator.userAgent.includes('Firefox')
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  })

  /**
   * One more render, so the virtualizer can see the scroll container.
   *
   * The container is an *ancestor* of this component, and React attaches a
   * host element's ref only after the layout effects of everything inside it
   * have run. On the mount render — and in the layout effect where the
   * virtualizer goes looking for its scroll element — `containerRef.current`
   * is therefore still null. With no element to measure the virtualizer
   * reports a window of zero rows, and nothing ever asks it a second time: a
   * virtualized table renders its full-height spacer and not one row.
   *
   * Until now the render that rescued it came from elsewhere by accident —
   * TanStack's `cellSelection` auto-reset landing just after mount and being
   * forwarded to React as a state change. That reset changes nothing and is no
   * longer forwarded, so the render this needs is asked for here.
   *
   * A layout effect rather than an effect: it runs before paint, so the empty
   * body is never a frame anyone sees.
   */
  const [, setContainerAttached] = useState(false)
  useLayoutEffect(() => {
    setContainerAttached(true)
  }, [])

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  return (
    <tbody
      className={cx('rtc-tbody', options.classNames?.body)}
      style={{ display: 'block', position: 'relative', height: totalSize }}
    >
      {virtualRows.length === 0 ? (
        <tr className="rtc-tr">
          <td className="rtc-td" colSpan={columnCount} />
        </tr>
      ) : null}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index]
        if (!row) return null
        return (
          <BodyRow
            key={row.id}
            table={table}
            row={row}
            renderIndex={virtualRow.index}
            virtualRef={virtualizer.measureElement as (node: HTMLTableRowElement | null) => void}
            virtualStart={virtualRow.start}
            virtualIndex={virtualRow.index}
          />
        )
      })}
    </tbody>
  )
}
