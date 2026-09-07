import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { RowData } from '@tanstack/react-table'

import { isDisplayColumnId } from './displayColumnIds'
import { setPixelProperty } from './utils'
import type {
  DataTableColumnInstance,
  DataTableHeaderOrientation,
  DataTableInstance,
  DataTableOptions,
} from './types'

/**
 * Header labels set on a diagonal.
 *
 * A checklist column holds a tick and a cross. Its header holds "Security
 * training reviewed", which is eight times as wide as anything under it, and a
 * table of twenty such columns is nearly all header — the reason spreadsheets
 * have had rotated headers since long before the web. Turning the label off the
 * horizontal trades the width it wanted for height the table has to spare, and
 * the columns go back to being as wide as their data.
 *
 * The rotation itself is CSS. What CSS cannot do is let the result take part in
 * layout: a `transform` is applied after sizing, so a rotated label still
 * occupies its flat box and the row is still as tall as one line of text, with
 * the label standing over whatever is above it. There is no `min-height:
 * rotated-content`, so the three numbers below are measured here and published
 * as custom properties the stylesheet reads:
 *
 * - `--rtc-header-diagonal-height`, the height the tallest label needs.
 * - `--rtc-header-diagonal-inset`, how far along the row every label starts,
 *   which is what keeps the corner it leans away from inside its own cell.
 * - `--rtc-header-diagonal-rule`, the length of the line each label sits on
 *   where the table draws vertical borders — the boundary a turned header can
 *   use, since a vertical one crosses every label leaning over it. Carried on
 *   past the label to the top of the band, so every rule ends level.
 * - `--rtc-header-diagonal-gutter`, the strip at the end of the table that the
 *   longest label — or its rule, which reaches further — leans into, so it is
 *   not cut off at the edge of the scroll container.
 *
 * The geometry is one right-angled triangle. A label is a box `length` long and
 * `thickness` tall, pinned by the corner it descends to and turned by `angle`,
 * so it reaches `length·sin` above that corner plus the `thickness·cos` its own
 * box still occupies there, and `length·cos` along the row. The corner it
 * *leans away from* swings out by `thickness·sin` on the other side, which is
 * what the inset pays for: shifted along the row by that much, a label starts
 * exactly at its cell's padding edge — the same place a flat one does — instead
 * of hanging over the cell before it.
 */

/** Degrees counter-clockwise from horizontal, when `headerAngle` is not given. */
export const DEFAULT_HEADER_ANGLE = 45

const DIAGONAL_CELL = '.rtc-th[data-rtc-header-orientation="diagonal"]'

const PUBLISHED_PROPERTIES = [
  '--rtc-header-diagonal-height',
  '--rtc-header-diagonal-inset',
  '--rtc-header-diagonal-rule',
  '--rtc-header-diagonal-gutter',
]

/**
 * `useLayoutEffect` in a browser, `useEffect` where there is no layout to read.
 *
 * The header's height is this measurement's output, so reading it a frame late
 * means a frame of labels standing over the toolbar. React warns about a layout
 * effect during server rendering, where there is nothing to measure anyway.
 */
const useMeasureEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * The angle to render at: `headerAngle`, bounded.
 *
 * Past 90° the text is upside down, and at 0° it is simply horizontal — which
 * is what `headerOrientation` says, rather than something to reach by winding
 * the angle down to nothing.
 */
export function resolveHeaderAngle<TData extends RowData>(
  options: DataTableOptions<TData>,
): number {
  const angle = options.headerAngle ?? DEFAULT_HEADER_ANGLE
  if (!Number.isFinite(angle)) return DEFAULT_HEADER_ANGLE
  const magnitude = Math.min(90, Math.max(1, Math.abs(angle)))
  return angle < 0 ? -magnitude : magnitude
}

/**
 * Which way the labels climb, from the sign of the angle.
 *
 * `end` — a positive angle, counter-clockwise, the classic spreadsheet header —
 * climbs towards the end of the row, so a label leans over the columns *after*
 * its own and the table reserves its gutter on that side. `start` mirrors it.
 * Either way the label's foot lands in the column it names.
 */
