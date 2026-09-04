import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { loadingArgTypes } from './controls'
import { currency, makePeople, makeTree, personColumns } from './fixtures'

/** Expanding-related props shared across most stories in this file. */
const expandingArgTypes = {
  enableExpanding: {
    control: 'boolean',
    description: 'Defaults to on when grouping or a detail panel is in play.',
    table: { category: 'Expanding' },
  },
  enableExpandAll: {
    control: 'boolean',
    description: 'Shows the header chevron that expands or collapses every expandable row at once.',
    table: { category: 'Expanding' },
  },
  paginateExpandedRows: {
    control: 'boolean',
    description: 'When off, expanded children stay on the same page as their parent instead of being paginated on their own.',
    table: { category: 'Expanding' },
  },
} as const

const meta: Meta = {
  title: 'DataTable/08 Expanding',
  argTypes: { ...loadingArgTypes, ...expandingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Hierarchical data via `getSubRows`. Depth is shown by the row's own chevron,
 * indented one step per level inside the expand column — the data columns stay
 * in line, so the values are still read down a column rather than a staircase.
 */
export const SubRows: Story = {
  args: {
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
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enablePagination={false}
      {...args}
    />
  ),
}

/** `expanded: true` opens every branch, at every depth, on the first render. */
export const ExpandedByDefault: Story = {
  args: {
    enableExpanding: true,
    enableExpandAll: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enablePagination={false}
      initialState={{ expanded: true }}
      {...args}
    />
  ),
}

/** Naming row ids opens just those branches; the rest start collapsed. */
export const SomeRowsExpandedByDefault: Story = {
  args: {
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
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enablePagination={false}
      initialState={{ expanded: { p1: true, p4: true } }}
      {...args}
    />
  ),
}

/** The header chevron expands or collapses every expandable row at once. */
export const ExpandAll: Story = {
  args: {
    enableExpanding: true,
    enableExpandAll: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enablePagination={false}
      {...args}
    />
  ),
}

/**
 * A detail panel renders arbitrary content in a full-width row beneath its
 * parent. Providing `renderDetailPanel` makes every row expandable.
 */
export const DetailPanel: Story = {
  args: {
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
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
      {...args}
    />
  ),
}

/** Sub-rows and a detail panel together. */
export const DetailPanelWithSubRows: Story = {
  args: {
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
      columns={personColumns.slice(0, 5)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      renderDetailPanel={({ row }) => (
        <span>
          {row.original.firstName} reports {row.subRows.length} direct report(s).
        </span>
      )}
      enablePagination={false}
      {...args}
    />
  ),
}

/** Only rows with an even index can expand. */
export const ConditionalExpanding: Story = {
  args: {
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
      columns={personColumns.slice(0, 5)}
      data={makePeople(10)}
      getRowId={(row) => row.id}
      getRowCanExpand={(row) => row.index % 2 === 0}
      renderDetailPanel={({ row }) => <span>Details for {row.original.firstName}</span>}
      enablePagination={false}
      {...args}
    />
  ),
}

/** `paginateExpandedRows={false}` keeps children with their parent's page. */
export const ExpandingWithPagination: Story = {
  args: {
    enableExpanding: true,
    paginateExpandedRows: false,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      initialState={{ pagination: { pageIndex: 0, pageSize: 2 }, expanded: true }}
      {...args}
    />
  ),
}
