import type { RowData } from '@tanstack/react-table'
import { Subscribe } from '@tanstack/react-table'

import { ChevronRightIcon } from './primitives/Icons'
import type { DataTableInstance, DataTableRow } from '../types'

/**
 * Expand chevron. Without a `row` it renders the expand-all control in the
 * header; with one it toggles that row (or its detail panel).
 */
export function RowExpandToggle<TData extends RowData>({
  table,
  row,
}: {
  table: DataTableInstance<TData>
  row?: DataTableRow<TData>
}) {
  const { localization } = table.dataTableOptions

  if (!row) {
    return (
      <Subscribe source={table.atoms.expanded}>
        {() => {
          const allExpanded = table.getIsAllRowsExpanded()
          return (
            <button
              type="button"
              className="rtc-expand-button"
              data-rtc-expanded={allExpanded ? 'true' : 'false'}
              aria-label={allExpanded ? localization.collapseAll : localization.expandAll}
              title={allExpanded ? localization.collapseAll : localization.expandAll}
              aria-expanded={allExpanded}
              disabled={!table.getCanSomeRowsExpand()}
              onClick={table.getToggleAllRowsExpandedHandler()}
            >
              <ChevronRightIcon className="rtc-expand-icon" />
            </button>
          )
        }}
      </Subscribe>
    )
  }

  return (
    <Subscribe source={row.table.atoms.expanded}>
      {() => {
        const expanded = row.getIsExpanded()
        const canExpand = row.getCanExpand()
        return (
          <button
            type="button"
            className="rtc-expand-button"
            data-rtc-expanded={expanded ? 'true' : 'false'}
            aria-label={expanded ? localization.collapse : localization.expand}
            title={expanded ? localization.collapse : localization.expand}
            aria-expanded={canExpand ? expanded : undefined}
            disabled={!canExpand}
            onClick={(event) => {
              event.stopPropagation()
              row.toggleExpanded()
            }}
          >
            <ChevronRightIcon className="rtc-expand-icon" />
          </button>
        )
      }}
    </Subscribe>
  )
}
