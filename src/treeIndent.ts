/**
 * Tree indentation: how far a nested row's expand chevron moves, and how much
 * room the expand column has to keep for it.
 *
 * Both answers come from one number, which is why it lives in JavaScript
 * rather than in the stylesheet. The chevron is indented *inside* the expand
 * column, so the column's width and the offset have to agree: a CSS variable
 * could change the step without the column knowing, and the deepest chevron
 * would be clipped by the cell holding it — body cells clip, which is what
 * keeps one long value from widening a column.
 */

/** One level of indentation, in pixels. */
export const TREE_INDENT_STEP = 16

/**
 * The inline offset of a row's chevron, as a CSS length — `undefined` at the
 * root, so nothing is written to the DOM for a table that does not nest.
 */
export function treeIndentOffset(depth: number): string | undefined {
  return depth > 0 ? `${depth * TREE_INDENT_STEP}px` : undefined
}

/** The width the expand column reserves to hold `maxDepth` levels of chevron. */
export function treeIndentReserve(maxDepth: number): number {
  return Math.max(0, maxDepth) * TREE_INDENT_STEP
}

/**
 * The depth of the deepest row `getSubRows` can produce, counting roots as 0.
 *
 * Read from the data rather than from the row model, because it decides a
 * column's width and columns are built before there are any rows. It is also
 * why the answer covers the whole tree and not just the expanded part of it:
 * a column that grew as branches opened would shift every other column
 * sideways on each click.
 */
export function maxSubRowDepth<TData>(
  data: TData[],
  getSubRows: (originalRow: TData, index: number) => TData[] | undefined,
): number {
  let depth = 0
  // One level at a time, and iteratively: a recursive walk would put a deep
  // tree on the call stack, and only the number of levels is being counted.
  // Sibling groups stay separate arrays so each row keeps the index within its
  // own parent that TanStack would pass it.
  let level: Array<TData[]> = [data]
  while (level.length > 0) {
    const next: Array<TData[]> = []
    for (const rows of level) {
      for (let index = 0; index < rows.length; index += 1) {
        const subRows = getSubRows(rows[index]!, index)
        if (subRows && subRows.length > 0) next.push(subRows)
      }
    }
    if (next.length === 0) break
    depth += 1
    level = next
  }
  return depth
}
