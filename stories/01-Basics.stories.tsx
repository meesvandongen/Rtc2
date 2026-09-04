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

export const CustomToolbarSlots: Story = {
  args: { enableRowSelection: true },
  argTypes: { enableRowSelection: { control: 'boolean', table: { category: 'Behaviour' } } },
  render: ({ enableRowSelection }) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      enableRowSelection={enableRowSelection}
      renderTopToolbarActions={({ table }) => (
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
      )}
      renderBottomToolbarActions={() => <span className="rtc-group-count">Updated just now</span>}
    />
  ),
}
