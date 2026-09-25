import type { RowData } from '@tanstack/react-table'

import type {
  DataTableCellOverflow,
  DataTableCellOverflowReveal,
  DataTableColumnInstance,
  DataTableInstance,
} from './types'

/** Lines a `clamp` cell shows when neither the column nor the table says. */
export const DEFAULT_CELL_MAX_LINES = 2

/**
 * How one column lays out and reveals a value too long for it.
 *
 * The column's `meta` wins over the table, the same precedence as
 * `enableClickToCopy`: the table states the house style, and a prose column or
 * an identifier column says what it needs instead.
 */
export function resolveCellOverflow<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): { overflow: DataTableCellOverflow; maxLines: number; reveal: DataTableCellOverflowReveal } {
  const options = table.dataTableOptions
  const meta = column.columnDef.meta
  return {
    overflow: meta?.cellOverflow ?? options.cellOverflow ?? 'truncate',
    maxLines: Math.max(1, meta?.cellMaxLines ?? options.cellMaxLines ?? DEFAULT_CELL_MAX_LINES),
    reveal: meta?.cellOverflowReveal ?? options.cellOverflowReveal ?? 'peek',
  }
}

/**
 * The elements inside a cell that can cut a value short.
 *
 * The value span clips, and so does the click-to-copy button inside it — which
 * is sized to the span, so it is the button that overflows and the span that
 * looks as if everything fits.
 */
function clippingElements(value: HTMLElement): HTMLElement[] {
  return [value, ...value.querySelectorAll<HTMLElement>('.rtc-copy-cell')]
}

/**
 * Whether a cell is showing less than its whole value, read off the layout.
 *
 * Asked at the moment it matters — the pointer or the focus arriving — rather
 * than tracked: a table of ten thousand cells does not need ten thousand
 * observers to answer a question it is asked about one cell at a time. Height
 * counts too, which is how a `clamp` cell reports the lines it dropped.
 */
export function isCellValueTruncated(value: HTMLElement): boolean {
  return clippingElements(value).some(
    (element) =>
      element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
  )
}

/** The value element of a body cell, when it is showing one (not an editor, not blank). */
export function cellValueElement(cell: Element): HTMLElement | null {
  return cell.querySelector<HTMLElement>(':scope > .rtc-cell-inner > .rtc-cell-value')
}

/**
 * The width a cell would need to show its content on one line, in pixels.
 *
 * The cell's own chrome (padding, border), plus every item in its content row
 * at the width it renders at, plus whatever the clipping elements are hiding.
 * Not `scrollWidth` on the cell: the value clips, so what it hides never
 * reaches its parent's scroll width.
 */
function requiredWidth(cell: HTMLElement, content: HTMLElement | null, clipping: HTMLElement[]) {
  const style = getComputedStyle(cell)
  const chrome =
    parseFloat(style.paddingInlineStart) +
    parseFloat(style.paddingInlineEnd) +
    parseFloat(style.borderInlineStartWidth) +
    parseFloat(style.borderInlineEndWidth)
  if (!content) return chrome

  // The header's spacer is there to take up whatever room is left, so its
  // width is the room left rather than anything the content needs.
  const items = (Array.from(content.children) as HTMLElement[]).filter(
    (item) => !item.classList.contains('rtc-th-spacer'),
  )
  const gap = parseFloat(getComputedStyle(content).columnGap) || 0
  const laidOut =
    items.reduce((sum, item) => sum + item.getBoundingClientRect().width, 0) +
    gap * Math.max(0, items.length - 1)
  const hidden = Math.max(0, ...clipping.map((element) => element.scrollWidth - element.clientWidth))
  return chrome + laidOut + hidden
}

/**
 * Size a column to its widest rendered value — the spreadsheet's double-click
 * on a column edge.
 *
 * Measures what is mounted, which is the current page, or the current window
 * of a virtualized body: a column fitted to rows nobody has scrolled to would
 * have to render all of them first. The header counts too, so fitting never
 * leaves a label narrower than it was.
 *
 * A `wrap` or `clamp` column is measured as if it did not wrap —
 * `data-rtc-measuring` puts every value back on one line for the length of one
 * synchronous read, which the browser lays out but never paints. Otherwise a
 * wrapping column would always report that it fits exactly as it is.
 *
 * Upright only. Transposed, a column is a band and its size is a height.
 */
export function fitColumnToContent<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
  from: Element | null,
): void {
  const root = from?.closest<HTMLElement>('.rtc-root')
  if (!root || table.ui.transposed) return

  const escaped = CSS.escape(column.id)
  // Only this table's cells: a detail panel can hold a table of its own, with
  // column ids that happen to match.
  const cells = Array.from(
    root.querySelectorAll<HTMLTableCellElement>(
      `.rtc-td[data-rtc-column-id="${escaped}"], .rtc-th[data-rtc-column-id="${escaped}"]`,
    ),
  ).filter((cell) => cell.closest('.rtc-root') === root && cell.colSpan <= 1)

  root.setAttribute('data-rtc-measuring', '')
  let widest = 0
  try {
    for (const cell of cells) {
      if (cell.classList.contains('rtc-th')) {
        const content = cell.querySelector<HTMLElement>(':scope > .rtc-th-content')
        const labels = Array.from(cell.querySelectorAll<HTMLElement>('.rtc-th-label'))
        widest = Math.max(widest, requiredWidth(cell, content, labels))
      } else {
        const value = cellValueElement(cell)
        if (!value) continue
        const content = cell.querySelector<HTMLElement>(':scope > .rtc-cell-inner')
        widest = Math.max(widest, requiredWidth(cell, content, clippingElements(value)))
      }
    }
  } finally {
    root.removeAttribute('data-rtc-measuring')
  }
  if (!widest) return

  const { minSize = 0, maxSize = Number.POSITIVE_INFINITY } = column.columnDef
  // Rounded up, and a pixel spare: widths are fractional and `scrollWidth` is
  // not, and a column that comes out a hair short truncates the very value it
  // was fitted to.
  const next = Math.min(maxSize, Math.max(minSize, Math.ceil(widest) + 1))
  table.setColumnSizing((old) => ({ ...old, [column.id]: next }))
}
