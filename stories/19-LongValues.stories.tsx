import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  createDataTableColumnHelper,
  DataTable,
  type DataTableCellOverflow,
  type DataTableCellOverflowReveal,
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
    options: ['peek', 'title', 'none'] satisfies DataTableCellOverflowReveal[],
    description:
      'How a cut-short cell shows the rest of its value. Per column: `meta.cellOverflowReveal`.',
    table: { category: 'Long values' },
  },
  enableColumnResizing: {
    control: 'boolean',
    description: 'Double-click a column edge, or use the column menu, to fit it to its content.',
    table: { category: 'Columns' },
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
    enableColumnResizing: true,
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
 * The five ways a long value can be handled, one table each, over the same
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
