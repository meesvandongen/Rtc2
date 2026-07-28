import type { RowData } from '@tanstack/react-table'
import { useDrag } from '../dragContext'
import { cx, getColumnLabel } from '../utils'
import { CloseIcon, GroupIcon } from './primitives/Icons'
import { IconButton } from './primitives/Controls'
import type { DataTableInstance } from '../types'

/**
 * Drop zone showing the active grouping columns as removable chips.
 *
 * Dragging a column header into the zone groups by it; the zone highlights
 * while a column is being dragged over it.
 */
export function GroupingChips<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const { localization } = table.dataTableOptions
  const drag = useDrag()
  const grouping = table.state.grouping

  return (
    <div
      className={cx('rtc-group-chips')}
      data-rtc-grouping-zone="true"
      data-rtc-drop-target={
        drag.kind === 'column' && drag.overGroupingZone ? 'true' : undefined
      }
      role="group"
      aria-label={localization.groupedBy}
    >
      <GroupIcon />
      {grouping.length === 0 ? (
        <span className="rtc-group-chips-empty">{localization.groupedBy}&hellip;</span>
      ) : (
        grouping.map((columnId) => {
          const column = table.getColumn(columnId)
          const label = column ? getColumnLabel(column) : columnId
          return (
            <span className="rtc-chip" key={columnId} data-rtc-group-chip={columnId}>
              {label}
              <IconButton
                size="sm"
                label={`${localization.ungroupByColumn.replace('{column}', label)}`}
                onClick={() => column?.toggleGrouping()}
              >
                <CloseIcon />
              </IconButton>
            </span>
          )
        })
      )}
    </div>
  )
}
