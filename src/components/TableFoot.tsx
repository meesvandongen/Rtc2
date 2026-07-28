import type { RowData } from '@tanstack/react-table'
import { getCellLayoutProps } from './HeaderCell'
import { cx } from '../utils'
import type { DataTableInstance } from '../types'

/** Column footers. Rendered only when at least one column declares a `footer`. */
export function TableFoot<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const groups = table.getFooterGroups()

  const hasFooter = table
    .getAllLeafColumns()
    .some((column) => column.columnDef.footer !== undefined)
  if (!hasFooter) return null

  return (
    <tfoot className={cx('rtc-tfoot', options.classNames?.foot)}>
      {groups.map((group) => (
        <tr key={group.id} className={cx('rtc-tr', options.classNames?.footRow)}>
          {group.headers.map((header) => {
            const layout = getCellLayoutProps(table, header.column, 'head')
            return (
              <th
                {...layout}
                key={header.id}
                className={cx(layout.className, options.classNames?.footCell)}
                colSpan={header.colSpan > 1 ? header.colSpan : undefined}
              >
                {header.isPlaceholder ? null : <table.FlexRender footer={header as never} />}
              </th>
            )
          })}
        </tr>
      ))}
    </tfoot>
  )
}
