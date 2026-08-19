import type { RowData } from '@tanstack/react-table'
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual'

import type { DataTableInstance } from '../types'

const DENSITY_ROW_HEIGHT = { compact: 32, comfortable: 44, spacious: 60 } as const

export type RowVirtualizer = Virtualizer<HTMLDivElement, HTMLTableRowElement>

/**
 * Row virtualizer for the table body.
 *
 * This deliberately lives in the component that renders the scroll container,
 * not in the body that consumes the virtual rows. `getScrollElement` has to
 * resolve on the very first commit, and React attaches refs bottom-up: a
 * descendant's layout effect runs before its ancestor's ref is assigned. A
 * virtualizer created below the container would therefore see `null` on mount
 * and — with nothing else prompting a re-render — never look again. Keeping
 * the ref and the virtualizer in one component is TanStack's documented
 * pattern, and makes the container reachable from the first measurement on.
 *
 * The hook is always called so the rules of hooks hold; `enabled` turns the
 * work off when the table is not virtualized.
 */
export function useRowVirtualizer<TData extends RowData>(
  table: DataTableInstance<TData>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  count: number,
): RowVirtualizer {
  const options = table.dataTableOptions
  const estimate = DENSITY_ROW_HEIGHT[table.ui.density]

  return useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count,
    enabled: options.enableRowVirtualization ?? false,
    getScrollElement: () => containerRef.current,
    estimateSize: options.rowVirtualizerOptions?.estimateSize ?? (() => estimate),
    overscan: options.rowVirtualizerOptions?.overscan ?? 8,
    measureElement:
      typeof window !== 'undefined' && !navigator.userAgent.includes('Firefox')
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  })
}
