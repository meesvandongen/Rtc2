import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { loadingArgTypes } from './controls'
import { currency, makePeople, personColumns } from './fixtures'

const data = makePeople(60)

/** Grouping/aggregation props shared across most stories in this file. */
const groupingArgTypes = {
  enableGrouping: { control: 'boolean', table: { category: 'Grouping' } },
  enableGroupingChips: {
    control: 'boolean',
    description: 'Show the drag-to-group chip area in the top toolbar.',
    table: { category: 'Grouping' },
  },
  enableAggregation: { control: 'boolean', table: { category: 'Grouping' } },
  enableExpanding: {
    control: 'boolean',
    description: 'Grouped rows need this to open. Defaults on whenever `enableGrouping` is set.',
    table: { category: 'Grouping' },
  },
  enableColumnActions: { control: 'boolean', table: { category: 'Grouping' } },
  enableColumnDragging: { control: 'boolean', table: { category: 'Grouping' } },
} as const

const meta: Meta = {
  title: 'DataTable/07 Grouping & Aggregation',
  argTypes: { ...loadingArgTypes, ...groupingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** Group by a column from its actions menu; grouped cells expand to reveal rows. */
export const Grouping: Story = {
  args: {
    enableGrouping: true,
    enableColumnActions: true,
    enableExpanding: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ grouping: ['department'] }}
      enablePagination={false}
      height={520}
      enableStickyHeader
      {...args}
    />
  ),
}

/** Drag a column header into the chip area to group by it. */
export const GroupingChips: Story = {
  args: {
    enableGrouping: true,
    enableGroupingChips: true,
    enableColumnDragging: true,
    enableColumnActions: true,
    enableExpanding: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Drag a column grip into the dashed zone to group by it, or remove a chip to ungroup.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        initialState={{ grouping: ['department'] }}
        height={520}
        enablePagination={false}
        {...args}
      />
    </>
  ),
}

/** Two grouping levels produce a nested tree of group rows. */
export const MultiLevelGrouping: Story = {
  args: {
    enableGrouping: true,
    enableGroupingChips: true,
    enableExpanding: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ grouping: ['department', 'city'] }}
      enablePagination={false}
      height={520}
      enableStickyHeader
      {...args}
    />
  ),
}

/**
 * Aggregation functions summarise each group. `aggregatedCell` controls how
 * the summary is rendered, separately from the leaf cell.
 */
export const Aggregation: Story = {
  args: {
    enableGrouping: true,
    enableAggregation: true,
    enableExpanding: true,
    enableColumnActions: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns.map((column) => {
        const key = (column as { accessorKey?: string }).accessorKey
        if (key === 'salary') {
          return {
            ...column,
            aggregationFn: 'sum' as const,
            aggregatedCell: ({ getValue }: any) => `Σ ${currency(Number(getValue() ?? 0))}`,
          }
        }
        if (key === 'age') {
          return {
            ...column,
            aggregationFn: 'mean' as const,
            aggregatedCell: ({ getValue }: any) => `x̄ ${Number(getValue() ?? 0).toFixed(1)}`,
          }
        }
        if (key === 'city') {
          return {
            ...column,
            aggregationFn: 'uniqueCount' as const,
            aggregatedCell: ({ getValue }: any) => `${getValue()} cities`,
          }
        }
        return column
      })}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ grouping: ['department'] }}
      enablePagination={false}
      height={520}
      enableStickyHeader
      {...args}
    />
  ),
}

/**
 * `groupedColumnMode` decides where a grouped column goes.
 *
 * `reorder` (the default) moves it to the front of the table, `remove` drops
 * it and shows the group value next to the expand chevron instead, and `false`
 * leaves the column order untouched.
 */
export const GroupedColumnModes: Story = {
  render: () => (
    <>
      {(['reorder', 'remove', false] as const).map((mode) => (
        <div key={String(mode)} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 6)}
            data={data.slice(0, 20)}
            getRowId={(row) => row.id}
            enableGrouping
            groupedColumnMode={mode}
            initialState={{ grouping: ['department'] }}
            enablePagination={false}
            enableToolbar={false}
            caption={`groupedColumnMode={${JSON.stringify(mode)}}`}
            height={280}
          />
        </div>
      ))}
    </>
  ),
}
