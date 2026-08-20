import type { RowData } from '@tanstack/react-table'
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual'

import type { DataTableInstance } from '../types'

const DENSITY_ROW_HEIGHT = { compact: 32, comfortable: 44, spacious: 60 } as const

export type RowVirtualizer = Virtualizer<HTMLDivElement, HTMLTableRowElement>

/**
 * Row virtualizer for the table body.
 *
 * Only called for a table that is actually virtualized, and only from the
 * component that renders the scroll container: `getScrollElement` has to
 * resolve on the very first commit, and React attaches refs bottom-up, so a
 * virtualizer created *below* the container would read the ref before React
 * had assigned it — and, with nothing else prompting a re-render, never look
 * again. Owning both together is TanStack's documented pattern.
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
    getScrollElement: () => containerRef.current,
    estimateSize: options.rowVirtualizerOptions?.estimateSize ?? (() => estimate),
    overscan: options.rowVirtualizerOptions?.overscan ?? 8,
    measureElement:
      typeof window !== 'undefined' && !navigator.userAgent.includes('Firefox')
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  })
}

/**
 * Hosts a row virtualizer one level above the container it measures.
 *
 * `children` receives the virtualizer and returns the subtree that renders the
 * `ref`ed container, so the markup stays in one place while the hook still
 * sits above it. Rendered only for a virtualized table — a plain one never
 * builds a virtualizer at all.
 */
export function WithRowVirtualizer<TData extends RowData>({
  table,
  containerRef,
  count,
  children,
}: {
  table: DataTableInstance<TData>
  containerRef: React.RefObject<HTMLDivElement | null>
  count: number
  children: (rowVirtualizer: RowVirtualizer) => React.ReactNode
}): React.ReactNode {
  const rowVirtualizer = useRowVirtualizer(table, containerRef, count)
  return children(rowVirtualizer)
}