export function resolveHeaderLean<TData extends RowData>(
  options: DataTableOptions<TData>,
): 'start' | 'end' {
  return resolveHeaderAngle(options) < 0 ? 'start' : 'end'
}

/**
 * How one column's header is set.
 *
 * The column's own `meta` wins, in both directions: a table of diagonal headers
 * keeps its identifying columns flat, and a table of flat ones can turn a
 * single cramped column. The generated columns — select, expand, row numbers,
 * actions — are never turned by the table-level option: they hold a control
 * rather than a label, and a rotated checkbox is not a header.
 */
export function resolveHeaderOrientation<TData extends RowData>(
  options: DataTableOptions<TData>,
  column: DataTableColumnInstance<TData, any>,
): DataTableHeaderOrientation {
  const own = column.columnDef.meta?.headerOrientation
  if (own) return own
  if ((options.headerOrientation ?? 'horizontal') === 'horizontal') return 'horizontal'
  return isDisplayColumnId(column.id) ? 'horizontal' : 'diagonal'
}

/** Whether any visible column asks for a diagonal header. */
export function usesDiagonalHeaders<TData extends RowData>(
  table: DataTableInstance<TData>,
): boolean {
  const options = table.dataTableOptions
  return table
    .getVisibleLeafColumns()
    .some((column) => resolveHeaderOrientation(options, column as never) === 'diagonal')
}

/** A label's flat box, before it is turned. */
interface HeaderBox {
  length: number
  thickness: number
}

function readPixels(element: HTMLElement, property: string): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(property))
  return Number.isNaN(value) ? 0 : value
}

/**
 * Measures the diagonal headers and publishes what the stylesheet needs.
 *
 * Written straight to the table element rather than round-tripped through
 * state, for the reason `useStickyPinnedRows` gives: this is layout output, not
 * something anyone chose, and a render per measurement would put the table in a
 * loop through its own header. The table element is the one ancestor both rules
 * that consume these can read — the header row's height, and the gutter, which
 * has to be padding on the table because `padding` does not apply to a
 * `table-row` box.
 *
 * Nothing here depends on a number this function itself writes. The label boxes
 * are `max-content` and out of flow, so neither the row's height nor the
 * gutter changes them, and the gutter is measured against each column's
 * declared `getSize()` rather than its rendered width — which the gutter does
 * move, in the layout modes where columns share the leftover space. Measuring
 * the rendered width instead makes each pass disagree with the last one and the
 * table settles by oscillating.
 */
