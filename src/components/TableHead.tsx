import type { RowData } from '@tanstack/react-table'

import { HeaderCell } from './HeaderCell'
import { cx } from '../utils'
import type { DataTableInstance } from '../types'

/**
 * The header. Filters no longer live here — a filter row forced every row to
 * the height of its tallest editor, so they moved to per-column popovers and
 * the standalone filter panel.
 */
export function TableHead<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const options = table.dataTableOptions

  return (
    <thead className={cx('rtc-thead', options.classNames?.head)}>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id} className={cx('rtc-tr', options.classNames?.headRow)}>
          {headerGroup.headers.map((header) => (
            <HeaderCell key={header.id} table={table} header={header as never} />
          ))}
        </tr>
      ))}
    </thead>
  )
}
