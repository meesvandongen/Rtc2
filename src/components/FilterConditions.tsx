import type { RowData } from '@tanstack/react-table'

import {
  FilterEditor,
  currentOperatorLabel,
  filterOperatorItems,
  hasFilterOperatorChoice,
} from './FilterEditor'
import { useComponents } from './registry'
import { findOperator, fromConditions, joinOf, resolveDataType, toConditions } from '../filters/registry'
import { getColumnLabel } from '../utils'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * One column's filter: its operator picker, its operand, and — when the column
 * allows more than one condition — the rest of the stack plus the and/or join.
 *
 * Shared by the header popover and the docked panel so both surfaces offer the
 * same capabilities; only the surrounding chrome differs.
 */
export function FilterConditions<TData extends RowData>({
  table,
  column,
  size = 'md',
}: {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
  size?: 'sm' | 'md'
}) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions
  const dataType = resolveDataType(table, column)
  const filterValue = column.getFilterValue()
  const conditions = toConditions(filterValue, dataType)
  const join = joinOf(filterValue)
  const label = getColumnLabel(column)

  const allowMultiple =
    column.columnDef.meta?.enableMultipleFilterConditions ??
    table.dataTableOptions.enableMultipleFilterConditions ??
    false

  // Always render one row, even before a filter exists, so the editor is
  // reachable; extra rows only appear once the user adds them.
  const rowCount = Math.max(conditions.length, 1)
  const showOperator = hasFilterOperatorChoice(table, column)

  const replaceAll = (next: typeof conditions) =>
    column.setFilterValue(next.length === 0 ? undefined : fromConditions(next, join))

  const addCondition = () => {
    const operator = findOperator(dataType, dataType.defaultOperator) ?? dataType.operators[0]!
    const seeded = { op: operator.id, value: operator.initialValue?.(undefined) }
    replaceAll([...conditions, seeded])
  }

  const removeCondition = (index: number) =>
    replaceAll(conditions.filter((_, position) => position !== index))

  return (
    <div className="rtc-filter-conditions">
      {Array.from({ length: rowCount }, (_, index) => (
        <div className="rtc-filter-condition" key={index} data-rtc-filter-condition={index}>
          {index > 0 ? (
            <ui.Button
              size="sm"
              variant="quiet"
              className="rtc-filter-join"
              onClick={() =>
                column.setFilterValue(
                  fromConditions(conditions, join === 'and' ? 'or' : 'and'),
                )
              }
            >
              {join === 'and' ? localization.matchAll : localization.matchAny}
            </ui.Button>
          ) : null}

          {showOperator || (allowMultiple && rowCount > 1) ? (
            <div className="rtc-filter-condition-header">
              {showOperator ? (
                <ui.Menu
                  align="start"
                  label={localization.changeFilterMode}
                  items={filterOperatorItems(table, column, index)}
                  trigger={
                    <ui.Button size="sm" variant="quiet">
                      {currentOperatorLabel(table, column, index)}
                    </ui.Button>
                  }
                />
              ) : null}
              {allowMultiple && rowCount > 1 ? (
                <ui.IconButton
                  size="sm"
                  label={`${localization.removeCondition}: ${label}`}
                  onClick={() => removeCondition(index)}
                >
                  <ui.Icon name="close" />
                </ui.IconButton>
              ) : null}
            </div>
          ) : null}

          <FilterEditor table={table} column={column} size={size} conditionIndex={index} />
        </div>
      ))}

      {allowMultiple ? (
        <ui.Button
          size="sm"
          variant="quiet"
          onClick={addCondition}
          className="rtc-filter-add-condition"
        >
          {localization.addCondition}
        </ui.Button>
      ) : null}
    </div>
  )
}
