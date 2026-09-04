import type { RowData } from '@tanstack/react-table'

import type { DataTableHeader, DataTableInstance, DataTableRow } from './types'

/**
 * The axis swap, resolved in one place.
 *
 * A transposed table renders one `<tr>` per column — a *band* — and one column
 * per record. Everything that is directional therefore has to be asked which
 * way round the table is, and the answers all live here so the body, the header
 * cells and the drag layer cannot disagree about which axis they are on.
 *
 * The markup stays a real `<table>`: bands are rows, records are columns, and
 * the header cells become `<th scope="row">` at the head of each band. That is
 * what keeps grouped headers (`colSpan` and `rowSpan` swap places), detail
 * panels and `position: sticky` working on the browser's own terms rather than
 * on a second, transposed implementation of each.
 */

/** One header cell of a transposed table, with the spans it renders at. */
export interface TransposedHeader<TData extends RowData> {
  header: DataTableHeader<TData, any>
  /** Bands the cell covers. The upright table's `colSpan`. */
  bandSpan: number
  /** Header levels the cell covers. The upright table's `rowSpan`. */
  levelSpan: number
  /** Which level it came from, and so where along the band it sits. */
  level: number
}

/** The block of header (or footer) cells that leads (or trails) every band. */
export interface TransposedHeaderBlock<TData extends RowData> {
  /** How many levels deep it is, and so how many cells wide the block is. */
  levels: number
  /** The cells each band emits, in level order. Indexed by band. */
  byBand: Array<Array<TransposedHeader<TData>>>
}

/**
 * Turns header groups into per-band header cells.
 *
 * Upright, a header group is a row and a header spans `colSpan` columns.
 * Transposed, a header group is a *column* and the same header spans that many
 * bands — so it is emitted once, on the first band it covers, and the spans
 * trade places. Placeholders are carried through exactly as the upright header
 * carries them, so the two paths produce the same grid, only turned.
 *
 * Footer groups arrive leaf-first, which is the order that puts the leaf footer
 * next to the records and the group footer outside it — the mirror of the
 * upright footer, where the leaf row sits above the group row.
 */
function transposeHeaderGroups<TData extends RowData>(
  groups: Array<{ headers: Array<DataTableHeader<TData, any>> }>,
  bandCount: number,
): TransposedHeaderBlock<TData> {
  const byBand: Array<Array<TransposedHeader<TData>>> = Array.from(
    { length: bandCount },
    () => [],
  )

  groups.forEach((group, level) => {
    let band = 0
    for (const header of group.headers) {
      const bandSpan = Math.max(1, header.colSpan)
      // Emitted on the first band it covers, and only if that band exists: a
      // span starting past the last one belongs to a column the band list does
      // not have, and dropping it is what keeps the block rectangular.
      byBand[band]?.push({
        header,
        bandSpan,
        levelSpan: header.rowSpan > 1 ? header.rowSpan : 1,
        level,
      })
      band += bandSpan
    }
  })

  return { levels: groups.length, byBand }
}

/** One record — an upright row — as the transposed table lays it out. */
export interface TransposedRecord<TData extends RowData> {
  row: DataTableRow<TData>
  /** Position along the record axis, counted over every rendered record. */
  index: number
  /** Which end of the record axis it is stuck to, if any. */
  pinned: false | 'start' | 'end'
  /** How many pinned records lie between it and its edge — its sticky offset. */
  pinIndex: number
  /** Innermost record of its pinned block: the one that carries the shadow. */
  pinEdge: boolean
  /** Whether an open detail panel follows it. */
  hasDetail: boolean
}

/**
 * The records the transposed body renders, pinned ones lifted to the ends.
 *
 * Upright, a pinned *column* is moved to the start or end of every row and made
 * sticky there; a pinned *row* stays where it is and sticks to the top or
 * bottom of the viewport. Transposed those two swap, so a pinned row is lifted
 * out of the record order and stuck to the inline start or end — which is also
 * the only arrangement whose sticky offsets are computable, since an offset has
 * to count a contiguous block from one edge.
 *
 * `rowPinningDisplayMode` keeps its meaning: `sticky` sticks both blocks, and
 * the explicit `top` / `bottom` / `top-and-bottom` modes render them as plain
 * leading and trailing groups. `top` reads as "start" here and `bottom` as
 * "end", the same rotation the rest of the table makes.
 */
