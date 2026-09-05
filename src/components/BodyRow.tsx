import type { RowData } from '@tanstack/react-table'
import { memo } from 'react'
import { Subscribe } from '@tanstack/react-table'

import { BodyCell } from './BodyCell'
import { type ColumnWindow, windowedEntries } from './columnVirtualizer'
import { useDrag } from '../dragContext'
import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface BodyRowProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  /** Position within the rendered rows, used for zebra striping. */
  renderIndex: number
  /**
   * Which columns to render, when they are virtualized. Referentially stable
   * while the window holds still, so scrolling *vertically* does not re-render
   * every row through `memo`.
   */
  columnWindow?: ColumnWindow | null
  /** Virtualization: measured by the row virtualizer. */
  virtualRef?: (node: HTMLTableRowElement | null) => void
  virtualStart?: number
  /** Required by `virtualizer.measureElement`, which reads `data-index`. */
  virtualIndex?: number
}

function BodyRowImpl<TData extends RowData>({
  table,
  row,
  renderIndex,
  columnWindow,
  virtualRef,
  virtualStart,
  virtualIndex,
}: BodyRowProps<TData>) {
  const options = table.dataTableOptions
  const drag = useDrag()
  const cells = row.getVisibleCells()
  const pinned = (options.enableRowPinning ?? false) ? row.getIsPinned() : false

  const userProps = options.rowProps?.({ table, row })

  const clickable = !!options.enableClickToSelect && row.getCanSelect()

  const isDropTarget = drag.kind === 'row' && drag.overId === row.id && drag.activeId !== row.id

  return (
    <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => !!selection[row.id]}>
      {(selected) => (
        <tr
          ref={virtualRef}
          {...userProps}
          className={cx('rtc-tr', options.classNames?.bodyRow, userProps?.className)}
          style={{
            // Holds open the space of the columns outside the window, so the
            // ones this row does render land where they would have anyway.
            ...columnWindow?.rowStyle,
            // `top: 0` rather than leaving it `auto`, which resolves to the
            // static position: a row would then be offset by whatever precedes
            // it in the body's flow, and the body is meant to hold nothing but
            // out-of-flow rows. Anything that does end up in it — a detail
            // panel that lost its positioning, say — would push the rows after
            // it down with no sign of where the offset came from.
            ...(virtualStart !== undefined
              ? { transform: `translateY(${virtualStart}px)`, position: 'absolute', top: 0, width: '100%' }
              : {}),
            ...userProps?.style,
          }}
          data-index={virtualIndex}
          data-rtc-row-id={row.id}
          data-rtc-parity={renderIndex % 2 === 0 ? 'odd' : 'even'}
          data-rtc-selected={selected ? 'true' : undefined}
          data-rtc-row-pinned={pinned || undefined}
          data-rtc-depth={row.depth > 0 ? row.depth : undefined}
          data-rtc-clickable={clickable ? 'true' : undefined}
          data-rtc-dragging={drag.kind === 'row' && drag.activeId === row.id ? 'true' : undefined}
          data-rtc-drop-target={isDropTarget ? 'true' : undefined}
          data-rtc-drop-edge={isDropTarget ? drag.overEdge : undefined}
          aria-selected={options.enableRowSelection ? selected : undefined}
          onClick={
            clickable
              ? (event) => {
                  userProps?.onClick?.(event)
                  if (!event.defaultPrevented) row.toggleSelected()
                }
              : userProps?.onClick
          }
        >
          {windowedEntries(cells, columnWindow ?? null).map(({ entry: cell, index }) => (
            <BodyCell
              key={cell.id}
              table={table}
              row={row}
              cell={cell as never}
              columnIndex={index}
            />
          ))}
        </tr>
      )}
    </Subscribe>
  )
}

export const BodyRow = memo(BodyRowImpl) as typeof BodyRowImpl
