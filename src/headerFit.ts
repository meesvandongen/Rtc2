import { useCallback, useEffect, useRef } from 'react'
import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance } from './types'

/**
 * Mirrors each header's resolved width onto the rest of its column.
 *
 * Column widths are a stylesheet concern, and mostly they stay one: `.rtc-th`
 * declares `min-width: min-content` and does not clip, so in the default
 * `semantic` layout the browser's own table algorithm makes every column at
 * least as wide as its header. That needs no code at all, and it stays correct
 * through font swaps, translated labels and density changes — none of which
 * JavaScript would reliably hear about.
 *
 * The grid layout modes are the exception, and only because of how they are
 * built. Each row is its own flex container, so a `th` that grows to fit its
 * label grows *alone* and slides out of alignment with the cells beneath it.
 * CSS has an answer — `subgrid`, which would let one set of column tracks span
 * the header and the body and size them intrinsically — but the virtualized
 * body takes its rows out of flow with `position: absolute`, so they would not
 * be grid items. Until that changes, one number has to cross from the header
 * to the body, and this is it.
 *
 * Note what is *not* happening here: no layout is being recomputed, and no
 * fixed point is being iterated. CSS has already sized the header; this reads
 * the result and publishes it as a custom property that `getCellLayoutProps`
 * puts on every cell in the column.
 */

/** Sub-pixel differences are rounding, not misalignment. */
const EPSILON = 1

export type HeaderMinSizes = Record<string, number>

export function useHeaderContentFit<TData extends RowData>(
  table: DataTableInstance<TData>,
  headRef: React.RefObject<HTMLTableSectionElement | null>,
) {
  const options = table.dataTableOptions
  // Semantic tables need no help; the browser already did this.
  const enabled =
    (options.enableHeaderContentFit ?? true) && (options.layoutMode ?? 'semantic') !== 'semantic'
  const setMinSizes = table.setHeaderMinSizes
  const appliedRef = useRef<HeaderMinSizes>({})

  /** Re-entry guard: probing mutates styles, which the observer would see. */
  const probingRef = useRef(false)

  const measure = useCallback(() => {
    const head = headRef.current
    if (!head || probingRef.current) return
    const next: HeaderMinSizes = {}
    let changed = false

    probingRef.current = true
    try {
      for (const cell of head.querySelectorAll<HTMLElement>('.rtc-th[data-rtc-column-id]')) {
        const id = cell.dataset.rtcColumnId
        // A header spanning several columns says nothing about any one of them.
        if (!id || (cell as HTMLTableCellElement).colSpan > 1) continue

        // Ask the browser for the cell's `min-content` width rather than
        // deriving one. The rendered width cannot be used directly: in the
        // growing grid mode it also contains this column's share of the
        // leftover space, and freezing that as a floor would ratchet.
        const inline = cell.style.cssText
        cell.style.flexGrow = '0'
        cell.style.width = 'min-content'
        const floor = Math.ceil(cell.getBoundingClientRect().width)
        cell.style.cssText = inline

        if (floor <= 0) continue
        next[id] = floor
        if (Math.abs(floor - (appliedRef.current[id] ?? 0)) > EPSILON) changed = true
      }
    } finally {
      probingRef.current = false
    }

    if (!changed && Object.keys(next).length === Object.keys(appliedRef.current).length) return
    appliedRef.current = next
    setMinSizes(next)
  }, [headRef, setMinSizes])

  // Column visibility, density, ordering, the enable* flags and web-font
  // loading all change how wide a header wants to be. Observing the header
  // covers every one of them without enumerating any.
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

  useEffect(() => {
    if (enabled || Object.keys(appliedRef.current).length === 0) return
    appliedRef.current = {}
    setMinSizes({})
  }, [enabled, setMinSizes])
}