function transposedRecords<TData extends RowData>(
  table: DataTableInstance<TData>,
): Array<TransposedRecord<TData>> {
  const options = table.dataTableOptions
  const pinningOn = options.enableRowPinning ?? false
  const mode = options.rowPinningDisplayMode ?? 'sticky'

  const showStart = mode === 'sticky' || mode === 'top' || mode === 'top-and-bottom'
  const showEnd = mode === 'sticky' || mode === 'bottom' || mode === 'top-and-bottom'

  const startRows = pinningOn && showStart ? (table.getTopRows() as Array<DataTableRow<TData>>) : []
  const endRows = pinningOn && showEnd ? (table.getBottomRows() as Array<DataTableRow<TData>>) : []

  // `getRenderRows` only drops pinned rows when they are rendered in sections
  // of their own; under `sticky` it leaves them in place, and they would
  // otherwise be rendered twice.
  const centerRows = table
    .getRenderRows()
    .filter((row) => !pinningOn || !row.getIsPinned())

  const sticky = mode === 'sticky'
  const hasPanel = detailPanelPredicate(table)

  const records: Array<TransposedRecord<TData>> = []
  const push = (rows: Array<DataTableRow<TData>>, pinned: false | 'start' | 'end') => {
    rows.forEach((row, position) => {
      // Distance from the edge the block is stuck to, so an end-pinned record
      // counts the records between it and the trailing edge, not the leading
      // one. `pinEdge` marks the innermost record, which carries the shadow
      // that separates the block from the ones that scroll under it.
      const pinIndex = pinned === 'end' ? rows.length - 1 - position : position
      records.push({
        row,
        index: records.length,
        pinned: sticky ? pinned : false,
        pinIndex,
        pinEdge: sticky && pinned !== false && pinIndex === rows.length - 1,
        hasDetail: hasPanel(row),
      })
    })
  }

  push(startRows, 'start')
  push(centerRows, false)
  push(endRows, 'end')

  return records
}

/**
 * Whether a row's detail panel is open.
 *
 * The same predicate `getBodyItems` applies upright — a group row stands for
 * many records and has no `original` for a panel to describe — asked directly
 * here because the transposed body lays panels out beside their record rather
 * than as items in a single render list.
 */
function detailPanelPredicate<TData extends RowData>(
  table: DataTableInstance<TData>,
): (row: DataTableRow<TData>) => boolean {
  if (!table.dataTableOptions.renderDetailPanel) return () => false
  return (row) => row.getIsExpanded() && !row.getIsGrouped()
}

/** What the transposed body is showing, which decides its whole shape. */
export type TransposedMode = 'error' | 'loading' | 'empty' | 'records'

/**
 * Everything the transposed table's geometry depends on, resolved once.
 *
 * Shared with the shell rather than owned by the body, because the `<table>`
 * itself needs two of these numbers. `table-layout: fixed` — which is what
 * makes the column widths the two custom properties promise, rather than
 * whatever the longest email in the data asks for — only applies to a table
 * whose own width is a definite length; asked for `max-content`, the browser
 * falls back to the automatic algorithm and sizes every column from its
 * content. So the width is stated, as the sum of the columns the body is about
 * to render.
 */
export interface TransposedLayout<TData extends RowData> {
  mode: TransposedMode
  /** The leaf header of each band, in render order. */
  bands: Array<DataTableHeader<TData, any>>
  /** Header cells leading each band, or null when `enableTableHead` is off. */
  headers: TransposedHeaderBlock<TData> | null
  /** Footer cells trailing each band, or null when there is no footer. */
  footers: TransposedHeaderBlock<TData> | null
  headerLevels: number
  footerLevels: number
  stickyHead: boolean
  stickyFoot: boolean
  records: Array<TransposedRecord<TData>>
  /** Column position of each record, the detail panels before it counted in. */
  recordColumns: number[]
  /** Placeholder records drawn while loading. */
  skeletonCount: number
  /** Columns the table has in total, header and footer blocks included. */
  columnCount: number
  /** The table's own width, as CSS. */
  width: string
  /** Custom properties the pinned-record offsets are counted from. */
  blockVars: Record<string, string>
}

