import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  DataTable,
  createDataTableColumnHelper,
  useDataTable,
  type DataTableColumn,
} from '../src'
import { loadingArgTypes } from './controls'
import {
  currency,
  makePeople,
  makeWideColumns,
  personColumns,
  timestamp,
  type Person,
} from './fixtures'

/**
 * Stress stories: the table at sizes and under churn that no feature story
 * reaches.
 *
 * Each one isolates a different axis, because they fail in different ways.
 * Row count stresses the row model and the virtualizer; column count stresses
 * layout and sizing; every-feature-at-once stresses the interaction between
 * row models that each rebuild the one below them; a deep tree stresses
 * expansion; hostile cell values stress rendering, sorting and filtering of
 * data nobody would write on purpose; and constant replacement of the data
 * stresses whether state survives a table whose rows are new objects several
 * times a second.
 *
 * They are also the Playwright suite's performance floor: `e2e/stress.spec.ts`
 * drives these stories, so a change that makes sorting quadratic or mounts
 * every row shows up as a timeout rather than as a slow Storybook nobody
 * measured.
 */

const meta: Meta = {
  title: 'DataTable/17 Stress',
  argTypes: { ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** Shared loading args, spread into every story so the controls stay uniform. */
const loadingArgs = {
  isLoading: false,
  showProgressBars: false,
  isSaving: false,
  isLoadingError: false,
  errorMessage: '',
  skeletonRowCount: 5,
} as const

/**
 * Generated rows, memoized across stories and renders.
 *
 * A docs page mounts every story in this file — and the Primary block repeats
 * the first one — so a fixture built during `render` would be built several
 * times over for the largest tables here. Keying the cache on the shape means
 * the two stories that ask for the same rows share one array.
 */
const peopleCache = new Map<string, Person[]>()
function people(count: number, seed = 1): Person[] {
  const key = `${count}:${seed}`
  const cached = peopleCache.get(key)
  if (cached) return cached
  const rows = makePeople(count, seed)
  peopleCache.set(key, rows)
  return rows
}

/** Row and column counts, named so the stories and their notes cannot drift apart. */
const ROW_COUNT = 50_000
const COLUMN_COUNT = 250
const FEATURE_ROW_COUNT = 5_000
const TREE_BREADTH = 5
const TREE_DEPTH = 5
const CHURN_ROW_COUNT = 2_000
const CHURN_INTERVAL_MS = 100

const helper = createDataTableColumnHelper<Person>()

/**
 * A metrics strip.
 *
 * The counts are what the assertions are actually about — how many rows the
 * table holds, how many survive the filters, how many are selected — and none
 * of them can be counted from the DOM once virtualization means the DOM holds
 * a window. Rendering them as plain numbers keeps the tests comparing values
 * rather than parsing prose.
 */
function Metrics({
  total,
  filtered,
  selected,
  extra,
}: {
  total: number
  filtered: number
  selected: number
  extra?: { label: string; value: number; testId: string }
}) {
  return (
    <div className="rtc-sb-row">
      <span className="rtc-group-count">
        rows <b data-testid="stress-total">{total}</b>
      </span>
      <span className="rtc-group-count">
        after filters <b data-testid="stress-filtered">{filtered}</b>
      </span>
      <span className="rtc-group-count">
        selected <b data-testid="stress-selected">{selected}</b>
      </span>
      {extra ? (
        <span className="rtc-group-count">
          {extra.label} <b data-testid={extra.testId}>{extra.value}</b>
        </span>
      ) : null}
    </div>
  )
}

/** Selected row count. Deselection can leave a `false` behind, so keys alone would over-count. */
const countSelected = (selection: Record<string, boolean>) =>
  Object.values(selection).filter(Boolean).length

/**
 * 50,000 rows, virtualized, with the features a table that large still needs.
 *
 * The point is that nothing here scales with the row count: the DOM holds one
 * window whatever the offset, and sorting, searching and select-all all run
 * over the full 50,000 without the browser giving up. The metrics strip above
 * the table is the only way to see the numbers the DOM no longer shows.
 */
export const ManyRows: Story = {
  args: { ...loadingArgs },
  render: function ManyRows(args) {
    const table = useDataTable<Person>({
      columns: personColumns,
      data: people(ROW_COUNT),
      getRowId: (row) => row.id,
      enableRowVirtualization: true,
      // Select-all covers the whole filtered set rather than a page only when
      // there are no pages — which is the case worth stressing here.
      enablePagination: false,
      enableStickyHeader: true,
      enableRowSelection: true,
      enableSelectAll: true,
      enableGlobalFilter: true,
      enableColumnFilters: true,
      enableFaceting: true,
      enableColumnActions: true,
      enableColumnPinning: true,
      enableSorting: true,
      enableMultiSort: true,
      filterDisplayMode: 'popover-and-panel',
      density: 'compact',
      height: 520,
      initialState: {
        showGlobalFilter: true,
        columnPinning: { start: ['rtc-select'], end: [] },
      },
      ...args,
    })

    return (
      <>
        <p className="rtc-sb-note">
          {ROW_COUNT.toLocaleString('en-US')} rows. Sort, search and select-all all run over the
          whole set; only the visible window is ever in the DOM.
        </p>
        <Metrics
          total={table.getCoreRowModel().rows.length}
          filtered={table.getFilteredRowModel().rows.length}
          selected={countSelected(table.state.rowSelection)}
        />
        <DataTable table={table} />
      </>
    )
  },
}

/**
 * 252 columns.
 *
 * Column count is its own axis: every column carries a header with up to three
 * controls, a resize grip and a measured minimum width, and the grid layout
 * mode resolves each width itself rather than leaving it to the browser's
 * table algorithm. Pinned columns on both edges are the part most likely to
 * break at this width, since they are positioned against a scroll offset that
 * is now thousands of pixels wide.
 *
 * Rows are virtualized here; columns are not, so every column of every mounted
 * row is a real cell — 252 of them per row, which is what makes this a stress
 * story rather than a demo. `ManyColumnsVirtualized` is the same table with
 * `enableColumnVirtualization` on, and the pair is the comparison: same data,
 * same pins, two orders of magnitude apart in mounted cells.
 */
export const ManyColumns: Story = {
  args: { ...loadingArgs },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        {COLUMN_COUNT + 2} columns over 2,000 virtualized rows, with a pinned column at each edge.
        Scroll sideways: the pinned columns hold their position while the rest move.
      </p>
      <DataTable
        columns={makeWideColumns(COLUMN_COUNT)}
        data={people(2_000, 3)}
        getRowId={(row) => row.id}
        layoutMode="grid-no-grow"
        enableRowVirtualization
        enablePagination={false}
        enableStickyHeader
        enableColumnPinning
        enableColumnResizing
        enableColumnActions
        density="compact"
        height={520}
        initialState={{
          columnPinning: { start: ['firstName'], end: [`metric-${COLUMN_COUNT}`] },
        }}
        {...args}
      />
    </>
  ),
}

/**
 * The same 252 columns, windowed on both axes.
 *
 * Everything that has to survive the window is here at once: a pin at each
 * edge, which must stay mounted at any scroll offset or the table goes blank
 * where it is stickiest; resizing, which changes the very widths the offsets
 * are computed from; and headers whose measured minimum width can only be
 * taken while they are mounted, so columns arriving from off-screen are
 * measured as they land.
 */
export const ManyColumnsVirtualized: Story = {
  args: { ...loadingArgs },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        {COLUMN_COUNT + 2} columns over 2,000 rows, virtualized both ways. Scroll sideways: the
        pinned columns hold their position, and the cells between them are mounted as they arrive.
      </p>
      <DataTable
        columns={makeWideColumns(COLUMN_COUNT)}
        data={people(2_000, 3)}
        getRowId={(row) => row.id}
        layoutMode="grid-no-grow"
        enableRowVirtualization
        enableColumnVirtualization
        enablePagination={false}
        enableStickyHeader
        enableColumnPinning
        enableColumnResizing
        enableColumnActions
        density="compact"
        height={520}
        initialState={{
          columnPinning: { start: ['firstName'], end: [`metric-${COLUMN_COUNT}`] },
        }}
        {...args}
      />
    </>
  ),
}

