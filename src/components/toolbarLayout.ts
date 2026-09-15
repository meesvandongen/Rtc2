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
 * Written out rather than derived, because it is also the contract: an item
 * the configuration never names is drawn from here, so this is what "stays
 * where it was" means. The order within each region is the order the toolbar
 * rendered before the layout existed.
 *
 * Pagination is the one part that reads an option, since `paginationPosition`
 * decides which bars its default placement covers. Everything else is placed
 * unconditionally here and dropped later if it would draw nothing.
 */
function defaultRow<TData extends RowData>(
  bar: ToolbarBar,
  options: DataTableOptions<TData>,
): DataTableToolbarRow {
  const position = options.paginationPosition
  if (bar === 'bottom') {
    return {
      start: ['bottom-actions'],
      end: (position ?? 'bottom') === 'top' ? [] : ['pagination'],
    }
  }

  return {
    start: ['top-actions', 'grouping-chips', 'selection-summary', 'filter-chips'],
    end: [
      'search',
      ...(position === 'top' || position === 'both' ? (['pagination'] as const) : []),
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
  }
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

interface ResolveContext {
  /** Ids that would draw something. */
  visible: ReadonlySet<string>
  /** Ids the configuration names anywhere, in either bar. */
  named: ReadonlySet<string>
  /** Visible ids with no default placement, in registration order. */
  rest: string[]
  /** Set once `rest` has been spliced in, so a second `rest` draws nothing. */
  restUsed: { value: boolean }
}

/** Configured nodes, dropping ids that would draw nothing and groups left empty. */
function resolveConfigured(
  nodes: DataTableToolbarNode[] | undefined,
  context: ResolveContext,
): ResolvedToolbarNode[] {
  const resolved: ResolvedToolbarNode[] = []
  for (const node of nodes ?? []) {
    if (isGroup(node)) {
      const inner = resolveConfigured(node.group, context)
      if (inner.length > 0) {
        resolved.push({ kind: 'group', id: node.id, gap: node.gap ?? 'tight', nodes: inner })
      }
      continue
    }
    if (node === 'rest') {
      if (context.restUsed.value) continue
      context.restUsed.value = true
      for (const id of context.rest) resolved.push({ kind: 'item', id })
      continue
    }
    if (context.visible.has(node)) resolved.push({ kind: 'item', id: node })
  }
  return resolved
}

/**
 * Default nodes for an item the configuration never named.
 *
 * The fallback is per item, not per region, and that is the whole of what
 * makes a layout a patch. The alternative — a region you write replaces that
 * region, everything displaced falling to `rest` — reads well until the
 * commonest edit there is: `{ top: { start: ['search'] } }` would sweep the
 * chips and the selection count to the far end of the bar, because replacing a
 * region evicts the three occupants you never mentioned.
 *
 * Pruned rather than flattened, so an item left alone keeps not just its
 * region but the cluster it was part of: naming one icon does not scatter the
 * other six.
 */
function resolveDefaults(
  nodes: DataTableToolbarNode[] | undefined,
  context: ResolveContext,
): ResolvedToolbarNode[] {
  const resolved: ResolvedToolbarNode[] = []
  for (const node of nodes ?? []) {
    if (isGroup(node)) {
      const inner = resolveDefaults(node.group, context)
      if (inner.length > 0) {
        resolved.push({ kind: 'group', id: node.id, gap: node.gap ?? 'tight', nodes: inner })
      }
      continue
    }
    if (node === 'rest') continue
    if (context.visible.has(node) && !context.named.has(node)) {
      resolved.push({ kind: 'item', id: node })
    }
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
 * which is the whole of what `paginationPosition: 'top'` used to mean.
 */
export function resolveToolbarLayout<TData extends RowData>(
  options: DataTableOptions<TData>,
  { isMobile, visible }: { isMobile: boolean; visible: ReadonlySet<string> },
): Record<ToolbarBar, ResolvedToolbarRow[]> {
  const bars: ToolbarBar[] = ['top', 'bottom']
  const defaults = { top: defaultRow('top', options), bottom: defaultRow('bottom', options) }
  const configured = {
    top: configuredRows(options, 'top', isMobile),
    bottom: configuredRows(options, 'bottom', isMobile),
  }

  const named = namedIds([...configured.top, ...configured.bottom])
  const defaulted = namedIds([defaults.top, defaults.bottom])
  const context: ResolveContext = {
    visible,
    named,
    // Only items with no default placement — which in practice means the ones
    // registered through `toolbarItems`. A built-in the layout does not name
    // is not homeless; it is where it always was.
    rest: [...visible].filter((id) => !named.has(id) && !defaulted.has(id)),
    restUsed: { value: false },
  }

  const resolved: Record<ToolbarBar, ResolvedToolbarRow[]> = { top: [], bottom: [] }
  for (const bar of bars) {
    const rows = configured[bar]
    // One row even when nothing is configured: it is the row the defaults fill.
    for (let index = 0; index < Math.max(rows.length, 1); index += 1) {
      const row = rows[index]
      const isFirst = index === 0
      const entries = TOOLBAR_REGIONS.map((region): [ToolbarRegion, ResolvedToolbarNode[]] => [
        region,
        [
          ...resolveConfigured(row?.[region], context),
          // Only the first row inherits: a row the author added is theirs.
          ...(isFirst ? resolveDefaults(defaults[bar][region], context) : []),
        ],
      ])
      const next = Object.fromEntries(entries) as ResolvedToolbarRow
      if (!isEmptyRow(next)) resolved[bar].push(next)
    }
  }

  // Items with nowhere to go and no `rest` to go to. The end of the top bar is
  // where the built-in actions already sit, so an unplaced custom item lands
  // beside them rather than silently not rendering.
  if (!context.restUsed.value && context.rest.length > 0) {
    const nodes = context.rest.map((id): ResolvedToolbarNode => ({ kind: 'item', id }))
    const last = resolved.top.at(-1)
    if (last) last.end.push(...nodes)
    else resolved.top.push({ start: [], center: [], end: nodes })
  }

  return resolved
}
