import { useRef } from 'react'
import type { RowData } from '@tanstack/react-table'

import { type ColumnWindow, windowedEntries } from './columnVirtualizer'
import { HeaderCell } from './HeaderCell'
import { useHeaderContentFit } from '../headerFit'
import { cx } from '../utils'
import type { DataTableInstance } from '../types'

/**
 * The header. Filters no longer live here — a filter row forced every row to
 * the height of its tallest editor, so they moved to per-column popovers and
 * the standalone filter panel.
 */
export function TableHead<TData extends RowData>({
  table,
  columnWindow,
}: {
  table: DataTableInstance<TData>
  /** Set only when columns are virtualized; see `columnVirtualizer`. */
  columnWindow?: ColumnWindow | null
}) {
  const options = table.dataTableOptions
  const headRef = useRef<HTMLTableSectionElement>(null)
  // Measured floors are read back through `table.headerMinSizes` by
  // `getCellLayoutProps`, so body and footer cells stay in step. The window is
  // handed over because a header can only be measured while it is mounted:
  // scrolling sideways brings columns in that have never been measured.
  useHeaderContentFit(table, headRef, columnWindow?.key)

  return (
    <thead ref={headRef} className={cx('rtc-thead', options.classNames?.head)}>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr
          key={headerGroup.id}
          className={cx('rtc-tr', options.classNames?.headRow)}
          style={columnWindow?.rowStyle}
        >
          {windowedEntries(headerGroup.headers, columnWindow ?? null).map(({ entry, index }) => (
            <HeaderCell
              key={entry.id}
              table={table}
              header={entry as never}
              colIndex={columnWindow ? index : undefined}
            />
          ))}
        </tr>
      ))}
    </thead>
  )
}