/** Footer aggregates over the filtered rows, so the footer recomputes on every filter change. */
const featureColumns: Array<DataTableColumn<Person, any>> = personColumns.map((column) => {
  const key = (column as { accessorKey?: string }).accessorKey
  if (key === 'salary') {
    return {
      ...column,
      aggregationFn: 'sum' as const,
      aggregatedCell: ({ getValue }: any) => `Σ ${currency(Number(getValue() ?? 0))}`,
      footer: ({ table }: any) =>
        `Σ ${currency(
          table
            .getFilteredRowModel()
            .rows.reduce((sum: number, row: any) => sum + Number(row.getValue('salary') ?? 0), 0),
        )}`,
    }
  }
  if (key === 'age') {
    return {
      ...column,
      aggregationFn: 'mean' as const,
      aggregatedCell: ({ getValue }: any) => `x̄ ${Number(getValue() ?? 0).toFixed(1)}`,
    }
  }
  if (key === 'firstName') return { ...column, footer: 'Totals' }
  return column
})

/**
 * Every feature at once, on 5,000 rows.
 *
 * `14 State & Composition`'s kitchen sink turns everything on over 200
 * unvirtualized rows; this adds the two things that change the problem —
 * enough rows that each row model costs something, and a virtualizer between
 * the row models and the DOM. Grouping, expansion, filtering, sorting and
 * selection each rebuild the model below them, so this is where a feature that
 * quietly rebuilds on every render becomes measurable rather than invisible.
 */
