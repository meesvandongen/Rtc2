import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RowData } from '@tanstack/react-table'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'

import { DENSITY_ROW_HEIGHT } from './rowVirtualizer'
import { useDrag } from '../dragContext'
import {
  transposedPlan,
  type TransposedBandWindow,
  type TransposedLayout,
  type TransposedPlan,
  type TransposedWindow,
} from '../transpose'
import type { DataTableInstance } from '../types'

/**
 * The transposed table's two virtualizers.
 *
 * Each option still windows the thing it names — `enableRowVirtualization` the
 * records, `enableColumnVirtualization` the columns — which transposed means
 * they have swapped axes: records run across and columns run down.
 *
 * Neither positions anything. What comes back is a set of indexes; the geometry
 * is spacers computed from the same custom properties the cells are sized from,
 * so a window that were ever a frame behind would still leave the table exactly
 * as wide and as tall as it is. That is the whole reason a transposed table can
 * be virtualized while staying a real `<table>`, with the `rowSpan` that grouped
 * headers and detail panels are built on.
 */

/** Fallbacks used until a cell has been measured; the stylesheet's defaults. */
const DEFAULT_RECORD_WIDTH = 200
const DEFAULT_DETAIL_WIDTH = 280

/**
 * The width a record column is rendering at.
 *
 * Read from the DOM rather than parsed out of `--rtc-transposed-record-width`,
 * which a consumer may set to any length — `14rem`, `min(20vw, 300px)` — and a
 * custom property comes back as the token it was written as. The rendered cell
 * is the resolved answer, and one cell is enough: `table-layout: fixed` gives
 * every record column the same width.
 */
function useMeasuredSizes(
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
): { record: number; detail: number } {
  const [sizes, setSizes] = useState({
    record: DEFAULT_RECORD_WIDTH,
    detail: DEFAULT_DETAIL_WIDTH,
  })

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const read = () => {
      // A record cell, not a spacer: only the real ones carry a record id.
      const record = container.querySelector<HTMLElement>('td.rtc-td[data-rtc-row-id]')
      const detail = container.querySelector<HTMLElement>('td.rtc-detail-cell')
      setSizes((previous) => {
        const next = {
          record: record?.getBoundingClientRect().width || previous.record,
          detail: detail?.getBoundingClientRect().width || previous.detail,
        }
        return Math.abs(next.record - previous.record) < 0.5 &&
          Math.abs(next.detail - previous.detail) < 0.5
          ? previous
          : next
      })
    }

    read()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, enabled])

  return sizes
}

/**
 * Indexes that have to stay mounted whatever the scroll offset asks for.
 *
 * A pinned item is sticky: it holds one edge of the table, and unmounting it
 * would leave that edge blank. The item being dragged stays for the reason the
 * upright column virtualizer keeps it — its pointer handlers live on an element
 * that would otherwise unmount under the pointer.
 */
function useForcedRange(pinned: number[], draggingIndex: number) {
  const key = pinned.join(',')
  return useCallback(
    (range: Range) => {
      const indexes = new Set(defaultRangeExtractor(range))
      for (const index of pinned) indexes.add(index)
      if (draggingIndex >= 0) indexes.add(draggingIndex)
      return [...indexes]
        .filter((index) => index >= 0 && index < range.count)
        .sort((a, b) => a - b)
    },
    // Keyed on the joined list rather than the array, which is rebuilt on
    // every render and would give the extractor a new identity each time.
    [key, draggingIndex],
  )
}

/** Memoizes a window on what it holds, so a scroll that changes nothing re-renders nothing. */
function useWindow(indexes: number[], enabled: boolean): TransposedWindow | null {
  const key = indexes.join(',')
  return useMemo(() => (enabled ? { indexes } : null), [enabled, key])
}

function useBandWindowValue(
  indexes: number[],
  starts: number[],
  ends: number[],
  totalSize: number,
  enabled: boolean,
): TransposedBandWindow | null {
  const key = `${indexes.join(',')}|${starts.join(',')}|${ends.join(',')}|${totalSize}`
  return useMemo(
    () => (enabled ? { indexes, starts, ends, totalSize } : null),
    [enabled, key],
  )
}

/**
 * Hosts both virtualizers one level above the container they measure, for the
 * reason `WithRowVirtualizer` documents: `getScrollElement` has to resolve on
 * the first commit, and React attaches refs bottom-up. It also sits inside
 * `DragProvider`, since the dragged item is one of the things a window is not
 * allowed to drop.
 */
