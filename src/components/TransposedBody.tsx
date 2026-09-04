import { Fragment } from 'react'
import type { RowData } from '@tanstack/react-table'

import { BodyCell, type TransposedRecordState } from './BodyCell'
import { getCellLayoutProps, HeaderCell } from './HeaderCell'
import { useComponents } from './registry'
import { useDrag } from '../dragContext'
import { bandPinOffset, labelPinOffset, recordPinOffset, type TransposedLayout } from '../transpose'
import { cx } from '../utils'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * The whole table, turned on its side.
 *
 * One `<tr>` per column — a *band* — carrying that column's header at the
 * inline start, one cell per record across the middle, and that column's footer
 * at the end. There is no `<thead>` or `<tfoot>` to put anything in: a header
 * that labels a row is a `<th scope="row">` inside the body, which is also what
 * lets a grouped header span bands with a plain `rowSpan`.
 *
 * The cells themselves are the upright ones. `HeaderCell` and `BodyCell` render
 * every content mode the table has — sorting, filters, editors, grouped and
 * aggregated values, copy buttons, cell selection — and none of that changes
 * when the axes swap, so it would be a second implementation to maintain rather
 * than a transposition. What this component owns is the geometry: which cell
 * goes where, what spans what, and which state the record's column has to carry
 * now that it has no row of its own.
 */
