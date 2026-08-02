import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { currency, makePeople, personColumns } from './fixtures'

const data = makePeople(60)

const meta: Meta = {
  title: 'DataTable/07 Grouping & Aggregation',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/** Group by a column from its actions menu; grouped cells expand to reveal rows. */
export const Grouping: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableGrouping
      enableColumnActions
      enableExpanding
      initialState={{ grouping: ['department'] }}
      enablePagination={false}
      height={520}
      enableStickyHeader
    />
  ),
}

/** Drag a column header into the chip area to group by it. */
export const GroupingChips: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Drag a column grip into the dashed zone to group by it, or remove a chip to ungroup.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        enableGrouping
        enableGroupingChips
        enableColumnDragging
        enableColumnActions
        enableExpanding
        initialState={{ grouping: ['department'] }}
        height={520}
        enablePagination={false}
      />
    </>
  ),
}

/** Two grouping levels produce a nested tree of group rows. */
export const MultiLevelGrouping: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableGrouping
      enableGroupingChips
      enableExpanding
      initialState={{ grouping: ['department', 'city'] }}
      enablePagination={false}
      height={520}
      enableStickyHeader
    />
  ),
}

/**
 * Aggregation functions summarise each group. `aggregatedCell` controls how
 * the summary is rendered, separately from the leaf cell.
 */
export const Aggregation: Story = {
  render: () => (
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
      enableGrouping
      enableAggregation
      enableExpanding
      enableColumnActions
      initialState={{ grouping: ['department'] }}
      enablePagination={false}
      height={520}
      enableStickyHeader
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