export function transposedLayout<TData extends RowData>(
  table: DataTableInstance<TData>,
): TransposedLayout<TData> {
  const options = table.dataTableOptions

  const headerGroups = table.getHeaderGroups()
  // The leaf header group is one header per visible column, in render order —
  // the same order `row.getVisibleCells()` comes back in, which is what lets a
  // band and its cells be matched by position.
  const bands = headerGroups.at(-1)?.headers ?? []
  const bandCount = bands.length

  const showHead = options.enableTableHead ?? true
  const headers = showHead ? transposeHeaderGroups(headerGroups, bandCount) : null

  const hasFooter = table.getAllLeafColumns().some((column) => column.columnDef.footer !== undefined)
  const showFoot = (options.enableTableFooter ?? true) && hasFooter
  const footers = showFoot ? transposeHeaderGroups(table.getFooterGroups(), bandCount) : null

  const headerLevels = headers?.levels ?? 0
  const footerLevels = footers?.levels ?? 0

  const records = transposedRecords(table)

  // Skeletons only replace the body on a first load; a refresh with data
  // already on screen shows the progress bar instead so records do not flash.
  const loading =
    !!options.isLoading && !options.showProgressBars && options.data.length === 0
  const mode: TransposedMode = options.isLoadingError
    ? 'error'
    : loading
      ? 'loading'
      : records.length === 0
        ? 'empty'
        : 'records'
  const skeletonCount = options.skeletonRowCount ?? 5

  // Column positions along the record axis. An open detail panel is a column of
  // its own beside its record, so positions are counted rather than derived.
  const recordColumns: number[] = []
  let cursor = headerLevels
  let detailCount = 0
  for (const record of records) {
    recordColumns.push(cursor)
    cursor += record.hasDetail ? 2 : 1
    if (record.hasDetail) detailCount += 1
  }

  // How many record columns are actually drawn: the records themselves, the
  // placeholders standing in for them, or the one cell the empty and error
  // states put where they would have been.
  const recordCount = mode === 'records' ? records.length : mode === 'loading' ? skeletonCount : 0
  const columnCount = headerLevels + Math.max(1, recordCount) + detailCount + footerLevels

  const terms: Array<[number, string]> = [
    [headerLevels + footerLevels, '--rtc-transposed-header-width'],
    [recordCount, '--rtc-transposed-record-width'],
    [detailCount, '--rtc-transposed-detail-width'],
  ]
  const sum = terms
    .filter(([count]) => count > 0)
    .map(([count, name]) => `var(${name}) * ${count}`)
    .join(' + ')

  const stickyHead = showHead && (options.enableStickyHeader ?? false)
  const stickyFoot = showFoot && (options.enableStickyFooter ?? false)

  return {
    mode,
    bands,
    headers,
    footers,
    headerLevels,
    footerLevels,
    stickyHead,
    stickyFoot,
    records,
    recordColumns,
    skeletonCount,
    columnCount,
    // The empty and error states have no width of their own to state: their one
    // cell fills whatever is left, so the container sizes the table instead.
    width: recordCount > 0 && sum ? `calc(${sum})` : '100%',
    blockVars: {
      // What a pinned record has to clear before it comes to rest. Published as
      // custom properties rather than folded into each offset so a density or
      // theme change moves the pins with the columns they sit beside.
      '--rtc-transposed-label-size': stickyHead
        ? `calc(var(--rtc-transposed-header-width) * ${headerLevels})`
        : '0px',
      '--rtc-transposed-footer-size': stickyFoot
        ? `calc(var(--rtc-transposed-header-width) * ${footerLevels})`
        : '0px',
    },
  }
}

/**
 * Sticky offset for a band pinned by column pinning.
 *
 * Bands are uniform: a row is `--rtc-row-height` tall whatever is in it, unless
 * `enableColumnResizing` gave this one an explicit height, and a resized band
 * is not one that is also pinned in practice. Expressed in CSS rather than
 * measured so it stays correct through a density change, which no observer
 * would be told about.
 */
export function bandPinOffset(index: number): string {
  return `calc(var(--rtc-row-height) * ${index})`
}

/**
 * Sticky offset for a record pinned by row pinning.
 *
 * Counts the block already stuck to that edge first — when the header column
 * sticks, a start-pinned record has to come to rest beside it rather than
 * underneath it, and the footer column does the same at the other end — then
 * one record width per record between it and the edge. Both block sizes are
 * published by the body as custom properties, and default to zero for a table
 * whose header or footer scrolls away like any other column.
 */
export function recordPinOffset(index: number, pinned: 'start' | 'end'): string {
  const block = pinned === 'start' ? '--rtc-transposed-label-size' : '--rtc-transposed-footer-size'
  return `calc(var(${block}, 0px) + var(--rtc-transposed-record-width) * ${index})`
}

/** Sticky offset for the header cell at `level` of the label block. */
export function labelPinOffset(level: number): string {
  return `calc(var(--rtc-transposed-header-width) * ${level})`
}
