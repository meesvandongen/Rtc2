import type { RowData } from '@tanstack/react-table'
import { memo } from 'react'
import { Subscribe } from '@tanstack/react-table'

import { BodyCell } from './BodyCell'
import { useDrag } from '../dragContext'
import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface BodyRowProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  /** Position within the rendered rows, used for zebra striping. */
  renderIndex: number
  /** Sticky offset for pinned rows, in pixels. */
  pinnedOffset?: number
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
  pinnedOffset,
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

  return (
    <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => !!selection[row.id]}>
      {(selected) => (
        <>
          <tr
            ref={virtualRef}
            {...userProps}
            className={cx('rtc-tr', options.classNames?.bodyRow, userProps?.className)}
            style={{
              ...(virtualStart !== undefined
                ? { transform: `translateY(${virtualStart}px)`, position: 'absolute', width: '100%' }
                : {}),
              ...(pinnedOffset !== undefined
                ? ({ '--rtc-pinned-row-offset': `${pinnedOffset}px` } as React.CSSProperties)
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
            data-rtc-drop-target={
              drag.kind === 'row' && drag.overId === row.id && drag.activeId !== row.id
                ? 'true'
                : undefined
            }
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
            {cells.map((cell, index) => (
              <BodyCell
                key={cell.id}
                table={table}
                row={row}
                cell={cell as never}
                columnIndex={index}
              />
            ))}
          </tr>

          {options.renderDetailPanel && row.getIsExpanded() ? (
            <tr className={cx('rtc-tr', 'rtc-detail-row')} data-rtc-detail-for={row.id}>
              <td className="rtc-td" colSpan={cells.length}>
                <div className="rtc-detail-content">{options.renderDetailPanel({ table, row })}</div>
              </td>
            </tr>
          ) : null}
        </>
      )}
    </Subscribe>
  )
}

export const BodyRow = memo(BodyRowImpl) as typeof BodyRowImpl