export const EverythingAtOnce: Story = {
  args: { ...loadingArgs },
  render: function EverythingAtOnce(args) {
    const [rows, setRows] = useState<Person[]>(() => people(FEATURE_ROW_COUNT, 5))
    return (
      <>
        <p className="rtc-sb-note">
          {FEATURE_ROW_COUNT.toLocaleString('en-US')} rows, grouped and virtualized, with every
          feature the component has switched on simultaneously.
        </p>
        <DataTable
          columns={featureColumns}
          data={rows}
          getRowId={(row) => row.id}
          enableSorting
          enableMultiSort
          enableColumnFilters
          enableFilterModes
          enableMultipleFilterConditions
          enableGlobalFilter
          enableGlobalFilterModes
          enableFaceting
          enableRowSelection
          enableSelectAll
          enableColumnVisibility
          enableColumnOrdering
          enableColumnDragging
          enableColumnPinning
          enableColumnResizing
          enableColumnActions
          enableGrouping
          enableGroupingChips
          enableAggregation
          enableExpanding
          enableExpandAll
          enableRowNumbers
          enableRowActions
          enableRowPinning
          enableCellSelection
          enableCellRangeSelection
          enableKeyboardNavigation
          enableEditing
          editMode="modal"
          enableRowVirtualization
          enablePagination={false}
          enableStickyHeader
          enableStickyFooter
          enableStripes
          enableDensityToggle
          enableFullScreenToggle
          layoutMode="grid"
          height={520}
          filterDisplayMode="popover-and-panel"
          // Density through `initialState`, not the prop: the prop pins it, and
          // the toolbar toggle is one of the surfaces this story is here to
          // keep exercised.
          initialState={{
            density: 'compact',
            grouping: ['department'],
            showFilterPanel: true,
            showGlobalFilter: true,
            columnPinning: { start: ['rtc-select'], end: [] },
          }}
          onEditingRowSave={({ values, exitEditingMode }) => {
            setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
            exitEditingMode()
          }}
          // No guard for group rows: they stand for the rows underneath them
          // and are not offered a panel, so reading `original` here is also a
          // canary for that — a group row reaching this throws.
          renderDetailPanel={({ row }) => (
            <span>
              {row.original.firstName} {row.original.lastName} — {row.original.email}
            </span>
          )}
          rowActionMenuItems={({ row }) => [
            { id: 'copy', label: `Copy ${row.original.id}`, onSelect: () => undefined },
          ]}
          {...args}
        />
      </>
    )
  },
}

