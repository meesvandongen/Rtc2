import type { RowData } from '@tanstack/react-table'

import { useComponents } from './registry'
import { useDrag } from '../dragContext'
import { formatMessage } from '../locale'
import { getColumnLabel } from '../utils'
import type { DataTableInstance } from '../types'

/**
 * Drop zone showing the active grouping columns as removable chips.
 *
 * Dragging a column header into the zone groups by it; the zone highlights
 * while a column is being dragged over it.
 */
export function GroupingChips<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions
  const drag = useDrag()
  const grouping = table.state.grouping

  return (
    <div
      className="rtc-group-chips"
      data-rtc-grouping-zone="true"
      data-rtc-drop-target={drag.kind === 'column' && drag.overGroupingZone ? 'true' : undefined}
      role="group"
      aria-label={localization.groupedBy}
    >
      <ui.Icon name="group" />
      {grouping.length === 0 ? (
        <span className="rtc-group-chips-empty">{localization.groupedBy}&hellip;</span>
      ) : (
        grouping.map((columnId) => {
          const column = table.getColumn(columnId)
          const label = column ? getColumnLabel(column, localization) : columnId
          return (
            <span key={columnId} data-rtc-group-chip={columnId}>
              <ui.Badge
                onRemove={() => column?.toggleGrouping()}
                removeLabel={formatMessage(localization.ungroupByColumn, { column: label })}
              >
                {label}
              </ui.Badge>
            </span>
          )
        })
      )}
    </div>
  )
}
