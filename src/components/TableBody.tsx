import type { RowData } from '@tanstack/react-table'

import { BodyRow } from './BodyRow'
import { type BodyItem, getBodyItems } from './bodyItems'
import { DetailRow } from './DetailRow'
import { useComponents } from './registry'
import type { RowVirtualizer } from './rowVirtualizer'
import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface TableBodyProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Render order, resolved by the shell so the virtualizer counts the same items. */
  items: Array<BodyItem<TData>>
  /** Null when the table is not virtualized, in which case none was created. */
  rowVirtualizer: RowVirtualizer | null
  columnCount: number
}

export function TableBody<TData extends RowData>({
  table,
  items,
  rowVirtualizer,
  columnCount,
}: TableBodyProps<TData>) {
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

  const topRows = (options.enableRowPinning ?? false) ? (table.getTopRows() as Array<DataTableRow<TData>>) : []
  const bottomRows = (options.enableRowPinning ?? false)
    ? (table.getBottomRows() as Array<DataTableRow<TData>>)
    : []
  const pinnedMode = options.rowPinningDisplayMode ?? 'sticky'
  const showPinnedSections = (options.enableRowPinning ?? false) && pinnedMode !== 'sticky'

  if (items.length === 0 && topRows.length === 0) {
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

  if (rowVirtualizer) {
    return (
      <VirtualBody
        table={table}
        items={items}
        virtualizer={rowVirtualizer}
        columnCount={columnCount}
      />
    )
  }

  const showTop = showPinnedSections && (pinnedMode === 'top' || pinnedMode === 'top-and-bottom')
  const showBottom = showPinnedSections && (pinnedMode === 'bottom' || pinnedMode === 'top-and-bottom')

  // A pinned section renders the same rows the body would, so its keys are
  // prefixed to stay unique against the rows still in the main list.
  const renderItem = (item: BodyItem<TData>, keyPrefix = '') =>
    item.kind === 'detail' ? (
      <DetailRow
        key={`${keyPrefix}detail-${item.row.id}`}
        table={table}
        row={item.row}
        columnCount={columnCount}
      />
    ) : (
      <BodyRow
        key={`${keyPrefix}${item.row.id}`}
        table={table}
        row={item.row}
        renderIndex={item.rowIndex}
      />
    )

  return (
    <tbody className={cx('rtc-tbody', options.classNames?.body)}>
      {showTop
        ? getBodyItems(table, topRows).map((item) => renderItem(item, 'pinned-top-'))
        : null}

      {items.map((item) => renderItem(item))}

      {showBottom
        ? getBodyItems(table, bottomRows).map((item) => renderItem(item, 'pinned-bottom-'))
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
  items,
  virtualizer,
  columnCount,
}: {
  table: DataTableInstance<TData>
  items: Array<BodyItem<TData>>
  virtualizer: RowVirtualizer
  columnCount: number
}) {
  const options = table.dataTableOptions

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const measureElement = virtualizer.measureElement as (node: HTMLTableRowElement | null) => void

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
        const item = items[virtualRow.index]
        if (!item) return null
        if (item.kind === 'detail') {
          return (
            <DetailRow
              key={`detail-${item.row.id}`}
              table={table}
              row={item.row}
              columnCount={columnCount}
              virtualRef={measureElement}
              virtualStart={virtualRow.start}
              virtualIndex={virtualRow.index}
            />
          )
        }
        return (
          <BodyRow
            key={item.row.id}
            table={table}
            row={item.row}
            renderIndex={item.rowIndex}
            virtualRef={measureElement}
            virtualStart={virtualRow.start}
            virtualIndex={virtualRow.index}
          />
        )
      })}
    </tbody>
  )
}
