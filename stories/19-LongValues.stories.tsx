import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  createDataTableColumnHelper,
  DataTable,
  dataTableThemes,
  type DataTableCellOverflow,
  type DataTableCellOverflowReveal,
  type DataTableCellPeekAppearance,
  type DataTableCellPeekOverscroll,
} from '../src'
import { currency, makePeople } from './fixtures'

/** A record whose values are routinely longer than any sensible column. */
interface Ticket {
  id: string
  title: string
  reporter: string
  email: string
  url: string
  notes: string
  amount: number
}

const SUBJECTS = [
  'Export to CSV drops the last row when the filter panel is open',
  'Invoice totals are rounded twice on multi-currency accounts',
  'Password reset email',
  'Dashboard loads slowly for accounts with more than 40,000 historical orders',
  'Typo',
  'Sticky header overlaps the first row after switching density from compact to spacious',
]
const NOTES = [
  'Reproduced on staging. The issue only appears when the table is sorted by two columns and the second sort is descending; a single sort key is fine. Customer has a workaround.',
  'Waiting on customer.',
  'Escalated to billing. Two accounts affected so far, both created before the 2024 pricing migration, both with a non-default currency set at the organisation level rather than per workspace.',
  'Duplicate of an older ticket — linking and closing once the reporter confirms.',
]

const tickets: Ticket[] = makePeople(40, 3).map((person, index) => ({
  id: `TCK-${String(10_000 + index * 37).padStart(6, '0')}-${person.lastName.toUpperCase()}`,
  title: SUBJECTS[index % SUBJECTS.length]!,
  reporter: `${person.firstName} ${person.lastName}`,
  email: person.email,
  url: `https://support.example.com/organisations/${person.city.toLowerCase()}/tickets/${index + 1}?ref=${person.id}&tab=activity`,
  notes: NOTES[index % NOTES.length]!,
  amount: person.salary * 13.37,
}))

const helper = createDataTableColumnHelper<Ticket>()

const ticketColumns = helper.columns([
  helper.accessor('id', { header: 'Ticket', size: 150 }),
  helper.accessor('title', { header: 'Title', size: 240 }),
  helper.accessor('reporter', { header: 'Reporter', size: 130 }),
  helper.accessor('email', { header: 'Email', size: 170 }),
  helper.accessor('url', { header: 'Link', size: 200 }),
  helper.accessor('notes', { header: 'Notes', size: 260 }),
  helper.accessor('amount', {
    header: 'Amount',
    size: 110,
    cell: ({ getValue }) => currency(getValue()),
    meta: { align: 'right' },
  }),
])

/**
 * What most tables want: every column stays on one line and peeks when cut
 * short, except the one prose column, which shows three lines of itself, and
 * the identifier, which copies on click.
 */
const recommendedColumns = ticketColumns.map((column) => {
  const key = (column as { accessorKey?: string }).accessorKey
  if (key === 'notes') return { ...column, meta: { ...column.meta, cellOverflow: 'clamp' as const, cellMaxLines: 3 } }
  if (key === 'id') return { ...column, meta: { ...column.meta, enableClickToCopy: true } }
  return column
})

