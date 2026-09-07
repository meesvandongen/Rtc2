import { useCallback, useEffect } from 'react'
import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance, DataTableOptions, DataTableRow } from './types'

/**
 * Where pinned rows are rendered.
 *
 * `sticky` leaves a pinned row exactly where the sort put it and holds it
 * against *both* edges of the scroll container — see `stickTo`, which is what
 * makes that work. The row keeps its place among its neighbours, so you can
 * still see where it ranks, and it is on screen the whole time either way. In
 * that mode a pinned row is simply pinned: the direction in `rowPinning` picks
 * no side, since both are held.
 *
 * The other three modes lift pinned rows out into a section of their own, above
 * or below the rows that remain — a block with its own boundary, which stacks
 * and scrolls as one, and which is where the direction does decide something.
 *
 * The mode chooses which directions the pin control offers; it does not decide
 * which sections exist. A table in `top` mode that is handed
 * `initialState.rowPinning.bottom` still renders a bottom section, because the
 * alternative is a row that is pinned and nowhere to be seen.
 */
export function usesPinnedRowSections<TData extends RowData>(
  options: DataTableOptions<TData>,
  /** Whether the table is transposed, where a record is a column. */
  transposed = false,
): boolean {
  if (!options.enableRowPinning) return false
  if ((options.rowPinningDisplayMode ?? 'sticky') !== 'sticky') return true
  // A transposed window is held open by spacers rather than by taking rows out
  // of flow, so a record inside one is an ordinary cell and sticks like any
  // other. The reason below does not reach it.
  if (transposed) return false
  // A virtualized row is positioned absolutely against a spacer the height of
  // the whole scroll range, and an absolutely positioned row cannot also be a
  // sticky one. Rather than let `sticky` quietly do nothing there, the pinned
  // rows are lifted into sections, which sit outside the virtualized body and
  // stay put on their own.
  return options.enableRowVirtualization ?? false
}

/**
 * The rows to render in the sticky mode: the row model as it stands, with the
 * pinned rows it has dropped folded back in.
 *
 * Pinned rows keep their place — that is the mode — so the only ones that have
 * to be placed are the ones the model no longer contains. `keepPinnedRows`
 * (TanStack's, on by default) is what keeps them alive: `getTopRows()` still
 * returns a row after a filter has excluded it or a page has moved past it,
 * which is what makes pinning a row worth doing while you look for something
 * else. A row with no place left in the order is put at the end it was pinned
 * to, which is the one thing the direction still decides here.
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
 * A pinned row in the body is `position: sticky` with **both** a `top` and a
 * `bottom`, which is what lets it keep its place in the order and still never
 * leave the screen. One offset holds an element in one direction only: given a
 * `top` alone, a row is held under the header once the scroll passes it and is
 * simply not on screen before that; given a `bottom` alone, it is held on the
 * floor until the scroll reaches it and comes loose from there on. With both,
 * the row sits where the sort put it while that place is on screen, docks under
 * the header once the scroll goes past it, and docks on the floor while the
 * scroll is still above it. Which is also why the direction it was pinned to
 * does not choose a side in this mode: both sides are held.
 *
 * Neither offset is 0, because two things are already parked at each edge:
 *
 * - **A sticky header or footer**, which is opaque and sits over the body. A
 *   row docked at `top: 0` slides underneath the header and disappears; the
 *   reason to pin it was to keep it visible.
 * - **The rows pinned before it**, or after it at the other edge. Sticky
 *   offsets do not stack on their own, so pinned rows given the same `top` all
 *   land in exactly the same place — pin three rows and you see one, with two
 *   more hidden behind it. The rows dock in the order they appear in, so a row's
 *   top offset clears the pinned rows above it and its bottom offset clears the
 *   pinned rows below it.
 *
 * None of those heights is knowable up front: a header wraps at narrow widths, a
 * row grows with its content, and both change with density. They are measured
 * from the DOM and published as custom properties — `--rtc-sticky-head-height`
 * and `--rtc-sticky-foot-height` on the scroll container, which the pinned
 * sections read too, and `--rtc-pinned-row-offset-top` / `-bottom` per row.
 * Material React Table computes the same two offsets from a fixed row height per
 * density; measuring holds up when a row is not that height.
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
  // Transposed, the rows carrying `data-rtc-row-pinned` are the *bands* — the
  // columns pinning put at the ends of the band order — so the same
  // measurement stacks them, and the same stylesheet rules dock them. What it
  // must not do there is measure a `<thead>`: a transposed table has none, and
  // nothing is parked at the top edge for a docked band to clear.
  const transposed = table.ui.transposed
  const enabled = transposed
    ? !!options.enableColumnPinning
    : !!options.enableRowPinning
  // Only a *sticky* header is in the way. One that scrolls with the body leaves
  // the edge of the container free, and a pinned row should take it.
  const stickyHeader = !transposed && (options.enableStickyHeader ?? false)
  const stickyFooter = !transposed && (options.enableStickyFooter ?? false)

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

    // One list, in the order the rows are rendered in, however each of them was
    // pinned: a row's top offset is what the pinned rows before it take up, and
    // its bottom offset what the pinned rows after it take up, so the same set
    // of rows stacks correctly at whichever edge each of them is docked to.
    const rows = [...body.querySelectorAll<HTMLElement>(':scope > .rtc-tr[data-rtc-row-pinned]')]
    // Every height is read before the first offset is written: interleaving
    // them would make the browser re-layout the table once per pinned row.
    const heights = rows.map((row) => row.getBoundingClientRect().height)

    let above = 0
    rows.forEach((row, index) => {
      setPixels(row, '--rtc-pinned-row-offset-top', above)
      above += heights[index] ?? 0
    })

    let below = 0
    for (let index = rows.length - 1; index >= 0; index--) {
      setPixels(rows[index]!, '--rtc-pinned-row-offset-bottom', below)
      below += heights[index] ?? 0
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
  const rows = table.state.rowPinning
  const columns = table.state.columnPinning
  const sectionKey = transposed
    ? `${columns.start.length}:${columns.end.length}`
    : `${rows.top.length}:${rows.bottom.length}`
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
