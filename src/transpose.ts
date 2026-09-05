import type { RowData } from '@tanstack/react-table'

import { usesPinnedRowSections } from './pinnedRows'
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

/**
 * How a record is held.
 *
 * `both` is the sticky mode: the record keeps its place among its neighbours
 * and is held against *both* inline edges, so it sits where the sort put it
 * while that place is on screen, docks beside the label column once the scroll
 * goes past it, and waits at the trailing edge while the scroll is still before
 * it. `start` and `end` are a section: a block lifted out of the order to one
 * edge, which is held against that edge alone.
 */
export type TransposedPin = false | 'start' | 'end' | 'both'

/** One record — an upright row — as the transposed table lays it out. */
export interface TransposedRecord<TData extends RowData> {
  row: DataTableRow<TData>
  /** Position along the record axis, counted over every rendered record. */
  index: number
  /** How the record is held, if at all. */
  pinned: TransposedPin
  /** Where it docks at the inline start, as CSS. Set for `both` and `start`. */
  pinStart?: string
  /** …and at the inline end. Set for `both` and `end`. */
  pinEnd?: string
  /** Innermost record of a section: the one that carries the block's boundary. */
  pinEdge: boolean
  /** Whether an open detail panel follows it. */
  hasDetail: boolean
}

/**
 * The records the transposed body renders.
 *
 * The two shapes are the upright ones, turned. In the **sticky** mode a pinned
 * record keeps its place — `getRenderRows` leaves it there, folding back any
 * the filter or the page dropped — and is held against both inline edges, which
 * is what lets it stay in the order and still never leave the screen. In the
 * three **section** modes it is lifted into a block at the inline start or end,
 * which is held against that one edge.
 *
 * `top` reads as "start" here and `bottom` as "end", the same rotation the rest
 * of the table makes.
 *
 * Every offset is stated rather than measured, which upright cannot do: a row's
 * height is whatever its tallest cell makes it, but a record column is exactly
 * one `--rtc-transposed-record-width` because the `<colgroup>` says so. So a
 * record's start offset is the label block plus the pinned records before it,
 * and its end offset the footer block plus the pinned records after it — the
 * same stacking `useStickyPinnedRows` measures upright, in closed form.
 */
function transposedRecords<TData extends RowData>(
  table: DataTableInstance<TData>,
): Array<TransposedRecord<TData>> {
  const options = table.dataTableOptions
  const pinningOn = !!options.enableRowPinning
  const sections = usesPinnedRowSections(options, true)

  const startRows = sections ? (table.getTopRows() as Array<DataTableRow<TData>>) : []
  const endRows = sections ? (table.getBottomRows() as Array<DataTableRow<TData>>) : []
  // Already correct for both shapes: sections have had their rows taken out of
  // it, and the sticky mode has had its dropped ones put back.
  const centerRows = table.getRenderRows()

  const hasPanel = detailPanelPredicate(table)

  const records: Array<TransposedRecord<TData>> = []
  const push = (rows: Array<DataTableRow<TData>>, section: 'start' | 'end' | false) => {
    rows.forEach((row, position) => {
      const pinned: TransposedPin = section
        ? section
        : pinningOn && row.getIsPinned()
          ? 'both'
          : false
      records.push({
        row,
        index: records.length,
        pinned,
        // The innermost record of a section — the last of the start block, the
        // first of the end block — is the one with an edge to draw. A record
        // left in the body has none: it is in the order one moment and docked
        // the next, so what marks it is its background.
        pinEdge:
          section === 'start'
            ? position === rows.length - 1
            : section === 'end' && position === 0,
        hasDetail: hasPanel(row),
      })
    })
  }

  push(startRows, 'start')
  push(centerRows, false)
  push(endRows, 'end')

  // The offsets, once every record's place is known. One list in render order,
  // however each of them was pinned: a record's start offset clears the pinned
  // records before it and its end offset those after it, so the same set stacks
  // correctly at whichever edge each of them is docked to.
  const pinned = records.filter((record) => record.pinned !== false)
  pinned.forEach((record, position) => {
    const before = pinned.slice(0, position)
    const after = pinned.slice(position + 1)
    if (record.pinned !== 'end') {
      record.pinStart = `calc(var(--rtc-transposed-label-size, 0px) + ${extentOf(before)})`
    }
    if (record.pinned !== 'start') {
      record.pinEnd = `calc(var(--rtc-transposed-footer-size, 0px) + ${extentOf(after)})`
    }
  })

  return records
}

/**
 * How much room a run of pinned records takes up once docked.
 *
 * The record columns alone. An open detail panel is a column of its own, but it
 * does not dock with the record it belongs to — it has no `data-rtc-pinned` and
 * scrolls under, exactly as an upright detail *row* does under the pinned row
 * above it, which is why `useStickyPinnedRows` does not count it either. Adding
 * its width here would leave a panel-wide gap between two docked records.
 */