const overflowArgTypes = {
  cellOverflow: {
    control: 'inline-radio',
    options: ['truncate', 'wrap', 'clamp'] satisfies DataTableCellOverflow[],
    description:
      'What a cell does with a value wider than its column. Per column: `meta.cellOverflow`.',
    table: { category: 'Long values' },
  },
  cellMaxLines: {
    control: { type: 'number', min: 1, max: 6, step: 1 },
    description: 'Lines a `clamp` cell shows before it truncates. Per column: `meta.cellMaxLines`.',
    table: { category: 'Long values' },
  },
  cellOverflowReveal: {
    control: 'inline-radio',
    options: ['peek', 'peek-wheel', 'peek-native', 'peek-scroll', 'title', 'none'] satisfies DataTableCellOverflowReveal[],
    description:
      'How a cut-short cell shows the rest of its value. Per column: `meta.cellOverflowReveal`.',
    table: { category: 'Long values' },
  },
  cellPeekAppearance: {
    control: 'inline-radio',
    options: ['solid', 'outlined', 'glass'] satisfies DataTableCellPeekAppearance[],
    description: 'How a peek is drawn — experimental. `outlined` and `glass` mark the cell\'s own bounds.',
    table: { category: 'Long values' },
  },
  cellPeekOverscroll: {
    control: 'inline-radio',
    options: ['chain', 'contain', 'latch'] satisfies DataTableCellPeekOverscroll[],
    description: 'What the wheel does at the end of a scrolling peek — experimental.',
    table: { category: 'Long values' },
  },
  enableColumnResizing: {
    control: 'boolean',
    description: 'Double-click a column edge, or use the column menu, to fit it to its content.',
    table: { category: 'Columns' },
  },
  enableEditing: {
    control: 'boolean',
    description: 'With `editMode: "cell"`, double-click a cell to edit it — through a peek too.',
    table: { category: 'Editing' },
  },
  editMode: {
    control: 'inline-radio',
    options: ['cell', 'row', 'table', 'modal'],
    table: { category: 'Editing' },
  },
} as const

