import type { RowData } from '@tanstack/react-table'

import { useComponents } from './registry'
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

export function Pagination<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const ui = useComponents()
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
          <span className="rtc-group-count">{localization.rowsPerPage}</span>
          <ui.Select
            size="sm"
            label={localization.rowsPerPage}
            value={String(pageSize)}
            options={pageSizes.map((size) => ({ label: String(size), value: String(size) }))}
            onChange={(next) => table.setPageSize(Number(next))}
            dataAttributes={{ 'data-rtc-page-size': '' }}
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
          <ui.IconButton
            label={localization.goToFirstPage}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ui.Icon name="chevronsLeft" />
          </ui.IconButton>
        ) : null}

        <ui.IconButton
          label={localization.goToPreviousPage}
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ui.Icon name="chevronLeft" />
        </ui.IconButton>

        {displayMode === 'pages'
          ? pageWindow(pageIndex, pageCount).map((page, index) =>
              page === -1 ? (
                <span className="rtc-group-count" key={`gap-${index}`}>
                  &hellip;
                </span>
              ) : (
                <ui.Button
                  key={page}
                  size="sm"
                  variant={page === pageIndex ? 'primary' : 'quiet'}
                  className="rtc-page-button"
                  aria-current={page === pageIndex ? 'page' : undefined}
                  onClick={() => table.setPageIndex(page)}
                >
                  {page + 1}
                </ui.Button>
              ),
            )
          : null}

        <ui.IconButton
          label={localization.goToNextPage}
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <ui.Icon name="chevronRight" />
        </ui.IconButton>

        {displayMode === 'default' || displayMode === 'pages' ? (
          <ui.IconButton
            label={localization.goToLastPage}
            disabled={!table.getCanNextPage()}
            onClick={() => table.lastPage()}
          >
            <ui.Icon name="chevronsRight" />
          </ui.IconButton>
        ) : null}
      </div>

      <span className="rtc-visually-hidden" aria-live="polite">
        {`${pageIndex + 1} ${localization.of} ${Math.max(pageCount, 1)}`}
      </span>
    </nav>
  )
}
