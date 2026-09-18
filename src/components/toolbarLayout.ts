import type { RowData } from '@tanstack/react-table'

import type {
  DataTableOptions,
  DataTableToolbarGroup,
  DataTableToolbarNode,
  DataTableToolbarRow,
} from '../types'

export type ToolbarBar = 'top' | 'bottom'
export type ToolbarRegion = 'start' | 'center' | 'end'

export const TOOLBAR_REGIONS: ToolbarRegion[] = ['start', 'center', 'end']

/** A node with every id that would draw nothing already removed. */
export type ResolvedToolbarNode =
  | { kind: 'item'; id: string }
  | { kind: 'group'; id?: string; gap: 'tight' | 'normal'; nodes: ResolvedToolbarNode[] }

export type ResolvedToolbarRow = Record<ToolbarRegion, ResolvedToolbarNode[]>

function isGroup(node: DataTableToolbarNode): node is DataTableToolbarGroup {
  return typeof node === 'object' && node !== null && 'group' in node
}

function asRows(
  rows: DataTableToolbarRow | DataTableToolbarRow[] | undefined,
): DataTableToolbarRow[] {
  if (!rows) return []
  return Array.isArray(rows) ? rows : [rows]
}

/**
 * The layout a table has before anything is configured.
 *
 * A constant, and the contract: an occupant a configuration never names is
 * drawn from here, so this is what "keeps its default" means. The order within
 * each region is the order the toolbar rendered in before layouts existed, and
 * nothing here reads an option — an occupant a flag has switched off is dropped
 * later, when the question is which of them would draw anything.
 */
const DEFAULT_ROWS: Record<ToolbarBar, DataTableToolbarRow> = {
  top: {
    start: ['top-actions', 'grouping-chips', 'selection-summary', 'filter-chips'],
    end: [
      'search',
      {
        id: 'internal-actions',
        gap: 'tight',
        group: [
          'internal-actions',
          'search-toggle',
          'filter-toggle',
          'column-visibility',
          'density-toggle',
          'transpose-toggle',
          'fullscreen-toggle',
          'error',
        ],
      },
    ],
  },
  bottom: {
    start: ['bottom-actions'],
    end: ['pagination'],
  },
}

/** Every item id the configuration mentions, including inside groups. */
function collectNamed(nodes: DataTableToolbarNode[] | undefined, into: Set<string>): void {
  for (const node of nodes ?? []) {
    if (isGroup(node)) collectNamed(node.group, into)
    else if (node !== 'rest') into.add(node)
  }
}

function namedIds(rows: DataTableToolbarRow[]): Set<string> {
  const named = new Set<string>()
  for (const row of rows) for (const region of TOOLBAR_REGIONS) collectNamed(row[region], named)
  return named
}

/**
 * The rows a bar is configured with, narrow layout applied.
 *
 * `narrow` replaces a bar rather than merging into it: the arrangement wanted
 * on a phone is usually not the wide one with a couple of things moved, and a
 * bar it leaves out is one the author was happy with at either width.
 *
 * It switches on `mobileBreakpoint`, the viewport width the filter drawer
 * already uses, rather than on the table's own width. A container query would
 * answer the better question — a 600px table in a wide page has a phone's
 * problem — but it needs `container-type: inline-size` on the root, which
 * stops the root sizing to its contents in a shrink-to-fit parent. Two
 * thresholds that can disagree is the other cost. The regions wrap on their
 * own, so a narrow table degrades without either.
 */
function configuredRows<TData extends RowData>(
  options: DataTableOptions<TData>,
  bar: ToolbarBar,
  isMobile: boolean,
): DataTableToolbarRow[] {
  const layout = options.toolbarLayout
  const narrow = isMobile ? layout?.narrow?.[bar] : undefined
  return asRows(narrow ?? layout?.[bar])
}

/**
 * What `rest` stands for in one region, and whether it has been spent.
 *
 * Scoped to the region it is written in, not to the layout: a `rest` means the
 * same thing wherever it appears — the occupants this region holds by default
 * and the layout has not placed — so several of them compose instead of
 * competing, and reading one does not mean reading the other regions first.
 * The alternative, one pool of everything the layout displaced, makes
 * `{ start: ['search', 'rest'] }` quietly depend on what the *end* region says,
 * and two `rest`s race for the same items on an order nothing in the
 * configuration shows.
 *
 * Shared across a bar's rows, so the second `rest` in a region draws nothing
 * rather than a second copy.
 */
interface RegionRest {
  nodes: ResolvedToolbarNode[]
  used: boolean
}

/**
 * Whether the configuration writes this region.
 *
 * A written region is the whole of what that region holds — which is how an
 * occupant is removed, `start: []` included. An absent key is not a written
 * empty region, and neither is an explicit `undefined`, so a configuration
 * built by spreading one object over another does not lose a region to a key
 * that came along carrying nothing.
 */
function isWritten(row: DataTableToolbarRow | undefined, region: ToolbarRegion): boolean {
  return row?.[region] !== undefined
}