export function TransposedBody<TData extends RowData>({
  table,
  layout,
}: {
  table: DataTableInstance<TData>
  /** Resolved by the shell, which sizes the `<table>` from the same numbers. */
  layout: TransposedLayout<TData>
}) {
  const ui = useComponents()
  const drag = useDrag()
  const options = table.dataTableOptions
  const { localization } = options

  const {
    bands,
    headers,
    footers,
    headerLevels,
    footerLevels,
    stickyHead,
    stickyFoot,
    records,
    recordColumns,
    columnCount,
    blockVars,
  } = layout
  const bandCount = bands.length

  const bandPins = resolveBandPins(table)
  const cellsByRecord = records.map((record) => record.row.getVisibleCells())

  const headCells = (band: number) =>
    headers?.byBand[band]?.map((entry) => (
      <HeaderCell
        key={entry.header.id}
        table={table}
        header={entry.header as never}
        transposed={{
          bandSpan: entry.bandSpan,
          levelSpan: entry.levelSpan,
          level: entry.level,
          sticky: stickyHead,
          stickyEdge: entry.level + entry.levelSpan >= headerLevels,
        }}
      />
    ))

  const footCells = (band: number) =>
    footers?.byBand[band]?.map((entry) => {
      const header = entry.header
      const cell = getCellLayoutProps(table, header.column, 'foot')
      // Footer groups arrive leaf-first, so level 0 is the one nearest the
      // records: it is the block's inner edge, and its distance from the
      // trailing edge is the outermost level's, counted back.
      return (
        <th
          {...cell}
          key={header.id}
          className={cx(cell.className, 'rtc-foot-cell', options.classNames?.footCell)}
          rowSpan={entry.bandSpan > 1 ? entry.bandSpan : undefined}
          colSpan={entry.levelSpan > 1 ? entry.levelSpan : undefined}
          scope={entry.bandSpan > 1 ? 'rowgroup' : 'row'}
          aria-colindex={columnCount - footerLevels + entry.level + 1}
          data-rtc-pinned={stickyFoot ? 'end' : undefined}
          data-rtc-pin-edge={stickyFoot && entry.level === 0 ? 'true' : undefined}
          style={
            stickyFoot
              ? ({
                  '--rtc-pin-offset': labelPinOffset(footerLevels - 1 - entry.level),
                } as React.CSSProperties)
              : undefined
          }
        >
          {header.isPlaceholder ? null : <table.FlexRender footer={header as never} />}
        </th>
      )
    })

  /** A band, with whatever the caller asked to put between its header and footer. */
  const band = (index: number, children: React.ReactNode) => {
    const leaf = bands[index]
    if (!leaf) return null
    const column = leaf.column as DataTableColumnInstance<TData, any>
    const pin = bandPins.get(column.id)
    // `columnSizing` is a width upright and a band height here; only an explicit
    // entry counts, so an untouched band keeps the height its density gives it
    // rather than inheriting a column's declared `size` as a height.
    const size = table.state.columnSizing[column.id]
    const isDropTarget =
      drag.kind === 'column' && drag.overId === column.id && drag.activeId !== column.id

    return (
      <tr
        key={leaf.id}
        className={cx('rtc-tr', options.classNames?.bodyRow)}
        style={{
          ...(size ? { height: size } : {}),
          ...(pin ? ({ '--rtc-pinned-row-offset': pin.offset } as React.CSSProperties) : {}),
        }}
        aria-rowindex={index + 1}
        data-rtc-column-id={column.id}
        data-rtc-row-pinned={pin?.edge}
        data-rtc-dragging={
          drag.kind === 'column' && drag.activeId === column.id ? 'true' : undefined
        }
        data-rtc-drop-target={isDropTarget ? 'true' : undefined}
        data-rtc-drop-edge={isDropTarget ? drag.overEdge : undefined}
      >
        {headCells(index)}
        {children}
        {footCells(index)}
      </tr>
    )
  }

  const bodyProps = {
    className: cx('rtc-tbody', options.classNames?.body),
    style: blockVars as React.CSSProperties,
  }

  if (layout.mode === 'error') {
    return (
      <tbody {...bodyProps}>
        <tr className="rtc-tr">
          <td className="rtc-td" colSpan={Math.max(1, columnCount)}>
            <div className="rtc-error" role="alert">
              {options.errorMessage ?? localization.errorLoadingData}
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  // A placeholder record is a placeholder *column*, so `skeletonRowCount` reads
  // across rather than down — it still means "how many records are being stood
  // in for", which is the number that matters.
  if (layout.mode === 'loading') {
    return (
      <tbody {...bodyProps} aria-busy="true">
        {bands.map((_, index) =>
          band(
            index,
            Array.from({ length: layout.skeletonCount }, (_, record) => (
              <td className="rtc-td" key={record}>
                <ui.Skeleton width={`${50 + ((index * 7 + record * 13) % 45)}%`} />
              </td>
            )),
          ),
        )}
        <tr className="rtc-visually-hidden">
          <td colSpan={Math.max(1, columnCount)}>{localization.loading}</td>
        </tr>
      </tbody>
    )
  }

  if (layout.mode === 'empty') {
    const message = options.renderEmptyState?.({ table }) ?? (
      <div className="rtc-empty">
        {table.getPreFilteredRowModel().rows.length > 0
          ? localization.noResultsFound
          : localization.noRecordsToDisplay}
      </div>
    )
    // With the label block on screen the fields still say what the table is
    // about, so the message goes where the records would have been, spanning
    // every band. With no label block there is nothing to keep, and the empty
    // state is the only row.
    if (!headers || bandCount === 0) {
      return (
        <tbody {...bodyProps}>
          <tr className="rtc-tr">
            <td className="rtc-td rtc-transposed-empty" colSpan={Math.max(1, columnCount)}>
              {message}
            </td>
          </tr>
        </tbody>
      )
    }
    return (
      <tbody {...bodyProps}>
        {bands.map((_, index) =>
          band(
            index,
            index === 0 ? (
              <td className="rtc-td rtc-transposed-empty" rowSpan={bandCount}>
                {message}
              </td>
            ) : null,
          ),
        )}
      </tbody>
    )
  }

  return (
    <tbody {...bodyProps}>
      {bands.map((_, index) =>
        band(
          index,
          records.map((record, position) => {
            const cell = cellsByRecord[position]?.[index]
            if (!cell) return null
            const row = record.row
            const state: TransposedRecordState = {
              parity: record.index % 2 === 0 ? 'odd' : 'even',
              selected: !!table.state.rowSelection[row.id],
              pinned: record.pinned,
              ...(record.pinned
                ? { pinOffset: recordPinOffset(record.pinIndex, record.pinned) }
                : {}),
              pinEdge: record.pinEdge,
              clickable: !!options.enableClickToSelect && row.getCanSelect(),
              dragging: drag.kind === 'row' && drag.activeId === row.id,
              ...(drag.kind === 'row' && drag.overId === row.id && drag.activeId !== row.id
                ? { dropEdge: drag.overEdge }
                : {}),
              // `rowProps` describes a record, and a record here is a column:
              // the closest thing to "the row's element" is every cell of it.
              // The cast is the element type in the slot's own signature, which
              // names the `<tr>` a transposed record does not have.
              attributes: options.rowProps?.({ table, row }) as
                | React.HTMLAttributes<HTMLTableCellElement>
                | undefined,
            }
            return (
              <Fragment key={row.id}>
                <BodyCell
                  table={table}
                  row={row}
                  cell={cell as never}
                  columnIndex={recordColumns[position]!}
                  record={state}
                />
                {index === 0 && record.hasDetail ? (
                  <td
                    className="rtc-td rtc-detail-cell"
                    rowSpan={bandCount}
                    data-rtc-detail-for={row.id}
                  >
                    <div className="rtc-detail-content">
                      {options.renderDetailPanel?.({ table, row })}
                    </div>
                  </td>
                ) : null}
              </Fragment>
            )
          }),
        ),
      )}
    </tbody>
  )
}

/**
 * Which bands are stuck to the top and bottom, and how far in.
 *
 * Column pinning already moves a pinned column to one end of the leaf order, so
 * the pinned bands are the first and last rows of the body and their offsets
 * are a straight count of the bands between them and their edge.
 */
function resolveBandPins<TData extends RowData>(
  table: DataTableInstance<TData>,
): Map<string, { edge: 'top' | 'bottom'; offset: string }> {
  const pins = new Map<string, { edge: 'top' | 'bottom'; offset: string }>()
  if (!(table.dataTableOptions.enableColumnPinning ?? false)) return pins

  const start = table.getStartVisibleLeafColumns()
  const end = table.getEndVisibleLeafColumns()
  start.forEach((column, index) => pins.set(column.id, { edge: 'top', offset: bandPinOffset(index) }))
  end.forEach((column, index) =>
    pins.set(column.id, { edge: 'bottom', offset: bandPinOffset(end.length - 1 - index) }),
  )
  return pins
}