/**
 * A tree 5 levels deep, ~3,900 rows fully expanded.
 *
 * Expansion is the one feature whose cost is not bounded by the row count:
 * every level multiplies the rows the flat model has to produce, and the
 * virtualizer measures rows whose height varies with depth. Expand-all is the
 * worst case, and it is one click away.
 */
export const DeepTree: Story = {
  args: { ...loadingArgs },
  render: function DeepTree(args) {
    const tree = deepTree()
    return (
      <>
        <p className="rtc-sb-note">
          {TREE_BREADTH} roots, {TREE_DEPTH} levels, {countTree(tree).toLocaleString('en-US')} rows
          when fully expanded. Use the header chevron to expand everything at once.
        </p>
        <DataTable
          columns={personColumns.slice(0, 6)}
          data={tree}
          getRowId={(row) => row.id}
          getSubRows={(row) => row.subRows}
          enableExpanding
          enableExpandAll
          enableRowVirtualization
          enablePagination={false}
          enableStickyHeader
          enableSorting
          enableRowSelection
          enableSubRowSelection
          density="compact"
          height={520}
          {...args}
        />
      </>
    )
  },
}

/**
 * Cell values chosen to break things.
 *
 * Every column here holds at least one value its formatter, sorter and filter
 * were not written for: nothing, whitespace, a 2,000-character word with no
 * break opportunity, emoji built from joined sequences, right-to-left text,
 * bare combining marks, markup-looking text, `NaN`, both infinities, a number
 * past the safe integer range, an unparseable date and a date at the far end
 * of the representable range. A cell must render all of it, a column must not
 * be widened by any of it, and sorting or filtering a column full of it must
 * not throw.
 */
export const HostileValues: Story = {
  args: { ...loadingArgs },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Empty, missing, unbreakable, bidirectional, non-finite and out-of-range values, in the
        columns whose formatters and filters have to survive them.
      </p>
      <DataTable
        columns={hostileColumns}
        data={hostileRows}
        getRowId={(row) => row.id}
        enableSorting
        enableColumnFilters
        enableGlobalFilter
        enableFaceting
        enableColumnActions
        enablePagination={false}
        filterDisplayMode="popover-and-panel"
        initialState={{ showGlobalFilter: true }}
        height={420}
        enableStickyHeader
        {...args}
      />
    </>
  ),
}

/**
 * The data replaced wholesale, ten times a second, while the table is sorted,
 * filtered and has a selection.
 *
 * Every tick hands the table new row objects, so every row model downstream is
 * rebuilt. What must survive is the state that is keyed by row id rather than
 * by identity — the selection — along with the sort and the filter. The
 * interval is off until started so a docs page does not churn in the
 * background.
 */
