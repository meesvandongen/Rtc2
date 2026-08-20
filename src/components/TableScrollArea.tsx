import type { RowData } from '@tanstack/react-table'

import { TableBody } from './TableBody'
import { TableFoot } from './TableFoot'
import { TableHead } from './TableHead'
import { type RowVirtualizer, useRowVirtualizer } from './rowVirtualizer'
import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface TableScrollAreaProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Render order, resolved by the shell so the virtualizer counts the same rows. */
  rows: Array<DataTableRow<TData>>
  columnCount: number
  containerRef: React.RefObject<HTMLDivElement | null>
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  showProgress: boolean
}

/**
 * The scroll container and the table inside it.
 *
 * `rowVirtualizer` is null for a table that is not virtualized, so no
 * virtualizer is constructed at all in that case — see
 * `VirtualizedTableScrollArea` for the other half.
 */
function TableScrollArea<TData extends RowData>({
  table,
  rows,
  columnCount,
  containerRef,
  onKeyDown,
  showProgress,
  rowVirtualizer,
}: TableScrollAreaProps<TData> & { rowVirtualizer: RowVirtualizer | null }) {
  const options = table.dataTableOptions

  return (
    <div
      ref={containerRef}
      className={cx('rtc-container', options.classNames?.container)}
      onKeyDown={onKeyDown}
      {...options.containerProps}
    >
      <table
        className={cx('rtc-table', options.classNames?.table)}
        {...options.tableProps}
        aria-rowcount={table.getRowCount() || undefined}
        aria-colcount={columnCount || undefined}
        aria-busy={showProgress || undefined}
      >
        {options.caption || options.renderCaption ? (
          <caption>{options.renderCaption?.({ table }) ?? options.caption}</caption>
        ) : null}

        {(options.enableTableHead ?? true) ? <TableHead table={table} /> : null}

        <TableBody
          table={table}
          rows={rows}
          rowVirtualizer={rowVirtualizer}
          columnCount={columnCount}
        />

        {(options.enableTableFooter ?? true) ? <TableFoot table={table} /> : null}
      </table>
    </div>
  )
}

/**
 * Virtualized variant.
 *
 * The virtualizer is created here, one level above the `ref`ed container it
 * measures: React attaches refs bottom-up, so the container — a descendant
 * host node of this component — is assigned before this component's own
 * layout effect runs, and `getScrollElement` resolves on the first commit.
 * Creating it any lower (in the body that consumes the virtual rows) would
 * read the ref before React had set it.
 */
function VirtualizedTableScrollArea<TData extends RowData>(props: TableScrollAreaProps<TData>) {
  const rowVirtualizer = useRowVirtualizer(props.table, props.containerRef, props.rows.length)
  return <TableScrollArea {...props} rowVirtualizer={rowVirtualizer} />
}

/**
 * Picks the variant for the table's virtualization mode.
 *
 * The two are distinct component types on purpose: it keeps the virtualizer
 * out of the tree entirely when it is not used, at the cost of remounting the
 * scroll container if `enableRowVirtualization` is ever flipped at runtime.
 */
export function DataTableScrollArea<TData extends RowData>(props: TableScrollAreaProps<TData>) {
  return props.table.dataTableOptions.enableRowVirtualization ? (
    <VirtualizedTableScrollArea {...props} />
  ) : (
    <TableScrollArea {...props} rowVirtualizer={null} />
  )
}