function extentOf<TData extends RowData>(records: Array<TransposedRecord<TData>>): string {
  if (records.length === 0) return '0px'
  return `var(--rtc-transposed-record-width) * ${records.length}`
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
  /**
   * The height each band was resized to, by band position, or `undefined` for
   * one still at the density's row height. Read by the windows, which count in
   * pixels, and by the body, which sets it on the row.
   */
  bandSizes: Array<number | undefined>
  /** Bands pinned to the top, which column pinning puts first in the order. */
  pinnedBands: number
  /** …and to the bottom, which it puts last. */
  pinnedBandsEnd: number
  /**
   * Positions of the pinned records, which in the sticky mode are wherever the
   * sort left them rather than at either end — so a window is told the
   * positions to force-mount rather than a count at each edge.
   */
  pinnedRecords: number[]
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

  // The label block sticks by default, which upright it does not. Upright the
  // header row is the near edge of the axis the records run along, so scrolling
  // *across* never takes it away — every column you can see brings its own
  // header with it. Transposed, the labels are at the near edge of the axis the
  // records run along, and without this a scroll to the right leaves a screen
  // of values with nothing saying what any of them are.
  const stickyHead = showHead && (options.enableStickyHeader ?? true)
  const stickyFoot = showFoot && (options.enableStickyFooter ?? false)

  const pinningColumns = options.enableColumnPinning ?? false
  const bandSizes = bands.map(
    (leaf) => table.state.columnSizing[leaf.column.id] as number | undefined,
  )

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
    bandSizes,
    pinnedBands: pinningColumns ? table.getStartVisibleLeafColumns().length : 0,
    pinnedBandsEnd: pinningColumns ? table.getEndVisibleLeafColumns().length : 0,
    pinnedRecords: records.flatMap((record, index) => (record.pinned ? [index] : [])),
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
 * A window over the records, which run across.
 *
 * Produced by the virtualizers in `transposedVirtualizer.ts`; `null` means the
 * axis is not windowed and everything on it is rendered. It carries indexes
 * only: a record column is exactly one `--rtc-transposed-record-width`, since
 * the `<colgroup>` says so, and the extent a spacer has to hold open is
 * therefore that same length times the records it stands in for.
 */
export interface TransposedWindow {
  /** Positions in the full order, ascending, force-mounted pins included. */
  indexes: number[]
}

/**
 * A window over the bands, which run down.
 *
 * A band's *height* is not fixed the way a record's width is — a label cell
 * holding a button is as tall as the button — so the spacers come from the
 * virtualizer's own measured offsets rather than from a sum of custom
 * properties. Measuring is what makes the scroll extent hold still: heights
 * computed as `--rtc-row-height` times a count were out by a couple of pixels
 * over forty bands, and a scroll extent that changes as you scroll is a
 * scrollbar that will not settle.
 */
export interface TransposedBandWindow extends TransposedWindow {
  /** Measured offset of each rendered band, parallel to `indexes`. */
  starts: number[]
  ends: number[]
  /** The axis's whole scroll extent, which the last gap runs up to. */
  totalSize: number
}

/**
 * One entry of the render order: an item to draw, or a spacer standing in for
 * a run of items the window left out.
 */
export type TransposedSlot = { index: number; spacer?: never } | { spacer: string; index?: never }

/**
 * One axis of the render order.
 *
 * A flat list rather than a contiguous run between two pinned blocks, because
 * a pinned item is no longer always at an end: the sticky mode leaves a pinned
 * record exactly where the sort put it, and force-mounting one out of the
 * middle of a window leaves a gap on each side of it. A spacer per gap covers
 * that and the simple case alike.
 */
export interface TransposedAxisPlan {
  slots: TransposedSlot[]
  /** Positions being rendered, ascending — the slots without their spacers. */
  indexes: number[]
}

/**
 * What the transposed body renders, once the windows have had their say.
 *
 * A windowed axis is drawn with spacers rather than by taking its items out of
 * flow: a spacer cell holds open the width of the records it skipped, a spacer
 * row the height of the bands. That is what lets the table stay a real
 * `<table>` while being virtualized — absolute positioning is what forces the
 * upright virtualizers into the grid layout, and with it out of `rowSpan`, out
 * of grouped headers and out of detail panels.
 *
 * A record spacer is stated rather than measured: the `<colgroup>` gives every
 * record column exactly one `--rtc-transposed-record-width`, so the extent of
 * the ones left out is that same length times how many there were, and the
 * column widths and the table's own width cannot drift apart. A band spacer
 * cannot be, because a band's height is whatever its tallest cell makes it, so
 * that one comes from the virtualizer's measured offsets. See
 * `TransposedBandWindow`.
 */
export interface TransposedPlan<TData extends RowData> extends TransposedLayout<TData> {
  bandPlan: TransposedAxisPlan
  recordPlan: TransposedAxisPlan
  /** One width per rendered column, in order: the table's `<colgroup>`. */
  colWidths: string[]
  /** Columns actually in the DOM, which is what a spacer row has to span. */
  domColumnCount: number
}

/** The whole axis, unwindowed. */
function wholeAxis(count: number): TransposedAxisPlan {
  const indexes = Array.from({ length: count }, (_, index) => index)
  return { slots: indexes.map((index) => ({ index })), indexes }
}

/**
 * The rendered items with a spacer in every gap between them.
 *
 * `extent` is asked for each run the window skipped, as the half-open range it
 * covers; it answers in whatever units that axis is sized in.
 */
function withSpacers(
  indexes: number[],
  count: number,
  extent: (from: number, to: number) => string | null,
): TransposedAxisPlan {
  const slots: TransposedSlot[] = []
  let next = 0
  for (const index of indexes) {
    if (index > next) {
      const spacer = extent(next, index)
      if (spacer) slots.push({ spacer })
    }
    slots.push({ index })
    next = index + 1
  }
  if (next < count) {
    const spacer = extent(next, count)
    if (spacer) slots.push({ spacer })
  }
  return { slots, indexes }
}

/** Total width of a run of records, the columns their panels occupy included. */
function recordExtent<TData extends RowData>(
  from: number,
  to: number,
  records: Array<TransposedRecord<TData>>,
): string | null {
  const length = to - from
  if (length <= 0) return null
  let panels = 0
  for (let index = from; index < to; index++) if (records[index]?.hasDetail) panels += 1
  const terms = [`var(--rtc-transposed-record-width) * ${length}`]
  if (panels > 0) terms.push(`var(--rtc-transposed-detail-width) * ${panels}`)
  return `calc(${terms.join(' + ')})`
}

export function transposedPlan<TData extends RowData>(
  layout: TransposedLayout<TData>,
  bandWindow: TransposedBandWindow | null,
  recordWindow: TransposedWindow | null,
): TransposedPlan<TData> {
  const bandCount = layout.bands.length
  const recordCount = layout.records.length

  // Only the record body is ever windowed: the empty, loading and error states
  // are a handful of cells whichever way round the table is.
  const windowed = layout.mode === 'records'

  let bandPlan = wholeAxis(bandCount)
  if (windowed && bandWindow) {
    // A gap runs from the end of the band before it to the start of the band
    // after it, both of which the virtualizer measured; the two outer gaps run
    // from zero and up to the whole extent.
    const ends = new Map(bandWindow.indexes.map((index, at) => [index, bandWindow.ends[at]!]))
    const starts = new Map(bandWindow.indexes.map((index, at) => [index, bandWindow.starts[at]!]))
    bandPlan = withSpacers(bandWindow.indexes, bandCount, (from, to) => {
      const left = from === 0 ? 0 : (ends.get(from - 1) ?? 0)
      const right = to === bandCount ? bandWindow.totalSize : (starts.get(to) ?? left)
      const size = Math.max(0, right - left)
      return size > 0 ? `${size}px` : null
    })
  }

  let recordPlan = wholeAxis(recordCount)
  if (windowed && recordWindow) {
    recordPlan = withSpacers(recordWindow.indexes, recordCount, (from, to) =>
      recordExtent(from, to, layout.records),
    )
  }

  // The `<colgroup>`. With `table-layout: fixed` a table takes its widths from
  // its first row unless there is one of these, and under a band window the
  // first row is a spacer — one wide cell that would then decide every column.
  const label = 'var(--rtc-transposed-header-width)'
  const colWidths: string[] = []
  for (let level = 0; level < layout.headerLevels; level++) colWidths.push(label)

  if (layout.mode === 'records') {
    for (const slot of recordPlan.slots) {
      if (slot.spacer !== undefined) {
        colWidths.push(slot.spacer)
        continue
      }
      colWidths.push('var(--rtc-transposed-record-width)')
      if (layout.records[slot.index]?.hasDetail) {
        colWidths.push('var(--rtc-transposed-detail-width)')
      }
    }
  } else if (layout.mode === 'loading') {
    for (let index = 0; index < layout.skeletonCount; index++) {
      colWidths.push('var(--rtc-transposed-record-width)')
    }
  } else {
    // The empty and error states have one cell where the records would be, and
    // it takes whatever is left over.
    colWidths.push('auto')
  }

  for (let level = 0; level < layout.footerLevels; level++) colWidths.push(label)

  return { ...layout, bandPlan, recordPlan, colWidths, domColumnCount: colWidths.length }
}

/**
 * Sticky offset for the header cell at `level` of the label block.
 *
 * A pinned *band* needs no such helper: it is a row carrying
 * `data-rtc-row-pinned`, so `useStickyPinnedRows` measures and stacks it with
 * the upright pinned rows, and the same stylesheet rules dock it.
 */
export function labelPinOffset(level: number): string {
  return `calc(var(--rtc-transposed-header-width) * ${level})`
}