export const ConstantChurn: Story = {
  args: { ...loadingArgs },
  render: function ConstantChurn(args) {
    const [rows, setRows] = useState<Person[]>(() => people(CHURN_ROW_COUNT, 9))
    const [running, setRunning] = useState(false)
    const [ticks, setTicks] = useState(0)

    useEffect(() => {
      if (!running) return
      const id = setInterval(() => {
        // New objects every tick, and a value the sort depends on, so nothing
        // downstream can be reused.
        setRows((old) =>
          old.map((row, index) =>
            index % 3 === 0
              ? {
                  ...row,
                  age: 22 + ((row.age - 22 + 1) % 43),
                  responseMs: (row.responseMs + 137) % 4_000,
                }
              : { ...row },
          ),
        )
        setTicks((count) => count + 1)
      }, CHURN_INTERVAL_MS)
      return () => clearInterval(id)
    }, [running])

    const table = useDataTable<Person>({
      columns: personColumns.slice(0, 7),
      data: rows,
      getRowId: (row) => row.id,
      enableRowVirtualization: true,
      enablePagination: false,
      enableStickyHeader: true,
      enableRowSelection: true,
      enableSelectAll: true,
      enableGlobalFilter: true,
      enableColumnFilters: true,
      enableSorting: true,
      filterDisplayMode: 'popover-and-panel',
      density: 'compact',
      height: 440,
      initialState: { sorting: [{ id: 'age', desc: true }], showGlobalFilter: true },
      ...args,
    })

    return (
      <>
        <p className="rtc-sb-note">
          Start the churn, then sort, search and select. The rows are replaced every{' '}
          {CHURN_INTERVAL_MS}ms; the selection is keyed by row id, so it has to hold.
        </p>
        <div className="rtc-sb-row">
          <button
            type="button"
            className="rtc-button"
            data-testid="churn-toggle"
            onClick={() => setRunning((value) => !value)}
          >
            {running ? 'Stop churn' : 'Start churn'}
          </button>
        </div>
        <Metrics
          total={table.getCoreRowModel().rows.length}
          filtered={table.getFilteredRowModel().rows.length}
          selected={countSelected(table.state.rowSelection)}
          extra={{ label: 'ticks', value: ticks, testId: 'churn-ticks' }}
        />
        <DataTable table={table} />
      </>
    )
  },
}

// ------------------------------------------------------------------ fixtures ----

/**
 * A tree of the given breadth and depth, every node a distinct person.
 *
 * Row state is keyed by id, so a person reused across branches would give two
 * rows the same key and they would fight over one DOM node — the same reason
 * `makeTree` in `fixtures.ts` slices rather than repeats.
 */
function makeDeepTree(breadth: number, depth: number): Person[] {
  const total = Array.from({ length: depth }, (_, level) => breadth ** (level + 1)).reduce(
    (sum, count) => sum + count,
    0,
  )
  const flat = people(total, 13)
  let next = 0
  const build = (level: number): Person[] =>
    Array.from({ length: breadth }, () => {
      const person = flat[next++]!
      return level >= depth ? person : { ...person, subRows: build(level + 1) }
    })
  return build(1)
}

let deepTreeCache: Person[] | undefined
/** Built once: the tree is shared by the story and its docs-page duplicate. */
const deepTree = () => (deepTreeCache ??= makeDeepTree(TREE_BREADTH, TREE_DEPTH))

/** Rows in a tree, counting every level. */
function countTree(rows: Person[]): number {
  return rows.reduce((sum, row) => sum + 1 + (row.subRows ? countTree(row.subRows) : 0), 0)
}

/** One unbreakable word, long enough to blow out a 200px column if anything let it. */
const LONG_WORD = 'W'.repeat(2_000)

/** Strings a text column has to render, sort and filter without special-casing. */
const HOSTILE_TEXT: Array<string | null | undefined> = [
  '',
  '   ',
  LONG_WORD,
  '👩🏽‍🚒 👨‍👩‍👧‍👦 🏳️‍🌈',
  'مرحبا بالعالم — اختبار',
  'ȩ́ combining ́́́',
  '<script>alert("xss")</script>',
  'line\nbreak\ttab',
  'Ω≈ç√∫˜µ≤≥÷ ｆｕｌｌｗｉｄｔｈ',
  'ß'.repeat(120),
  null,
  undefined,
]

/** Numbers whose ordering and formatting are undefined territory. */
const HOSTILE_NUMBERS: Array<number | null | undefined> = [
  0,
  -0,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  Number.MAX_SAFE_INTEGER,
  -Number.MAX_SAFE_INTEGER,
  1e21,
  Number.MIN_VALUE,
  -1,
  null,
  undefined,
]

/** Date strings from unparseable to the far end of the representable range. */
const HOSTILE_DATES: Array<string | null | undefined> = [
  'not-a-date',
  '',
  '0000-01-01',
  '1970-01-01',
  '+275760-09-13',
  '2026-02-30',
  '2026-13-45',
  '20260101',
  '2026-06-15T25:61:99Z',
  '9999-12-31',
  null,
  undefined,
]

