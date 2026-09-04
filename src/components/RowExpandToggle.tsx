import type { RowData } from '@tanstack/react-table'
import { Subscribe } from '@tanstack/react-table'

import { useComponents } from './registry'
import { treeIndentOffset } from '../treeIndent'
import type { DataTableInstance, DataTableRow } from '../types'

/**
 * Expand chevron. Without a `row` it renders the expand-all control in the
 * header; with one it toggles that row (or its detail panel).
 *
 * A nested row's chevron is the control that carries its depth: it steps one
 * indent to the right per level, inside the expand column, while the data
 * columns stay in line. The header's expand-all control never steps — it
 * stands for the table, not for a row in it.
 */
export function RowExpandToggle<TData extends RowData>({
  table,
  row,
}: {
  table: DataTableInstance<TData>
  row?: DataTableRow<TData>
}) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  if (!row) {
    return (
      <Subscribe source={table.atoms.expanded}>
        {() => {
          const allExpanded = table.getIsAllRowsExpanded()
          return (
            <span
              className="rtc-expand-slot"
              data-rtc-expanded={allExpanded ? 'true' : 'false'}
            >
              <ui.IconButton
                size="sm"
                label={allExpanded ? localization.collapseAll : localization.expandAll}
                disabled={!table.getCanSomeRowsExpand()}
                onClick={() => table.toggleAllRowsExpanded()}
                className="rtc-expand-button"
              >
                <ui.Icon name="chevronRight" className="rtc-expand-icon" />
              </ui.IconButton>
            </span>
          )
        }}
      </Subscribe>
    )
  }

  // Read outside `Subscribe`: depth is structural, so it does not change when
  // the expanded state does.
  const indent = treeIndentOffset(row.depth)

  return (
    <Subscribe source={row.table.atoms.expanded}>
      {() => {
        const expanded = row.getIsExpanded()
        const canExpand = row.getCanExpand()
        return (
          <span
            className="rtc-expand-slot"
            data-rtc-expanded={expanded ? 'true' : 'false'}
            // A resolved length rather than the level itself: the same number
            // sizes the expand column, and the two must not drift apart.
            style={indent ? ({ '--rtc-row-indent': indent } as React.CSSProperties) : undefined}
          >
            <ui.IconButton
              size="sm"
              label={expanded ? localization.collapse : localization.expand}
              disabled={!canExpand}
              onClick={(event) => {
                event.stopPropagation()
                row.toggleExpanded()
              }}
              className="rtc-expand-button"
            >
              <ui.Icon name="chevronRight" className="rtc-expand-icon" />
            </ui.IconButton>
          </span>
        )
      }}
    </Subscribe>
  )
}
