import { useCallback, useEffect } from 'react'
import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance, DataTableOptions, DataTableRow } from './types'

/**
 * Where pinned rows are rendered.
 *
 * `sticky` leaves a pinned row where the sort put it and makes it stick to the
 * edge of the scroll container once it would have scrolled away — the row keeps
 * its place in the order and never leaves the screen. The other three modes
 * lift pinned rows out of the body into a section of their own, above or below
 * the rows that remain.
 *
 * The mode chooses which directions the pin control offers; it does not decide
 * which sections exist. A table in `top` mode that is handed
 * `initialState.rowPinning.bottom` still renders a bottom section, because the
 * alternative is a row that is pinned and nowhere to be seen.
 */
export function usesPinnedRowSections<TData extends RowData>(
  options: DataTableOptions<TData>,
): boolean {
  if (!options.enableRowPinning) return false
  if ((options.rowPinningDisplayMode ?? 'sticky') !== 'sticky') return true
  // A virtualized row is positioned absolutely against a spacer the height of
  // the whole scroll range, and an absolutely positioned row cannot also be a
  // sticky one. Rather than let `sticky` quietly do nothing there, the pinned
  // rows are lifted into sections, which sit outside the virtualized body and
  // stay put on their own.
  return options.enableRowVirtualization ?? false
}

/**
 * The rows to render, with pinned rows the current row model has dropped folded
 * back in.
 *
 * `keepPinnedRows` (TanStack's, on by default) keeps a pinned row alive through
 * filtering and pagination: `getTopRows()` still returns it after a filter has
 * excluded it or a page has moved past it. That is the whole point of pinning a
 * row — to keep it in view while you look for something else — but the row is
 * no longer in the row model, so in the sticky mode, where the body renders the
 * model as it stands, it has to be put back. Rows already in the model keep
 * their place; only the ones the model dropped are added, at the edge they are
 * pinned to.
 */
export function withKeptPinnedRows<TData extends RowData>(
  table: DataTableInstance<TData>,
  rows: Array<DataTableRow<TData>>,
): Array<DataTableRow<TData>> {
  const top = table.getTopRows() as Array<DataTableRow<TData>>
  const bottom = table.getBottomRows() as Array<DataTableRow<TData>>
  if (top.length === 0 && bottom.length === 0) return rows

  const rendered = new Set(rows.map((row) => row.id))
  const missingTop = top.filter((row) => !rendered.has(row.id))
  const missingBottom = bottom.filter((row) => !rendered.has(row.id))
  if (missingTop.length === 0 && missingBottom.length === 0) return rows

  return [...missingTop, ...rows, ...missingBottom]
}

/** Sub-pixel differences are rounding, not layout. */
const EPSILON = 0.5

function setPixels(element: HTMLElement, property: string, value: number) {
  const current = Number.parseFloat(element.style.getPropertyValue(property))
  if (Math.abs((Number.isNaN(current) ? 0 : current) - value) < EPSILON) return
  element.style.setProperty(property, `${value}px`)
}

/**
 * Publishes the offsets a pinned row sticks at.
 *
 * A pinned row is `position: sticky`, and sticky wants a `top` — an offset from
 * the edge of the scroll container, which is not where a pinned row belongs.
 * Two things are already parked at that edge:
 *
 * - **The sticky header**, which sits above the body and is opaque. A pinned
 *   row given `top: 0` slides underneath it and disappears; the reason to pin
 *   the row was to keep it visible.
 * - **The rows pinned before it.** Sticky offsets do not stack on their own,
 *   so every top-pinned row given the same `top` lands in exactly the same
 *   place — pin three rows and you see one, with two more hidden behind it.
 *
 * So each row's offset is the height of the sticky header plus the heights of
 * the pinned rows that come before it, and the mirror of that for the bottom.
 * None of those heights is knowable up front: a header wraps at narrow widths,
 * a row grows with its content, and both change with density. They are measured
 * from the DOM and published as custom properties — `--rtc-sticky-head-height`
 * and `--rtc-sticky-foot-height` on the scroll container, which the pinned
 * sections read too, and `--rtc-pinned-row-offset` per row.
 *
 * Written straight to the elements rather than round-tripped through state:
 * this is layout output, not something anyone chose, and a re-render per
 * measurement would land the table in a loop through its own row heights.
 */
export function useStickyPinnedRows<TData extends RowData>(
  table: DataTableInstance<TData>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const options = table.dataTableOptions
  const enabled = !!options.enableRowPinning
  // Only a *sticky* header is in the way. One that scrolls with the body leaves
  // the edge of the container free, and a pinned row should take it.
  const stickyHeader = options.enableStickyHeader ?? false
  const stickyFooter = options.enableStickyFooter ?? false

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const head = stickyHeader ? container.querySelector('.rtc-thead') : null
    const foot = stickyFooter ? container.querySelector('.rtc-tfoot') : null
    const headHeight = head?.getBoundingClientRect().height ?? 0
    const footHeight = foot?.getBoundingClientRect().height ?? 0
    setPixels(container, '--rtc-sticky-head-height', headHeight)
    setPixels(container, '--rtc-sticky-foot-height', footHeight)

    // Rows lifted into a pinned section need no offset of their own: the
    // section is the sticky element and its rows stack inside it in flow.
    const body = container.querySelector('.rtc-tbody:not([data-rtc-pinned-section])')
    if (!body) return

    for (const position of ['top', 'bottom'] as const) {
      const rows = [
        ...body.querySelectorAll<HTMLElement>(`:scope > .rtc-tr[data-rtc-row-pinned="${position}"]`),
      ]
      if (position === 'bottom') rows.reverse()
      // Every height is read before the first offset is written: interleaving
      // them would make the browser re-layout the table once per pinned row.
      const heights = rows.map((row) => row.getBoundingClientRect().height)
      let offset = 0
      rows.forEach((row, index) => {
        setPixels(row, '--rtc-pinned-row-offset', offset)
        offset += heights[index] ?? 0
      })
    }
  }, [containerRef, stickyHeader, stickyFooter])

  // Deliberately without a dependency array: which rows are pinned, and which
  // rows sit between them, changes with pinning, sorting, filtering, paging and
  // the data itself, and none of those resizes anything an observer is watching.
  // The measurement is a handful of reads over the pinned rows alone.
  useEffect(() => {
    if (enabled) measure()
  })

  // What a re-render does not cover: the container changing width, which rewraps
  // header labels and cell text, and the font swap that follows a web font.
  //
  // Rebound when a section appears or disappears, which is the one thing that
  // adds an element worth observing without resizing anything already observed.
  const pinning = table.state.rowPinning
  const sectionKey = `${pinning.top.length}:${pinning.bottom.length}`
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    for (const section of container.querySelectorAll('.rtc-thead, .rtc-tfoot, .rtc-tbody')) {
      observer.observe(section)
    }
    return () => observer.disconnect()
  }, [enabled, measure, containerRef, sectionKey])
}