export function WithTransposedWindows<TData extends RowData>({
  table,
  containerRef,
  layout,
  virtualizeBands,
  virtualizeRecords,
  children,
}: {
  table: DataTableInstance<TData>
  containerRef: React.RefObject<HTMLDivElement | null>
  layout: TransposedLayout<TData>
  virtualizeBands: boolean
  virtualizeRecords: boolean
  /**
   * `measureBand` goes on each band's `<tr>`, and is a no-op when the bands are
   * not windowed — the body puts it on either way rather than branching.
   */
  children: (
    plan: TransposedPlan<TData>,
    measureBand: (node: HTMLTableRowElement | null) => void,
  ) => React.ReactNode
}): React.ReactNode {
  const options = table.dataTableOptions
  const drag = useDrag()
  const measured = useMeasuredSizes(containerRef, virtualizeRecords)

  const bandCount = layout.bands.length
  const recordCount = layout.records.length

  const bandHeight = DENSITY_ROW_HEIGHT[table.ui.density]
  // A resize is the only thing that makes a band anything other than the
  // density's row height: body cells clip and do not wrap, so nothing in the
  // data can make one taller.
  const bandSizeKey = layout.bandSizes.join(',')

  const draggingBand =
    drag.kind === 'column' && drag.activeId
      ? layout.bands.findIndex((leaf) => leaf.column.id === drag.activeId)
      : -1
  const draggingRecord =
    drag.kind === 'row' && drag.activeId
      ? layout.records.findIndex((record) => record.row.id === drag.activeId)
      : -1

  // Column pinning puts the pinned bands at the two ends of the band order, so
  // those are a count from each edge; a pinned record in the sticky mode is
  // wherever the sort left it, so those are the positions themselves.
  const pinnedBandIndexes = useMemo(() => {
    const indexes: number[] = []
    for (let index = 0; index < layout.pinnedBands; index++) indexes.push(index)
    for (let index = 0; index < layout.pinnedBandsEnd; index++) {
      indexes.push(bandCount - 1 - index)
    }
    return indexes
  }, [layout.pinnedBands, layout.pinnedBandsEnd, bandCount])

  const bandRange = useForcedRange(pinnedBandIndexes, draggingBand)
  const recordRange = useForcedRange(layout.pinnedRecords, draggingRecord)

  const bandVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: virtualizeBands ? bandCount : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => layout.bandSizes[index] ?? bandHeight,
    overscan: options.columnVirtualizerOptions?.overscan ?? 3,
    rangeExtractor: bandRange,
    // A band is as tall as its tallest cell, and a label cell holding a button
    // is taller than the density's row height. Estimating instead left the
    // scroll extent a couple of pixels short over forty bands, which is a
    // scrollbar that shifts under the pointer as you use it.
    measureElement:
      typeof window !== 'undefined' && !navigator.userAgent.includes('Firefox')
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  })

  const recordVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableCellElement>({
    horizontal: true,
    count: virtualizeRecords ? recordCount : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) =>
      measured.record + (layout.records[index]?.hasDetail ? measured.detail : 0),
    overscan: options.rowVirtualizerOptions?.overscan ?? 8,
    rangeExtractor: recordRange,
    // In RTL the container scrolls the other way, and the virtualizer has to
    // read `scrollLeft` with the sign the browser reports.
    isRtl: options.direction === 'rtl',
  })

  // A resize, a density switch or a re-measured record width all change what an
  // item is worth without changing how many there are, which is not something
  // the virtualizer invalidates its cache on.
  useEffect(() => {
    bandVirtualizer.measure()
  }, [bandVirtualizer, bandHeight, bandSizeKey])
  useEffect(() => {
    recordVirtualizer.measure()
  }, [recordVirtualizer, measured.record, measured.detail])

  const bandItems = bandVirtualizer.getVirtualItems()
  const bandWindow = useBandWindowValue(
    bandItems.map((item) => item.index),
    bandItems.map((item) => item.start),
    bandItems.map((item) => item.end),
    bandVirtualizer.getTotalSize(),
    virtualizeBands,
  )
  const recordWindow = useWindow(
    recordVirtualizer.getVirtualItems().map((item) => item.index),
    virtualizeRecords,
  )

  const plan = useMemo(
    () => transposedPlan(layout, bandWindow, recordWindow),
    [layout, bandWindow, recordWindow],
  )

  return children(
    plan,
    bandVirtualizer.measureElement as (node: HTMLTableRowElement | null) => void,
  )
}
