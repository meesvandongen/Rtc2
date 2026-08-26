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
  /**
   * Identity of the rendered column window, when the columns are virtualized.
   * A header can only be measured while it is mounted, so a new window is a
   * new set of headers to measure — and the ones that just unmounted keep the
   * floor they were last measured at.
   */
  columnWindowKey?: string,
) {
  const options = table.dataTableOptions
  // Semantic tables need no help; the browser already did this.
  const enabled =
    (options.enableHeaderContentFit ?? true) && (options.layoutMode ?? 'semantic') !== 'semantic'
  const setMinSizes = table.setHeaderMinSizes
  const appliedRef = useRef<HeaderMinSizes>({})

  /** Re-entry guard: probing mutates styles, which the observer would see. */
  const probingRef = useRef(false)

  // Read through a ref so `measure` stays stable: the instance is a fresh
  // shallow copy on every render, and a `measure` that changed with it would
  // tear the observers down and rebuild them just as often.
  const visibleIdsRef = useRef<string[]>([])
  visibleIdsRef.current = table.getVisibleLeafColumns().map((column) => column.id)

  const measure = useCallback(() => {
    const head = headRef.current
    if (!head || probingRef.current) return

    // Carry forward the floors of columns that are still part of the table but
    // are not currently in the header. Without virtualized columns that set is
    // empty and this is a plain re-measure; with them, dropping the floor of
    // every column outside the window would make each one jump between two
    // widths as it scrolled in and out.
    const next: HeaderMinSizes = {}
    for (const id of visibleIdsRef.current) {
      const carried = appliedRef.current[id]
      if (carried !== undefined) next[id] = carried
    }

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
      }
    } finally {
      probingRef.current = false
    }

    const applied = appliedRef.current
    const changed =
      Object.keys(next).length !== Object.keys(applied).length ||
      Object.keys(next).some((id) => Math.abs(next[id]! - (applied[id] ?? 0)) > EPSILON)
    if (!changed) return
    appliedRef.current = next
    setMinSizes(next)
  }, [headRef, setMinSizes])

  // Column visibility, density, ordering, the enable* flags and web-font
  // loading all change how wide a header wants to be. Observing the header
  // covers every one of them without enumerating any.
  //
  // `columnWindowKey` is the one thing an observer cannot cover: virtualized
  // columns mount headers that did not exist to be observed when this ran, and
  // they arrive without changing the size of anything already on screen.
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
  }, [enabled, measure, headRef, columnWindowKey])

  useEffect(() => {
    if (enabled || Object.keys(appliedRef.current).length === 0) return
    appliedRef.current = {}
    setMinSizes({})
  }, [enabled, setMinSizes])
}