/**
 * One row per hostile value, with each column offset through its own list so
 * no row is uniformly broken — a formatter that only fails on a row where
 * *every* value is missing would slip past a table of twelve identical rows.
 */
const hostileRows: Person[] = HOSTILE_TEXT.map((text, index) => {
  const pick = <T,>(list: T[]) => list[(index + list.length - 1) % list.length]!
  /** Empty, enormous, and the wrong type entirely. */
  const collection =
    index % 5 === 0
      ? []
      : index % 5 === 1
        ? Array.from({ length: 200 }, (_, item) => `skill-${item}`)
        : pick(HOSTILE_TEXT)
  /** Missing, unplottable, and outside the valid latitude/longitude range. */
  const point =
    index % 3 === 0 ? null : index % 3 === 1 ? { lat: Number.NaN, lng: Number.NaN } : { lat: 91, lng: 181 }
  return {
    id: `hostile-${index + 1}`,
    firstName: text,
    lastName: pick(HOSTILE_TEXT),
    email: index % 4 === 0 ? '' : `hostile+${index}@example.com`,
    age: pick(HOSTILE_NUMBERS),
    department: pick(HOSTILE_TEXT),
    city: pick(HOSTILE_TEXT),
    salary: pick(HOSTILE_NUMBERS),
    active: pick([true, false, null, undefined]),
    startDate: pick(HOSTILE_DATES),
    lastSeen: pick(HOSTILE_DATES),
    skills: collection,
    location: point,
    responseMs: pick(HOSTILE_NUMBERS),
  } as unknown as Person
})

/**
 * The hostile table's columns.
 *
 * Deliberately close to `personColumns` and the data-type stories: the same
 * declared types, the same shared formatters, so what is under test is the
 * built-in handling of the values rather than a defensive cell renderer
 * written for this story.
 */
const hostileColumns: Array<DataTableColumn<Person, any>> = helper.columns([
  helper.accessor('firstName', { header: 'Text', size: 200, meta: { dataType: 'text' } }),
  helper.accessor('department', { header: 'Enum', size: 160, meta: { dataType: 'enum' } }),
  helper.accessor('age', {
    header: 'Number',
    size: 140,
    meta: { dataType: 'number', align: 'right' },
  }),
  helper.accessor('salary', {
    header: 'Currency',
    size: 160,
    cell: ({ getValue }) => currency(getValue()),
    meta: { dataType: 'number', align: 'right' },
  }),
  helper.accessor('active', {
    header: 'Boolean',
    size: 110,
    // `String`, not the usual Yes/No: React renders a boolean as nothing at
    // all, and a blank cell cannot be told apart from a missing one.
    cell: ({ getValue }) => String(getValue()),
    meta: { dataType: 'boolean', align: 'center' },
  }),
  helper.accessor('startDate', { header: 'Date', size: 160, meta: { dataType: 'date' } }),
  helper.accessor('lastSeen', {
    header: 'Datetime',
    size: 180,
    cell: ({ getValue }) => timestamp(getValue()),
    meta: { dataType: 'datetime' },
  }),
  helper.accessor('skills', {
    header: 'Collection',
    size: 200,
    cell: ({ getValue }) => {
      const value = getValue()
      return Array.isArray(value) ? value.join(', ') : String(value ?? '')
    },
    meta: { dataType: 'collection' },
  }),
  helper.accessor('responseMs', {
    header: 'Duration',
    size: 140,
    cell: ({ getValue }) => `${getValue()} ms`,
    meta: { dataType: 'duration', align: 'right' },
  }),
  helper.accessor('location', {
    header: 'Geo point',
    size: 180,
    cell: ({ getValue }) => {
      const point = getValue()
      return point ? `${point.lat}, ${point.lng}` : ''
    },
    meta: { dataType: 'geoPoint' },
  }),
])