const meta: Meta = {
  title: 'DataTable/19 Long Values',
  argTypes: overflowArgTypes,
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every knob, on a table of values that do not fit.
 *
 * Hover a cut-short cell — or reach it with the keyboard, with cell selection
 * on — and it opens out in place after a moment. Moving along the row, each
 * next cut-short cell opens at once.
 */
export const Playground: Story = {
  args: {
    cellOverflow: 'truncate',
    cellMaxLines: 2,
    cellOverflowReveal: 'peek',
    cellPeekAppearance: 'solid',
    cellPeekOverscroll: 'latch',
    enableColumnResizing: true,
    enableEditing: false,
    editMode: 'cell',
  },
  render: (args) => (
    <DataTable
      columns={ticketColumns}
      data={tickets.slice(0, 12)}
      getRowId={(row) => row.id}
      enablePagination={false}
      enableColumnActions
      enableCellSelection
      enableKeyboardNavigation
      enableBorders="all"
      {...args}
    />
  ),
}

/**
 * The six ways a long value can be handled, one table each, over the same
 * rows. The first is the table before these options existed.
 */
export const Comparison: Story = {
  render: () => (
    <>
      {(
        [
          ['truncate', 'none', 'Before: cut, and no way to read the rest'],
          ['truncate', 'title', "Cut; the browser's own tooltip on hover"],
          ['truncate', 'peek', 'Cut; opens out in place on hover and focus (the default)'],
          ['truncate', 'peek-scroll', 'Cut; opens out in place, and can be scrolled and selected'],
          ['clamp', 'peek', 'Two lines, then cut; opens out for the rest'],
          ['wrap', 'none', 'Everything, on as many lines as it takes'],
        ] as Array<[DataTableCellOverflow, DataTableCellOverflowReveal, string]>
      ).map(([cellOverflow, cellOverflowReveal, caption]) => (
        <div key={`${cellOverflow}-${cellOverflowReveal}`} style={{ marginBottom: 24 }}>
          <DataTable
            columns={ticketColumns}
            data={tickets.slice(0, 4)}
            getRowId={(row) => row.id}
            cellOverflow={cellOverflow}
            cellOverflowReveal={cellOverflowReveal}
            enableToolbar={false}
            enablePagination={false}
            enableBorders="all"
            caption={`cellOverflow="${cellOverflow}" cellOverflowReveal="${cellOverflowReveal}" — ${caption}`}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * The recommended setup: the table default everywhere, and the two columns
 * with an unusual shape saying so for themselves.
 *
 * ```tsx
 * helper.accessor('notes', { meta: { cellOverflow: 'clamp', cellMaxLines: 3 } })
 * helper.accessor('id', { meta: { enableClickToCopy: true } })
 * ```
 */
export const PerColumn: Story = {
  render: () => (
    <DataTable
      columns={recommendedColumns}
      data={tickets.slice(0, 10)}
      getRowId={(row) => row.id}
      enablePagination={false}
      enableStripes
      enableRowSelection
      enableClickToSelect
    />
  ),
}

/** Notes that run to paragraphs, taller than any peek is allowed to grow. */
const LOG = [
  'Customer reports that the nightly export stops partway through. First seen after the 3.2 upgrade; the job log shows the export reaching the pagination boundary and then exiting cleanly with no error.',
  'Reproduced on staging with a copy of their data. The export only stops when a filter on a date column is active and the result spans a daylight-saving change — the page cursor is computed in local time and skips an hour.',
  'Workaround sent: filter in UTC. Fix in review; it moves the cursor to UTC and adds a regression test with a range across the October change.',
  'Customer confirmed the workaround. Leaving open until the fix ships in 3.2.4.',
].join('\n\n')

const longNotes = tickets.map((ticket, index) => ({
  ...ticket,
  notes: index % 2 === 0 ? LOG : ticket.notes,
}))

/**
 * `peek-scroll`: a peek that can be pointed at.
 *
 * Values that run to paragraphs outgrow any peek, and a plain `peek` cuts what
 * does not fit its 320px — it takes no pointer events, so there is nothing to
 * scroll it with. `peek-scroll` takes the pointer: move onto it and it stays
 * open, the wheel scrolls it without scrolling the table, and its text can be
 * selected and copied. A plain click on it closes it and goes through to the
 * cell underneath, so clicking a row still selects it.
 *
 * Set on the one column that needs it; the rest of the table keeps the plain
 * `peek`, which never stands in the way of the cells around it.
 *
 * ```tsx
 * helper.accessor('notes', { meta: { cellOverflowReveal: 'peek-scroll' } })
 * ```
 */
export const ScrollablePeek: Story = {
  render: () => (
    <DataTable
      columns={ticketColumns.map((column) =>
        (column as { accessorKey?: string }).accessorKey === 'notes'
          ? { ...column, meta: { ...column.meta, cellOverflowReveal: 'peek-scroll' as const } }
          : column,
      )}
      data={longNotes.slice(0, 10)}
      getRowId={(row) => row.id}
      enablePagination={false}
      enableRowSelection
      enableClickToSelect
    />
  ),
}

/** The notes column set to a reveal mode, over the paragraph-length notes. */
const withNotesReveal = (cellOverflowReveal: DataTableCellOverflowReveal, enableClickToCopy?: boolean) =>
  ticketColumns.map((column) =>
    (column as { accessorKey?: string }).accessorKey === 'notes'
      ? { ...column, meta: { ...column.meta, cellOverflowReveal, enableClickToCopy } }
      : column,
  )

/**
 * The three peeks side by side, over notes too long for any of them.
 *
 * Try the same things on each: rest on a long note, then turn the wheel; move
 * from the note onto the Amount cell beside it; click the note while it is
 * open.
 *
 * | | `peek` | `peek-wheel` | `peek-native` | `peek-scroll` |
 * | --- | --- | --- | --- | --- |
 * | Takes the pointer | no | no | only over its own cell | yes |
 * | Reads past 320px | no — cut | wheel, over its own cell | wheel, over its own cell | wheel or scrollbar, anywhere on it |
 * | Scrolled by | — | the table's code | the browser | the browser |
 * | Neighbours hover and click normally | yes | yes | yes | no, while it covers them |
 * | Text can be selected | no | no | no | yes |
 * | Wheel at the end of the value | `cellPeekOverscroll` | `cellPeekOverscroll` | the browser's `overscroll-behavior` | the browser's `overscroll-behavior` |
 */
export const PeekInteraction: Story = {
  render: () => (
    <>
      {(
        [
          ['peek', 'A picture of the value: nothing can be done with it, and what does not fit is cut'],
          ['peek-wheel', 'Still a picture, but the wheel scrolls it while the pointer stays on its own cell'],
          ['peek-native', 'The same, with the browser doing the scrolling through a proxy over the cell'],
          ['peek-scroll', 'Takes the pointer: scroll or select anywhere on it, at the price of covering its neighbours'],
        ] as Array<[DataTableCellOverflowReveal, string]>
      ).map(([reveal, caption]) => (
        <div key={reveal} style={{ marginBottom: 24 }}>
          <DataTable
            columns={withNotesReveal(reveal)}
            data={longNotes.slice(0, 4)}
            getRowId={(row) => row.id}
            enableToolbar={false}
            enablePagination={false}
            enableRowSelection
            enableClickToSelect
            enableBorders="all"
            caption={`notes: cellOverflowReveal="${reveal}" — ${caption}`}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * The three looks side by side — experimental, to pick one.
 *
 * `solid` is the peek as it stands: one surface, so the overflow reads as the
 * cell grown larger, and where the cell ended is lost. `outlined` rings the
 * cell's own bounds and tints what lies beyond them. `glass` keeps the cell
 * opaque and makes the overflow translucent over a blur, so the cells it
 * covers stay faintly in view. The marking is a background layer, so it stays
 * put while a `peek-wheel` scrolls — which is what the notes column here uses.
 */
export const PeekAppearance: Story = {
  args: { theme: 'default' },
  argTypes: {
    theme: {
      control: 'select',
      options: ['default', ...Object.keys(dataTableThemes)],
      description: 'A theme preset, to see each look on a dark surface too (`linear`).',
      table: { category: 'Appearance' },
    },
  },
  render: (args) => (
    <>
      {(
        [
          ['solid', 'One surface; the cell\'s own bounds are not marked'],
          ['outlined', 'The cell ringed in the accent; the overflow tinted as its extension'],
          ['glass', 'The cell opaque; the overflow translucent over the cells it covers'],
        ] as Array<[DataTableCellPeekAppearance, string]>
      ).map(([appearance, caption]) => (
        <div key={appearance} style={{ marginBottom: 24 }}>
          <DataTable
            columns={withNotesReveal('peek-wheel')}
            data={longNotes.slice(0, 4)}
            getRowId={(row) => row.id}
            cellPeekAppearance={appearance}
            cssVars={
              args.theme === 'default'
                ? undefined
                : dataTableThemes[args.theme as keyof typeof dataTableThemes]
            }
            enableToolbar={false}
            enablePagination={false}
            enableStripes
            enableBorders="all"
            caption={`cellPeekAppearance="${appearance}" — ${caption}`}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * What the wheel does once a `peek-wheel` has been read to the end —
 * experimental, to pick one.
 *
 * Each table here scrolls inside its own 300px, which is the scroll a reader
 * least wants to lose their place in. Rest on a long note and flick the wheel
 * (a trackpad shows it best): the first flick scrolls the note, and what
 * happens when it runs out is the difference.
 *
 * | | at the end, same flick | next flick | to scroll the table |
 * | --- | --- | --- | --- |
 * | `chain` | carries on into the table | table | keep scrolling |
 * | `contain` | stops, edge marked | stops, edge marked | move off the cell |
 * | `latch` | stops, edge marked | table | flick again |
 * | `peek-native`, `auto` | stops | table, once the pointer moves or the wheel rests | move the pointer a little, or wait |
 * | `peek-native`, `contain` | stops | stops | move off the cell |
 *
 * The last two are the browser's rules rather than the table's: `peek-native`
 * scrolls a real scroll container laid over the cell, so they are exactly what
 * the same wheel does in any nested scroll box on the page.
 */
export const PeekOverscroll: Story = {
  args: { enableEditing: false },
  argTypes: {
    enableEditing: {
      control: 'boolean',
      description: 'Double-click a cell to edit it — through the `peek-native` proxy too.',
      table: { category: 'Editing' },
    },
  },
  render: (args) => (
    <>
      {(
        [
          ['peek-wheel', 'chain', 'The rest of the flick, momentum and all, scrolls the table and closes the peek'],
          ['peek-wheel', 'contain', 'Never passed on: the edge is marked, and scrolling the table means moving off the cell'],
          ['peek-wheel', 'latch', 'A flick that started in the note ends in the note; the next one scrolls the table'],
          [
            'peek-native',
            'latch',
            "The browser's own overscroll-behavior: auto — the wheel stays with the note until the pointer moves or the wheel rests",
          ],
          ['peek-native', 'contain', "The browser's own overscroll-behavior: contain — never passed on"],
        ] as Array<[DataTableCellOverflowReveal, DataTableCellPeekOverscroll, string]>
      ).map(([reveal, overscroll, caption]) => (
        <div key={`${reveal}-${overscroll}`} style={{ marginBottom: 24 }}>
          <DataTable
            // The native rows copy on click, to show a control in a covered
            // cell still answering it.
            columns={withNotesReveal(reveal, reveal === 'peek-native')}
            data={longNotes.slice(0, 10)}
            getRowId={(row) => row.id}
            cellPeekOverscroll={overscroll}
            cellPeekAppearance="outlined"
            enableEditing={Boolean(args.enableEditing)}
            editMode="cell"
            height={300}
            enableStickyHeader
            enableRowSelection
            enableClickToSelect
            enableToolbar={false}
            enablePagination={false}
            enableBorders="all"
            caption={
              reveal === 'peek-native'
                ? `peek-native, overscroll-behavior: ${overscroll === 'contain' ? 'contain' : 'auto'} — ${caption}`
                : `peek-wheel, cellPeekOverscroll="${overscroll}" — ${caption}`
            }
          />
        </div>
      ))}
    </>
  ),
}

/**
 * Fitting a column to what it holds.
 *
 * Double-click the edge of a column header, as in a spreadsheet, or choose
 * "Fit to content" from the column menu. It measures the rows that are
 * mounted — this page, or a virtualized body's current window — plus the
 * header, and respects `minSize` and `maxSize`: the link column here stops at
 * 360px however long its longest URL is.
 */
export const FitToContent: Story = {
  render: () => (
    <DataTable
      columns={ticketColumns.map((column) =>
        (column as { accessorKey?: string }).accessorKey === 'url' ? { ...column, maxSize: 360 } : column,
      )}
      data={tickets.slice(0, 10)}
      getRowId={(row) => row.id}
      enablePagination={false}
      enableColumnResizing
      enableColumnActions
      enableBorders="all"
    />
  ),
}

/**
 * Wrapped rows under row virtualization.
 *
 * Each row is measured as it mounts, so rows of different heights scroll
 * without overlapping — except in Firefox, where the virtualizer does not
 * measure and rows keep their estimated height.
 */
export const WrapWithVirtualization: Story = {
  render: () => (
    <DataTable
      columns={recommendedColumns.map((column) =>
        (column as { accessorKey?: string }).accessorKey === 'title'
          ? { ...column, meta: { ...column.meta, cellOverflow: 'wrap' as const } }
          : column,
      )}
      data={Array.from({ length: 25 }, (_, round) =>
        tickets.map((ticket) => ({ ...ticket, id: `${ticket.id}-${round}` })),
      ).flat()}
      getRowId={(row) => row.id}
      enablePagination={false}
      enableRowVirtualization
      enableStickyHeader
      height={520}
    />
  ),
}

/**
 * Transposed, a record is a column and its width is the record width, so the
 * same values are cut at a different edge. The options follow the column they
 * were set on — which is a row here.
 */
export const Transposed: Story = {
  render: () => (
    <DataTable
      columns={recommendedColumns}
      data={tickets.slice(0, 5)}
      getRowId={(row) => row.id}
      transposed
      enablePagination={false}
      enableBorders="all"
    />
  ),
}
