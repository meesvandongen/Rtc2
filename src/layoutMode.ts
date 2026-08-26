import type { RowData } from '@tanstack/react-table'

import type { DataTableLayoutMode, DataTableOptions } from './types'

/**
 * The layout mode the table will actually render in.
 *
 * `layoutMode` is not simply what the caller passed: virtualization positions
 * rows absolutely and offsets columns by an exact number of pixels, neither of
 * which the browser's native table layout can do, so enabling it switches the
 * table to the `grid` layout on its own.
 *
 * Everything that behaves differently per mode has to ask *this* rather than
 * reading the option — the header cells, the header-fit measurement and the
 * root's `data-rtc-layout` attribute all have to agree on one answer. When they
 * did not, a virtualized table with no explicit `layoutMode` rendered as a grid
 * while its header cells were sized for a semantic table: the measured
 * header floor was never published, so a column stayed at its declared `size`
 * and the label ran underneath the filter and column-actions buttons.
 */
export function resolveLayoutMode<TData extends RowData>(
  options: DataTableOptions<TData>,
): DataTableLayoutMode {
  if (options.layoutMode) return options.layoutMode
  return options.enableRowVirtualization || options.enableColumnVirtualization
    ? 'grid'
    : 'semantic'
}
