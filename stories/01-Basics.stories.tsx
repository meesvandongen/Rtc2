import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { appearanceArgTypes, loadingArgTypes } from './controls'
import { makePeople, personColumns } from './fixtures'

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
