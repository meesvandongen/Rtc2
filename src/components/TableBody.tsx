import type { RowData } from '@tanstack/react-table'

import { BodyRow } from './BodyRow'
import { type BodyItem, getBodyItems } from './bodyItems'
import type { ColumnWindow } from './columnVirtualizer'
import { DetailRow } from './DetailRow'
import { useComponents } from './registry'
import type { RowVirtualizer } from './rowVirtualizer'
import { usesPinnedRowSections } from '../pinnedRows'
import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface TableBodyProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Render order, resolved by the shell so the virtualizer counts the same items. */
  items: Array<BodyItem<TData>>
  /** Null when the table is not virtualized, in which case none was created. */
  rowVirtualizer: RowVirtualizer | null
  /** Null when the columns are not virtualized, for the same reason. */
  columnWindow: ColumnWindow | null
  columnCount: number
}

export function TableBody<TData extends RowData>({
  table,
  items,
  rowVirtualizer,
  columnWindow,
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
    // A placeholder is worth no more than the data it stands in for: the
    // window applies here too, or a 500-column table would mount every
    // skeleton cell of every skeleton row before it had any data at all.
    const skeletonColumns = columnWindow?.indexes ?? Array.from({ length: columnCount }, (_, i) => i)
    return (
      <tbody className={cx('rtc-tbody', options.classNames?.body)} aria-busy="true">
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <tr className="rtc-tr" key={rowIndex} style={columnWindow?.rowStyle}>
            {skeletonColumns.map((cellIndex) => (
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

  // Sections are rendered for whichever direction has rows pinned to it, not
  // for the directions the display mode offers: a row pinned to a direction the
  // mode has no control for — from `initialState`, or from `row.pin()` — is
  // still a pinned row, and leaving it out would drop it from the table
  // altogether, since `getRenderRows` has already taken it out of the body.
  const sections = usesPinnedRowSections(options)
  const topRows = sections ? (table.getTopRows() as Array<DataTableRow<TData>>) : []
  const bottomRows = sections ? (table.getBottomRows() as Array<DataTableRow<TData>>) : []

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
        columnWindow={columnWindow}
      />
    )

  /**
   * Pinned rows, in a `<tbody>` of their own.
   *
   * The section is the sticky element, not its rows: a sticky row can only
   * travel as far as its own parent's box, so rows in a section two rows tall
   * would scroll away with it. The section's parent is the table, which spans
   * the whole scroll range — and one sticky element per section also means the
   * rows inside it stack in flow rather than each needing an offset.
   */
  const renderSection = (position: 'top' | 'bottom', rows: Array<DataTableRow<TData>>) =>
    rows.length === 0 ? null : (
      <tbody
        className={cx('rtc-tbody', options.classNames?.body)}
        data-rtc-pinned-section={position}
      >
        {getBodyItems(table, rows).map((item) => renderItem(item, `pinned-${position}-`))}
      </tbody>
    )

  const body =
    items.length === 0 ? (
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
    ) : rowVirtualizer ? (
      <VirtualBody
        table={table}
        items={items}
        virtualizer={rowVirtualizer}
        columnWindow={columnWindow}
        columnCount={columnCount}
      />
    ) : (
      <tbody className={cx('rtc-tbody', options.classNames?.body)}>
        {items.map((item) => renderItem(item))}
      </tbody>
    )

  return (
    <>
      {renderSection('top', topRows)}
      {body}
      {renderSection('bottom', bottomRows)}
    </>
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
  columnWindow,
  columnCount,
}: {
  table: DataTableInstance<TData>
  items: Array<BodyItem<TData>>
  virtualizer: RowVirtualizer
  columnWindow: ColumnWindow | null
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
            columnWindow={columnWindow}
            virtualRef={measureElement}
            virtualStart={virtualRow.start}
            virtualIndex={virtualRow.index}
          />
        )
      })}
    </tbody>
  )
}