/** Configured nodes, dropping ids that would draw nothing and groups left empty. */
function resolveConfigured(
  nodes: DataTableToolbarNode[] | undefined,
  visible: ReadonlySet<string>,
  rest: RegionRest,
): ResolvedToolbarNode[] {
  const resolved: ResolvedToolbarNode[] = []
  for (const node of nodes ?? []) {
    if (isGroup(node)) {
      const inner = resolveConfigured(node.group, visible, rest)
      if (inner.length > 0) {
        resolved.push({ kind: 'group', id: node.id, gap: node.gap ?? 'tight', nodes: inner })
      }
      continue
    }
    if (node === 'rest') {
      if (rest.used) continue
      rest.used = true
      resolved.push(...rest.nodes)
      continue
    }
    if (visible.has(node)) resolved.push({ kind: 'item', id: node })
  }
  return resolved
}

/**
 * Default nodes, narrowed to the ids a predicate keeps.
 *
 * Used for the two places defaults still reach: a region the configuration
 * does not write, and `rest`. Both prune rather than flatten, so what survives
 * keeps not just its region but the cluster it was part of — naming one icon
 * does not scatter the other six, and moving `rest` moves the cluster as a
 * cluster.
 */
function pruneDefaults(
  nodes: DataTableToolbarNode[] | undefined,
  keep: (id: string) => boolean,
): ResolvedToolbarNode[] {
  const resolved: ResolvedToolbarNode[] = []
  for (const node of nodes ?? []) {
    if (isGroup(node)) {
      const inner = pruneDefaults(node.group, keep)
      if (inner.length > 0) {
        resolved.push({ kind: 'group', id: node.id, gap: node.gap ?? 'tight', nodes: inner })
      }
      continue
    }
    if (node === 'rest') continue
    if (keep(node)) resolved.push({ kind: 'item', id: node })
  }
  return resolved
}

function isEmptyRow(row: ResolvedToolbarRow): boolean {
  return TOOLBAR_REGIONS.every((region) => row[region].length === 0)
}

/**
 * Where every visible toolbar occupant goes, for both bars at once.
 *
 * Both bars are resolved together because a placement is not bar-local: an
 * item named in the top bar has to lose its default seat in the bottom one,
 * which is how naming `pagination` in the top bar moves it there rather than
 * drawing a second copy.
 */
export function resolveToolbarLayout<TData extends RowData>(
  options: DataTableOptions<TData>,
  { isMobile, visible }: { isMobile: boolean; visible: ReadonlySet<string> },
): Record<ToolbarBar, ResolvedToolbarRow[]> {
  const bars: ToolbarBar[] = ['top', 'bottom']
  const configured = {
    top: configuredRows(options, 'top', isMobile),
    bottom: configuredRows(options, 'bottom', isMobile),
  }

  const named = namedIds([...configured.top, ...configured.bottom])
  const unplaced = (id: string) => visible.has(id) && !named.has(id)

  // Only the first row of a bar inherits — a row the author added is theirs
  // alone — and only for the regions that row leaves unwritten.
  const inherits = (bar: ToolbarBar, region: ToolbarRegion) =>
    !isWritten(configured[bar][0], region)

  // One `rest` per region, holding what that region would have drawn on its
  // own. A region that still inherits has nothing left over: it is already
  // drawing all of it.
  const rests = new Map<string, RegionRest>()
  for (const bar of bars) {
    for (const region of TOOLBAR_REGIONS) {
      rests.set(`${bar}/${region}`, {
        nodes: inherits(bar, region) ? [] : pruneDefaults(DEFAULT_ROWS[bar][region], unplaced),
        used: false,
      })
    }
  }

  const resolved: Record<ToolbarBar, ResolvedToolbarRow[]> = { top: [], bottom: [] }
  for (const bar of bars) {
    const rows = configured[bar]
    // One row even when nothing is configured: it is the row the defaults fill.
    for (let index = 0; index < Math.max(rows.length, 1); index += 1) {
      const row = rows[index]
      const entries = TOOLBAR_REGIONS.map((region): [ToolbarRegion, ResolvedToolbarNode[]] => [
        region,
        index === 0 && inherits(bar, region)
          ? pruneDefaults(DEFAULT_ROWS[bar][region], unplaced)
          : resolveConfigured(row?.[region], visible, rests.get(`${bar}/${region}`)!),
      ])
      const next = Object.fromEntries(entries) as ResolvedToolbarRow
      if (!isEmptyRow(next)) resolved[bar].push(next)
    }
  }

  // An item of your own that the layout never names. It has no default region
  // for a `rest` to hand it back, so it lands where the built-in actions
  // already sit rather than silently not rendering. A built-in written out of
  // its region is not put back here: that is the removal.
  const defaulted = namedIds([DEFAULT_ROWS.top, DEFAULT_ROWS.bottom])
  const homeless = [...visible].filter((id) => unplaced(id) && !defaulted.has(id))
  if (homeless.length > 0) {
    const nodes = homeless.map((id): ResolvedToolbarNode => ({ kind: 'item', id }))
    const last = resolved.top.at(-1)
    if (last) last.end.push(...nodes)
    else resolved.top.push({ start: [], center: [], end: nodes })
  }

  return resolved
}
