import { useCallback, useEffect, useRef } from 'react'
import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance } from './types'

/**
 * Keeps every column at least as wide as its own header.
 *
 * A header is not just a label: it carries a sort control, a filter funnel and
 * a column menu, and those are fixed-width. Give a column a declared `size` of
 * 90px and turn all three on and the label is squeezed to nothing — the column
 * is unreadable while the table may still have empty space beside it. Sizing
 * columns by their *body* content has the opposite failure (one long cell
 * blows the column out), so the floor is the header alone, which is what AG
 * Grid's header auto-size does and what "size to fit" means in a spreadsheet.
 *
 * When the floor pushes the total past the viewport the table scrolls
 * horizontally. That is the intended trade: a scrollbar is recoverable, a
 * header truncated to "A…" is not.
 *
 * The measurement is a fixed point rather than a layout calculation. Each
 * header's label already renders with `text-overflow: ellipsis`, so the
 * clipped amount is exactly `scrollWidth - clientWidth`; adding it to the
 * cell's current width gives the width at which nothing is clipped. Applying
 * that drives the clipped amount to zero, so the loop settles after one pass
 * and cannot oscillate — it only ever raises.
 */

/** Ignore sub-pixel rounding; anything smaller is not a visible truncation. */
const EPSILON = 1

export type HeaderMinSizes = Record<string, number>

export function useHeaderContentFit<TData extends RowData>(
  table: DataTableInstance<TData>,
  headRef: React.RefObject<HTMLTableSectionElement | null>,
) {
  const enabled = table.dataTableOptions.enableHeaderContentFit ?? true
  const setMinSizes = table.setHeaderMinSizes
  const appliedRef = useRef<HeaderMinSizes>({})

  const measure = useCallback(() => {
    const head = headRef.current
    if (!head) return
    let changed = false
    const next = { ...appliedRef.current }

    for (const cell of head.querySelectorAll<HTMLElement>('.rtc-th[data-rtc-column-id]')) {
      const id = cell.dataset.rtcColumnId
      if (!id) continue
      const label = cell.querySelector<HTMLElement>('.rtc-th-label')
      if (!label) continue
      const clipped = label.scrollWidth - label.clientWidth
      if (clipped <= EPSILON) continue
      const needed = Math.ceil(cell.getBoundingClientRect().width + clipped)
      if (needed > (next[id] ?? 0) + EPSILON) {
        next[id] = needed
        changed = true
      }
    }

    if (!changed) return
    appliedRef.current = next
    setMinSizes(next)
  }, [headRef, setMinSizes])

  // Column sizing, visibility, density and the enable* flags all change what
  // the header holds, and the browser's own font loading changes how wide it
  // is; a ResizeObserver on the header covers every one of them without the
  // hook having to enumerate them.
  useEffect(() => {
    if (!enabled) return
    const head = headRef.current
    if (!head) return
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(head)
    for (const cell of head.querySelectorAll('.rtc-th')) observer.observe(cell)
    return () => observer.disconnect()
  }, [enabled, measure, headRef])

  // A column the user has resized by hand is theirs; drop the floor so the
  // handle is not fighting a minimum it cannot see.
  const sizingSignal = JSON.stringify(table.state.columnSizing)
  useEffect(() => {
    const sizing = table.state.columnSizing
    const kept: HeaderMinSizes = {}
    let changed = false
    for (const [id, value] of Object.entries(appliedRef.current)) {
      if (sizing[id] !== undefined) changed = true
      else kept[id] = value
    }
    if (!changed) return
    appliedRef.current = kept
    setMinSizes(kept)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizingSignal])

  // Turning the behaviour off has to release any floor already applied.
  useEffect(() => {
    if (enabled || Object.keys(appliedRef.current).length === 0) return
    appliedRef.current = {}
    setMinSizes({})
  }, [enabled, setMinSizes])
}
