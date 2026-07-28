import type { RowData } from '@tanstack/react-table'
import { ColumnFilter } from './ColumnFilter'
import { HeaderCell, getCellLayoutProps } from './HeaderCell'
import { cx } from '../utils'
import type { DataTableInstance } from '../types'

export function TableHead<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const headerGroups = table.getHeaderGroups()

  const showFilterRow =
    (options.enableColumnFilters ?? true) &&
    (options.columnFilterDisplayMode ?? 'subheader') === 'subheader' &&
    table.ui.showColumnFilters

  const lastGroup = headerGroups.at(-1)

  return (
    <thead className={cx('rtc-thead', options.classNames?.head)}>
      {headerGroups.map((headerGroup) => (
        <tr
          key={headerGroup.id}
          className={cx('rtc-tr', options.classNames?.headRow)}
        >
          {headerGroup.headers.map((header) => (
            <HeaderCell key={header.id} table={table} header={header as never} />
          ))}
        </tr>
      ))}

      {showFilterRow && lastGroup ? (
        <tr className={cx('rtc-tr', 'rtc-filter-row')}>
          {lastGroup.headers.map((header) => {
            const column = header.column
            const layout = getCellLayoutProps(table, column, 'head')
            return (
              <th {...layout} key={`filter-${header.id}`}>
                {header.isPlaceholder || !column.getCanFilter() ? null : (
                  <ColumnFilter table={table} column={column as never} />
                )}
              </th>
            )
          })}
        </tr>
      ) : null}
    </thead>
  )
}
