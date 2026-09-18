import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type DataTableOptions } from '../src'
import { appearanceArgTypes, chromeArgTypes, loadingArgTypes } from './controls'
import { makePeople, personColumns, type Person } from './fixtures'

const data = makePeople(25)

const meta: Meta = {
  title: 'DataTable/01 Basics',
  argTypes: { ...appearanceArgTypes, ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** The minimum viable table: columns and data, nothing else. Every control below applies. */
export const Basic: Story = {
  args: {
    // `density` left unset so the toolbar's own density toggle keeps working;
    // setting it here would pin density the same way it does for consumers.
    layoutMode: 'semantic',
    enableStripes: false,
    enableRowHover: true,
    enableBorders: 'horizontal',
    enableStickyHeader: false,
    enableStickyFooter: false,
    direction: 'ltr',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} {...args} />
  ),
}

/**
 * Row height and cell padding are driven by `--rtc-row-height-*` and
 * `--rtc-cell-padding-y-*`; the toolbar button cycles the three presets.
 */
export const Density: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Use the density button in the toolbar, or set <code>density</code> directly. Each preset
        maps to CSS variables you can override.
      </p>
      {(['compact', 'comfortable', 'spacious'] as const).map((density) => (
        <div key={density} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 4)}
            data={data.slice(0, 3)}
            density={density}
            getRowId={(row) => row.id}
            enableToolbar={false}
            enablePagination={false}
            caption={`density="${density}"`}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * `semantic` uses the browser's table algorithm; the `grid` modes make column
 * sizes authoritative, which is what resizing and virtualization need.
 */
export const LayoutModes: Story = {
  render: () => (
    <>
      {(['semantic', 'grid', 'grid-no-grow'] as const).map((layoutMode) => (
        <div key={layoutMode} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 4)}
            data={data.slice(0, 4)}
            layoutMode={layoutMode}
            getRowId={(row) => row.id}
            enableToolbar={false}
            enablePagination={false}
            caption={`layoutMode="${layoutMode}"`}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * Six columns, one of which declares a `footer` — otherwise there is no
 * `<tfoot>` for `enableTableFooter` to take away.
 */
const chromeColumns = personColumns
  .slice(0, 6)
  .map((column, index) => (index === 5 ? { ...column, footer: 'Total ages' } : column))

/** Each layout choice, as the one option that produces it. */
const chromeCases: Array<{ label: string; options: Partial<DataTableOptions<Person>> }> = [
  { label: 'everything on', options: {} },
  { label: 'enableTopToolbar={false}', options: { enableTopToolbar: false } },
  { label: 'enableBottomToolbar={false}', options: { enableBottomToolbar: false } },
  { label: 'enableToolbar={false} — neither bar', options: { enableToolbar: false } },
  { label: 'enableTableHead={false} — no column header', options: { enableTableHead: false } },
  { label: 'enableTableFooter={false} — no column footer', options: { enableTableFooter: false } },
  {
    // The bottom bar had nothing left to hold and used to stay behind as a
    // 17px strip of surface under a full-width border, which read as a second,
    // empty footer row. It now goes with the pagination.
    label: 'enablePagination={false} — the bottom bar goes too',
    options: { enablePagination: false },
  },
  {
    // Same again for the top bar: emptying it of every occupant removes it,
    // without anyone having to also pass `enableTopToolbar={false}`.
    label: 'nothing left for either bar — no chrome at all',
    options: {
      enablePagination: false,
      enableGlobalFilter: false,
      enableColumnFilters: false,
      enableToolbarInternalActions: false,
    },
  },
]

/**
 * Every band of chrome is optional, and switching one off leaves nothing
 * behind — no empty bar, no stray divider.
 *
 * The two toolbars are the ones worth knowing about, because they can also
 * empty out without being switched off. Pagination is the bottom bar's only
 * built-in occupant, so `enablePagination={false}` removes the bar itself
 * rather than leaving a sliver of surface under the last row; the top bar goes
 * the same way once the search box, the internal actions and every chip are
 * gone. Either bar comes back on its own the moment it has something to say —
 * a selection count, an active filter chip — so keep that in mind if a table
 * of yours must not change height.
 */
export const Chrome: Story = {
  render: () => (
    <>
      {chromeCases.map(({ label, options }) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <DataTable
            columns={chromeColumns}
            data={data.slice(0, 4)}
            getRowId={(row) => row.id}
            caption={label}
            {...options}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * The other half of an emptied toolbar: it comes back the moment it has
 * something to say.
 *
 * Nothing here asks for a top bar — no search, no internal actions, no
 * pagination — so the table starts without one. Select a row and the bar
 * appears to report the count; clear the selection and it goes again. Pass
 * `enableTopToolbar={false}` when a table of yours must keep its height no
 * matter what the rows are doing.
 */
export const ChromeSelectionSummary: Story = {
  render: () => (
    <DataTable
      columns={chromeColumns}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enableRowSelection
      enablePagination={false}
      enableGlobalFilter={false}
      enableColumnFilters={false}
      enableToolbarInternalActions={false}
    />
  ),
}

/** The same choices as controls, for the combinations `Chrome` does not cover. */
export const ChromeControls: Story = {
  args: {
    enableTopToolbar: true,
    enableBottomToolbar: true,
    enableToolbarInternalActions: true,
    enableTableHead: true,
    enableTableFooter: true,
    enablePagination: true,
    enableGlobalFilter: true,
  },
  argTypes: chromeArgTypes,
  render: (args) => (
    <DataTable columns={chromeColumns} data={data.slice(0, 8)} getRowId={(row) => row.id} {...args} />
  ),
}

/** Each arrangement, as the layout that produces it. */
const layoutCases: Array<{ label: string; options: Partial<DataTableOptions<Person>> }> = [
  { label: 'the default arrangement', options: {} },
  {
    // The start now holds the search box and nothing else — the selection
    // count that region would have drawn is not in the list, so it is not
    // drawn. The end is not mentioned, so the icon cluster is untouched.
    label: "toolbarLayout={{ top: { start: ['search'] } }}",
    options: {
      toolbarLayout: { top: { start: ['search'] } },
      enableRowSelection: true,
      initialState: { rowSelection: { p2: true } },
    },
  },
  {
    // The same layout with `rest`, which is the other half of writing a
    // region: the search box goes first and the region keeps what it already
    // held. Scoped to the region it is written in, so it never reaches into
    // what another region says.
    label: "toolbarLayout={{ top: { start: ['search', 'rest'] } }}",
    options: {
      toolbarLayout: { top: { start: ['search', 'rest'] } },
      enableRowSelection: true,
      initialState: { rowSelection: { p2: true } },
    },
  },
  {
    // Removal is the same sentence, from the other side: a region you write is
    // all that region holds, so leaving the density and full-screen toggles
    // out of it is how they go. No second list to keep in step.
    label: 'two icons instead of five, by writing the region',
    options: {
      toolbarLayout: {
        top: { end: ['search', { group: ['filter-toggle', 'column-visibility'] }] },
      },
      filterDisplayMode: 'popover-and-panel',
    },
  },
  {
    // Where the pagination goes is this and nothing else. Naming it in the
    // top bar gives up its seat in the bottom one, which empties that bar and
    // removes it.
    label: "toolbarLayout={{ top: { center: ['pagination'] } }}",
    options: { toolbarLayout: { top: { center: ['pagination'] } } },
  },
  {
    // A second row is an array. The first row writes no region at all, so the
    // bar keeps everything it had, and the chips move down to a line of their
    // own, where a long filter cannot squeeze the search box.
    label: 'a row of its own for the filter chips',
    options: {
      toolbarLayout: { top: [{}, { start: ['filter-chips'] }] },
      initialState: { columnFilters: [{ id: 'firstName', value: { op: 'contains', value: 'a' } }] },
    },
  },
  {
    // A cluster stays a cluster wherever it is put: these three sit at the
    // icon gap in the bottom bar, and the top bar is left holding the search
    // box alone.
    label: 'the icon actions moved to the bottom bar',
    options: {
      toolbarLayout: {
        bottom: {
          start: [{ group: ['column-visibility', 'density-toggle', 'fullscreen-toggle'] }],
        },
      },
    },
  },
]

/**
 * Where the toolbar's occupants sit, as an ordered list per region.
 *
 * Each bar has a `start`, a `center` and an `end`, and takes one row or an
 * array of them. A region you write is exactly what that region holds — which
 * is how a layout both places and removes — and a region you leave out keeps
 * its default, so you only describe the parts of the bar you care about. An id
 * named twice is drawn twice — `pagination` in both bars is how it goes in both
 * — and `rest` gives a region back what it would have held.
 *
 * A region with nothing in it is not drawn, and neither is a row, or a bar: the
 * arrangement never leaves a gap behind.
 */
export const ToolbarLayout: Story = {
  render: () => (
    <>
      {layoutCases.map(({ label, options }) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 4)}
            data={data.slice(0, 4)}
            getRowId={(row) => row.id}
            caption={label}
            enableGlobalFilterToggle={false}
            {...options}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * Content of your own, addressed by an id.
 *
 * An item registered in `toolbarItems` goes wherever the layout says — here one
 * at the far end of the bottom bar, past the pagination, and one at the start
 * of the top. An item the layout never names lands at the end of the top bar,
 * since it has no default region of its own for a `rest` to hand it back.
 */
export const ToolbarItems: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 4)}
      data={data.slice(0, 6)}
      getRowId={(row) => row.id}
      toolbarItems={{
        title: <strong>Team</strong>,
        export: ({ table }) => (
          <button
            type="button"
            className="rtc-button"
            onClick={() => alert(`${table.getRowCount()} rows`)}
          >
            Export
          </button>
        ),
      }}
      toolbarLayout={{
        top: { start: ['title'] },
        bottom: { end: ['pagination', 'export'] },
      }}
    />
  ),
}

export const StickyHeaderAndFooter: Story = {
  render: () => (
    <DataTable
      columns={personColumns.map((column, index) =>
        index === 5 ? { ...column, footer: 'Total ages' } : column,
      )}
      data={makePeople(60)}
      getRowId={(row) => row.id}
      height={420}
      enableStickyHeader
      enableStickyFooter
      enablePagination={false}
    />
  ),
}

export const StripesAndBorders: Story = {
  render: () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <DataTable
          columns={personColumns.slice(0, 5)}
          data={data.slice(0, 5)}
          enableStripes
          enableBorders="horizontal"
          enableToolbar={false}
          enablePagination={false}
          caption="enableStripes + horizontal borders"
        />
      </div>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={data.slice(0, 5)}
        enableBorders="all"
        enableToolbar={false}
        enablePagination={false}
        caption='enableBorders="all"'
      />
    </>
  ),
}

/** Every layout property is logical, so `dir="rtl"` mirrors the whole table. */
export const RightToLeft: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data.slice(0, 6)}
      direction="rtl"
      getRowId={(row) => row.id}
      enableColumnPinning
      enableColumnActions
      initialState={{ columnPinning: { start: ['firstName'], end: [] } }}
    />
  ),
}

export const EmptyState: Story = {
  render: () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <DataTable columns={personColumns.slice(0, 4)} data={[]} />
      </div>
      <DataTable
        columns={personColumns.slice(0, 4)}
        data={[]}
        renderEmptyState={() => (
          <div className="rtc-empty">
            <strong>Nothing here yet</strong>
            <div>Add your first record to get started.</div>
          </div>
        )}
      />
    </>
  ),
}

/**
 * Everything the two states can be asked to say.
 *
 * The default message, one long enough to be worth translating, one the caller
 * wrote, and the error — the last being the other state that is one cell across
 * the whole table rather than anything belonging to a column.
 */
const spanningStateVariants: Array<{
  label: string
  options: Partial<DataTableOptions<Person>>
}> = [
  { label: 'default message', options: {} },
  {
    // The message is a translation away from being half again as long, and its
    // length must not be what decides whether it lands in the middle.
    label: 'localized message',
    options: { localization: { noRecordsToDisplay: 'Geen gegevens om weer te geven' } },
  },
  {
    label: 'renderEmptyState',
    options: {
      renderEmptyState: () => (
        <div className="rtc-empty">
          <strong>Nothing here yet</strong>
          <div>Add your first record to get started.</div>
        </div>
      ),
    },
  },
  {
    label: 'error',
    options: { isLoadingError: true, errorMessage: 'Could not reach the employees service.' },
  },
]

/**
 * The empty and error states, in every layout mode.
 *
 * Each is one message about the whole table rather than anything belonging to a
 * column, so each is centred across the full width in all three modes — and
 * stays centred for a message of any length, translated or written by the
 * caller.
 *
 * The grid modes are what this is here to show. A row is a flex line there and
 * `colSpan` says nothing about width, so the cell took its width from its own
 * message and parked it over the first column: centred inside a box a sixth of
 * the table wide, which reads as left-aligned against the table, with the
 * message's own height spilling out of a row still sized for one line of data.
 */
export const SpanningStates: Story = {
  render: () => (
    <>
      {(['semantic', 'grid', 'grid-no-grow'] as const).flatMap((layoutMode) =>
        spanningStateVariants.map(({ label, options }) => (
          <div key={`${layoutMode}-${label}`} style={{ marginBottom: 16 }}>
            <DataTable
              columns={personColumns.slice(0, 4)}
              data={[] as Person[]}
              layoutMode={layoutMode}
              enableToolbar={false}
              enablePagination={false}
              enableBorders="all"
              caption={`layoutMode="${layoutMode}" — ${label}`}
              {...options}
            />
          </div>
        )),
      )}
    </>
  ),
}

/**
 * Skeletons on a cold load with an empty body; a slim progress bar when
 * `showProgressBars` is set, or when the body already has rows.
 */
export const LoadingStates: Story = {
  args: {
    hasData: false,
    isLoading: true,
    showProgressBars: false,
    skeletonRowCount: 6,
  },
  argTypes: {
    hasData: {
      control: 'boolean',
      description: 'Story-only knob: whether the table already has rows before `isLoading` flips on.',
      table: { category: 'Loading' },
    },
  },
  render: ({ hasData, ...args }) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={hasData ? data.slice(0, 5) : []}
      {...args}
    />
  ),
}

export const ErrorState: Story = {
  args: {
    isLoadingError: true,
    errorMessage: 'Could not reach the employees service. Retry in a moment.',
  },
  render: (args) => <DataTable columns={personColumns.slice(0, 5)} data={[]} {...args} />,
}

/**
 * The two ids that come with a default place, for content that only wants the
 * one the toolbar would have given it.
 *
 * `top-actions` and `bottom-actions` lead their bar, so registering one is
 * enough on its own and no layout is needed — and either can still be named in
 * `toolbarLayout` later and moved anywhere.
 */
export const CustomToolbarContent: Story = {
  args: { enableRowSelection: true },
  argTypes: { enableRowSelection: { control: 'boolean', table: { category: 'Behaviour' } } },
  render: ({ enableRowSelection }) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      enableRowSelection={enableRowSelection}
      toolbarItems={{
        'top-actions': ({ table }) => (
          <button
            type="button"
            className="rtc-button"
            data-testid="bulk-action"
            onClick={() =>
              alert(`${Object.keys(table.state.rowSelection).length} row(s) selected`)
            }
          >
            Bulk action
          </button>
        ),
        'bottom-actions': <span className="rtc-group-count">Updated just now</span>,
      }}
    />
  ),
}
