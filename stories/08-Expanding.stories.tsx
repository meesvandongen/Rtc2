import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { currency, makePeople, makeTree, personColumns } from './fixtures'

const meta: Meta = {
  title: 'DataTable/08 Expanding',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/** Hierarchical data via `getSubRows`; depth is shown by cell indentation. */
export const SubRows: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enableExpanding
      enablePagination={false}
    />
  ),
}

export const ExpandedByDefault: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enableExpanding
      enablePagination={false}
      initialState={{ expanded: true }}
    />
  ),
}

/** The header chevron expands or collapses every expandable row at once. */
export const ExpandAll: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enableExpanding
      enableExpandAll
      enablePagination={false}
    />
  ),
}

/**
 * A detail panel renders arbitrary content in a full-width row beneath its
 * parent. Providing `renderDetailPanel` makes every row expandable.
 */
export const DetailPanel: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makePeople(12)}
      getRowId={(row) => row.id}
      renderDetailPanel={({ row }) => (
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div>
            <strong>Email</strong>
            <div>{row.original.email}</div>
          </div>
          <div>
            <strong>Salary</strong>
            <div>{currency(row.original.salary)}</div>
          </div>
          <div>
            <strong>Started</strong>
            <div>{row.original.startDate}</div>
          </div>
        </div>
      )}
      enablePagination={false}
    />
  ),
}

/** Sub-rows and a detail panel together. */
export const DetailPanelWithSubRows: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enableExpanding
      renderDetailPanel={({ row }) => (
        <span>
          {row.original.firstName} reports {row.subRows.length} direct report(s).
        </span>
      )}
      enablePagination={false}
    />
  ),
}

/** Only rows with an even index can expand. */
export const ConditionalExpanding: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makePeople(10)}
      getRowId={(row) => row.id}
      enableExpanding
      getRowCanExpand={(row) => row.index % 2 === 0}
      renderDetailPanel={({ row }) => <span>Details for {row.original.firstName}</span>}
      enablePagination={false}
    />
  ),
}

/** `paginateExpandedRows={false}` keeps children with their parent's page. */
export const ExpandingWithPagination: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enableExpanding
      paginateExpandedRows={false}
      initialState={{ pagination: { pageIndex: 0, pageSize: 2 }, expanded: true }}
    />
  ),
}
