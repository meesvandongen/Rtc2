import type { RowData } from '@tanstack/react-table'
import { ColumnFilter } from './ColumnFilter'
import { formatMessage } from '../locale'
import { getColumnLabel } from '../utils'
import { IconButton } from './primitives/Controls'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from './primitives/Menu'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  EyeOffIcon,
  GroupIcon,
  MoreVerticalIcon,
  PinIcon,
  PinOffIcon,
  ResetIcon,
} from './primitives/Icons'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * Per-column overflow menu: sorting, grouping, pinning, hiding, sizing, and —
 * when `columnFilterDisplayMode` is `popover` — the column's filter editor.
 */
export function ColumnActionsMenu<TData extends RowData>({
  table,
  column,
}: {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
}) {
  const options = table.dataTableOptions
  const { localization } = options
  const columnLabel = getColumnLabel(column)

  const canSort = column.getCanSort()
  const canGroup = (options.enableGrouping ?? false) && column.getCanGroup()
  const canPin = (options.enableColumnPinning ?? false) && column.getCanPin()
  const canHide = column.getCanHide()
  const canResize = (options.enableColumnResizing ?? false) && column.getCanResize()
  const showFilter =
    (options.enableColumnFilters ?? true) &&
    column.getCanFilter() &&
    (options.columnFilterDisplayMode ?? 'subheader') === 'popover'

  const sorted = column.getIsSorted()
  const pinned = column.getIsPinned()

  return (
    <Menu
      align="end"
      label={formatMessage(localization.columnActions, { column: columnLabel })}
      trigger={(triggerProps) => (
        <IconButton size="sm" label={localization.columnActions} {...(triggerProps as any)}>
          <MoreVerticalIcon />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          {canSort ? (
            <>
              <MenuItem
                icon={<ArrowUpIcon />}
                active={sorted === 'asc'}
                onClick={() => {
                  column.toggleSorting(false, false)
                  close()
                }}
              >
                {formatMessage(localization.sortByColumnAsc, { column: columnLabel })}
              </MenuItem>
              <MenuItem
                icon={<ArrowDownIcon />}
                active={sorted === 'desc'}
                onClick={() => {
                  column.toggleSorting(true, false)
                  close()
                }}
              >
                {formatMessage(localization.sortByColumnDesc, { column: columnLabel })}
              </MenuItem>
              {sorted ? (
                <MenuItem
                  icon={<CloseIcon />}
                  onClick={() => {
                    column.clearSorting()
                    close()
                  }}
                >
                  {localization.clearSort}
                </MenuItem>
              ) : null}
              <MenuSeparator />
            </>
          ) : null}

          {canGroup ? (
            <MenuItem
              icon={<GroupIcon />}
              active={column.getIsGrouped()}
              onClick={() => {
                column.toggleGrouping()
                close()
              }}
            >
              {formatMessage(
                column.getIsGrouped() ? localization.ungroupByColumn : localization.groupByColumn,
                { column: columnLabel },
              )}
            </MenuItem>
          ) : null}

          {canPin ? (
            <>
              <MenuItem
                icon={<PinIcon />}
                active={pinned === 'start'}
                onClick={() => {
                  column.pin(pinned === 'start' ? false : 'start')
                  close()
                }}
              >
                {pinned === 'start' ? localization.unpin : localization.pinToStart}
              </MenuItem>
              <MenuItem
                icon={<PinIcon />}
                active={pinned === 'end'}
                onClick={() => {
                  column.pin(pinned === 'end' ? false : 'end')
                  close()
                }}
              >
                {pinned === 'end' ? localization.unpin : localization.pinToEnd}
              </MenuItem>
              {pinned ? (
                <MenuItem
                  icon={<PinOffIcon />}
                  onClick={() => {
                    column.pin(false)
                    close()
                  }}
                >
                  {localization.unpin}
                </MenuItem>
              ) : null}
            </>
          ) : null}

          {canResize ? (
            <MenuItem
              icon={<ResetIcon />}
              onClick={() => {
                column.resetSize()
                close()
              }}
            >
              {localization.resetColumnSize}
            </MenuItem>
          ) : null}

          {canHide ? (
            <MenuItem
              icon={<EyeOffIcon />}
              onClick={() => {
                column.toggleVisibility(false)
                close()
              }}
            >
              {formatMessage(localization.hideColumn, { column: columnLabel })}
            </MenuItem>
          ) : null}

          {showFilter ? (
            <>
              <MenuSeparator />
              <MenuLabel>{formatMessage(localization.filterByColumn, { column: columnLabel })}</MenuLabel>
              <div className="rtc-menu-section">
                <ColumnFilter table={table} column={column} />
              </div>
            </>
          ) : null}

          {column.columnDef.meta?.description ? (
            <>
              <MenuSeparator />
              <div className="rtc-menu-section rtc-group-count">
                {column.columnDef.meta.description}
              </div>
            </>
          ) : null}
        </>
      )}
    </Menu>
  )
}