export function useDiagonalHeaderLayout<TData extends RowData>(
  table: DataTableInstance<TData>,
  headRef: React.RefObject<HTMLTableSectionElement | null>,
  /**
   * Identity of the rendered column window, when columns are virtualized. A
   * label can only be measured while it is mounted, so a new window is a new
   * set of labels; see `useHeaderContentFit`, which carries its measurements
   * forward for the same reason.
   */
  columnWindowKey?: string,
) {
  const options = table.dataTableOptions
  const enabled = usesDiagonalHeaders(table)
  const angle = resolveHeaderAngle(options)
  // Whether the stylesheet draws a rule along each label, which it does in
  // place of the vertical border a turned header cannot use — a line straight
  // up the band crosses every label leaning over it. The rule reaches further
  // than the label does, so the gutter has to know.
  const borders = options.enableBorders ?? 'horizontal'
  const hasRules = borders === true || borders === 'all' || borders === 'vertical'

  const boxesRef = useRef<Record<string, HeaderBox>>({})

  // Read through a ref so `measure` stays stable: the instance is a fresh
  // shallow copy on every render, and a `measure` that changed with it would
  // tear the observer down and rebuild it just as often. Only collected for a
  // table that has a diagonal header — the widest table in the suite is 252
  // columns, and none of them is turned.
  const sizesRef = useRef<Record<string, number>>({})
  sizesRef.current = enabled
    ? Object.fromEntries(
        table.getVisibleLeafColumns().map((column) => [column.id, column.getSize()]),
      )
    : {}

  const measure = useCallback(() => {
    const head = headRef.current
    const tableElement = head?.closest<HTMLElement>('.rtc-table')
    if (!head || !tableElement) return

    const radians = (Math.abs(angle) * Math.PI) / 180
    const sin = Math.sin(radians)
    const cos = Math.cos(radians)

    // Carry forward the labels of columns that are still part of the table but
    // are not in the header right now. Without virtualized columns that set is
    // empty; with them, a header that shrank as the longest label scrolled out
    // of the window would move every row on screen underneath the reader.
    const boxes: Record<string, HeaderBox> = {}
    for (const id of Object.keys(sizesRef.current)) {
      const carried = boxesRef.current[id]
      if (carried) boxes[id] = carried
    }

    for (const cell of head.querySelectorAll<HTMLElement>(DIAGONAL_CELL)) {
      const id = cell.dataset.rtcColumnId
      const content = cell.querySelector<HTMLElement>('.rtc-th-content')
      if (!id || !content) continue
      // `offsetWidth`/`offsetHeight`, not a bounding rect: the rect of a
      // rotated element is the box that contains it, which is the answer this
      // is working towards rather than the input to it.
      boxes[id] = { length: content.offsetWidth, thickness: content.offsetHeight }
    }
    boxesRef.current = boxes

    let height = 0
    let inset = 0
    for (const box of Object.values(boxes)) {
      height = Math.max(height, box.length * sin + box.thickness * cos)
      inset = Math.max(inset, box.thickness * sin)
    }
    height = Math.ceil(height)

    // The rule each label runs along, where the table draws vertical borders:
    // the same line the label sits on, carried on to the top of the band so
    // that every label's rule ends flush with the last. It climbs from the
    // label's own foot, which is `padding-y` up from the row's bottom border.
    const paddingX = readPixels(head, '--rtc-cell-padding-x')
    const paddingY = readPixels(head, '--rtc-cell-padding-y')
    const rise = height + paddingY - readPixels(head, '--rtc-border-width')
    const rule = rise / sin

    // The gutter every label needs past its *own* column, rather than past the
    // table: what a column has beyond its own width is whichever neighbours are
    // rendered beside it, and that changes as a window of columns scrolls. A
    // gutter measured from the widest overhang is a few pixels more than the
    // last column strictly needs, and it holds still.
    //
    // A rule reaches further along the row than the label it runs under, since
    // it carries on to the top of the band — but only where one is drawn.
    const ruleReach = hasRules ? rule * cos : 0
    let gutter = 0
    for (const [id, box] of Object.entries(boxes)) {
      const reach = Math.max(box.length * cos, ruleReach)
      gutter = Math.max(gutter, paddingX + inset + reach - (sizesRef.current[id] ?? 0))
    }

    setPixelProperty(tableElement, '--rtc-header-diagonal-height', height)
    setPixelProperty(tableElement, '--rtc-header-diagonal-inset', Math.ceil(inset))
    setPixelProperty(tableElement, '--rtc-header-diagonal-rule', Math.ceil(rule))
    setPixelProperty(tableElement, '--rtc-header-diagonal-gutter', Math.max(0, Math.ceil(gutter)))
  }, [headRef, angle, hasRules])

  // Density, column visibility, translated labels and web-font loading all
  // change how much room a label wants, and observing the header covers every
  // one of them without enumerating any. `columnWindowKey` is the one thing an
  // observer cannot cover: virtualized columns mount labels that did not exist
  // to be observed when this ran, and they arrive without resizing anything
  // already on screen.
  useMeasureEffect(() => {
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
    if (enabled || Object.keys(boxesRef.current).length === 0) return
    boxesRef.current = {}
    const tableElement = headRef.current?.closest<HTMLElement>('.rtc-table')
    for (const property of PUBLISHED_PROPERTIES) tableElement?.style.removeProperty(property)
  }, [enabled, headRef])
}
