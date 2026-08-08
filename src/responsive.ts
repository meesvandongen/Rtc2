import { useCallback, useSyncExternalStore } from 'react'
import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance, DataTableOptions } from './types'

/**
 * Viewport width, in pixels, below which the table treats itself as mobile.
 *
 * Chosen to sit under the smallest common tablet portrait width, so a phone is
 * always mobile and a tablet never is by accident.
 */
export const DEFAULT_MOBILE_BREAKPOINT = 640

/** One `MediaQueryList` per query, so a snapshot read costs nothing. */
const lists = new Map<string, MediaQueryList>()

function listFor(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  let list = lists.get(query)
  if (!list) {
    list = window.matchMedia(query)
    lists.set(query, list)
  }
  return list
}

/**
 * Subscribes to a media query.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the server
 * snapshot is explicit, so a table rendered on the server always ships its
 * wide-viewport markup and corrects itself on hydration instead of mismatching.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listFor(query)
      if (!list) return () => {}
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => listFor(query)?.matches ?? false, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** `640` → `(width < 640px)`; a string is used as-is, so `40em` works too. */
export function mobileMediaQuery(breakpoint: number | string = DEFAULT_MOBILE_BREAKPOINT): string {
  return `(width < ${typeof breakpoint === 'number' ? `${breakpoint}px` : breakpoint})`
}

/** Whether the viewport is narrower than the table's mobile breakpoint. */
export function useIsMobile(breakpoint?: number | string): boolean {
  return useMediaQuery(mobileMediaQuery(breakpoint))
}

/**
 * Whether column filters should open in a modal sheet.
 *
 * A popover anchored to a 24px funnel button, or a 280px pane docked beside
 * the table, are both wrong on a phone: the first is too small to hold a date
 * range or a checkbox list, the second leaves no room for the rows. On a
 * narrow viewport both surfaces are replaced by a `Drawer`.
 */
export function usesFilterDrawer<TData extends RowData>(table: DataTableInstance<TData>): boolean {
  return filterDrawerApplies(table.dataTableOptions, table.isMobile)
}

/**
 * The same question, asked from the options alone.
 *
 * `useDataTable` has to answer it while building the instance that
 * `usesFilterDrawer` reads, which is too early to ask the instance.
 */
export function filterDrawerApplies<TData extends RowData>(
  options: DataTableOptions<TData>,
  isMobile: boolean,
): boolean {
  return (
    isMobile &&
    (options.enableMobileFilterDrawer ?? true) &&
    (options.enableColumnFilters ?? true) &&
    (options.filterDisplayMode ?? 'popover') !== 'none'
  )
}
