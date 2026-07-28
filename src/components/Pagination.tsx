import type { RowData } from '@tanstack/react-table'
import { formatMessage } from '../locale'
import { IconButton, Select } from './primitives/Controls'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from './primitives/Icons'
import type { DataTableInstance } from '../types'

const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100]

/** Page numbers around the current page, with `-1` marking an ellipsis gap. */
function pageWindow(pageIndex: number, pageCount: number): number[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index)
  const pages = new Set<number>([0, pageCount - 1, pageIndex])
  for (const offset of [-1, 1]) {
    const candidate = pageIndex + offset
    if (candidate > 0 && candidate < pageCount - 1) pages.add(candidate)
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result: number[] = []
  let previous = -1
  for (const page of sorted) {
    if (previous !== -1 && page - previous > 1) result.push(-1)
    result.push(page)
    previous = page
  }
  return result
}

export function Pagination<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const { localization } = options
  const { pageIndex, pageSize } = table.state.pagination
  const pageCount = table.getPageCount()
  const rowCount = table.getRowCount()
  const displayMode = options.paginationDisplayMode ?? 'default'

  const firstRow = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = Math.min((pageIndex + 1) * pageSize, rowCount)

  const pageSizes = options.pageSizeOptions ?? DEFAULT_PAGE_SIZES

  return (
    <nav className="rtc-pagination" aria-label={localization.pagination} data-rtc-pagination="">
      {displayMode !== 'simple' ? (
        <div className="rtc-pagination-group">
          <label className="rtc-group-count" htmlFor="rtc-page-size">
            {localization.rowsPerPage}
          </label>
          <Select
            id="rtc-page-size"
            label={localization.rowsPerPage}
            value={String(pageSize)}
            options={pageSizes.map((size) => ({ label: String(size), value: String(size) }))}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
          />
        </div>
      ) : null}

      <span className="rtc-group-count" data-rtc-page-range="">
        {rowCount === 0
          ? `0 ${localization.of} 0`
          : `${firstRow}–${lastRow} ${localization.of} ${rowCount}`}
      </span>

      <div className="rtc-pagination-group">
        {displayMode === 'default' || displayMode === 'pages' ? (
          <IconButton
            label={localization.goToFirstPage}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ChevronsLeftIcon />
          </IconButton>
        ) : null}

        <IconButton
          label={localization.goToPreviousPage}
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ChevronLeftIcon />
        </IconButton>

        {displayMode === 'pages'
          ? pageWindow(pageIndex, pageCount).map((page, index) =>
              page === -1 ? (
                <span className="rtc-group-count" key={`gap-${index}`}>
                  &hellip;
                </span>
              ) : (
                <button
                  type="button"
                  key={page}
                  className="rtc-page-button"
                  data-rtc-active={page === pageIndex ? 'true' : undefined}
                  aria-current={page === pageIndex ? 'page' : undefined}
                  onClick={() => table.setPageIndex(page)}
                >
                  {page + 1}
                </button>
              ),
            )
          : null}

        <IconButton
          label={localization.goToNextPage}
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <ChevronRightIcon />
        </IconButton>

        {displayMode === 'default' || displayMode === 'pages' ? (
          <IconButton
            label={localization.goToLastPage}
            disabled={!table.getCanNextPage()}
            onClick={() => table.lastPage()}
          >
            <ChevronsRightIcon />
          </IconButton>
        ) : null}
      </div>

      <span className="rtc-visually-hidden" aria-live="polite">
        {formatMessage('{page} {of} {total}', {
          page: pageIndex + 1,
          of: localization.of,
          total: Math.max(pageCount, 1),
        })}
      </span>
    </nav>
  )
}
