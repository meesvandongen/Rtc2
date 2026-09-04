import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { loadingArgTypes } from './controls'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(20)

const meta: Meta = {
  title: 'DataTable/09 Rows',
  argTypes: { ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** `static` numbers by display position; `original` keeps the source index. */
export const RowNumbers: Story = {
  render: () => (
    <>
      {(['static', 'original'] as const).map((mode) => (
        <div key={mode} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 4)}
            data={data.slice(0, 6)}
            getRowId={(row) => row.id}
            enableRowNumbers
            rowNumberDisplayMode={mode}
            enableSorting
            enablePagination={false}
            enableToolbar={false}
            caption={`rowNumberDisplayMode="${mode}" — sort a column to see the difference`}
          />
        </div>
      ))}
    </>
  ),
}

/** Inline action buttons in the generated actions column. */
export const RowActions: Story = {
  args: {
    enableRowActions: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowActions: { control: 'boolean', table: { category: 'Rows' } },
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      renderRowActions={({ row }) => (
        <button
          type="button"
          className="rtc-button"
          style={{ height: 24, padding: '0 8px' }}
          onClick={() => alert(`Viewing ${row.original.firstName}`)}
        >
          View
        </button>
      )}
      {...args}
    />
  ),
}

/** An overflow menu instead of inline buttons. */
export const RowActionMenu: Story = {
  args: {
    enableRowActions: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowActions: { control: 'boolean', table: { category: 'Rows' } },
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      rowActionMenuItems={({ row }) => [
        { id: 'edit', label: 'Edit', onSelect: () => alert(`Edit ${row.original.firstName}`) },
        {
          id: 'duplicate',
          label: 'Duplicate',
          onSelect: () => alert(`Duplicate ${row.original.firstName}`),
        },
        { type: 'separator', id: 'sep' },
        {
          id: 'delete',
          label: 'Delete',
          danger: true,
          onSelect: () => alert(`Delete ${row.original.firstName}`),
        },
      ]}
      {...args}
    />
  ),
}

export const ActionsColumnFirst: Story = {
  args: {
    enableRowActions: true,
    positionActionsColumn: 'first',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowActions: { control: 'boolean', table: { category: 'Rows' } },
    positionActionsColumn: {
      control: 'select',
      options: ['first', 'last'],
      table: { category: 'Rows' },
    },
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      renderRowActions={({ row }) => <span className="rtc-group-count">#{row.index + 1}</span>}
      enablePagination={false}
      {...args}
    />
  ),
}

/** Pinned rows stay visible while the rest of the body scrolls. */
export const RowPinningSticky: Story = {
  args: {
    enableRowPinning: true,
    rowPinningDisplayMode: 'sticky',
    enableRowActions: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowPinning: { control: 'boolean', table: { category: 'Rows' } },
    rowPinningDisplayMode: {
      control: 'select',
      options: ['sticky', 'top', 'bottom', 'top-and-bottom'],
      table: { category: 'Rows' },
    },
    enableRowActions: { control: 'boolean', table: { category: 'Rows' } },
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Pinned rows keep their place in the order and stick to the edge of the scroll container
        once they would have scrolled away — below the sticky header, and stacked behind one
        another when several are pinned to the same edge. `enableRowPinning` puts pin/unpin in
        each row&apos;s overflow menu; <code>row.pin(&apos;top&apos;)</code> is still there if you
        would rather drive it from your own control.
      </p>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={makePeople(40)}
        getRowId={(row) => row.id}
        enablePagination={false}
        enableGlobalFilter
        height={420}
        enableStickyHeader
        initialState={{ rowPinning: { top: ['p2', 'p5'], bottom: ['p9'] } }}
        {...args}
      />
    </>
  ),
}

/** Pinned rows lifted into dedicated sections above and below the body. */
export const RowPinningSections: Story = {
  args: {
    enableRowPinning: true,
    rowPinningDisplayMode: 'top-and-bottom',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowPinning: { control: 'boolean', table: { category: 'Rows' } },
    rowPinningDisplayMode: {
      control: 'select',
      options: ['sticky', 'top', 'bottom', 'top-and-bottom'],
      table: { category: 'Rows' },
    },
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Each section is sticky as a block: the top one below the header, the bottom one at the
        foot of the scroll container. Rows a filter or a page has dropped stay pinned —
        <code>keepPinnedRows</code> is what makes pinning worth doing while you search for
        something else.
      </p>
      <DataTable
        columns={personColumns
          .slice(0, 5)
          .map((column, index) => (index === 4 ? { ...column, footer: 'City' } : column))}
        data={makePeople(20)}
        getRowId={(row) => row.id}
        enablePagination={false}
        enableGlobalFilter
        enableStickyHeader
        enableStickyFooter
        height={420}
        initialState={{ rowPinning: { top: ['p1', 'p4'], bottom: ['p19', 'p20'] } }}
        {...args}
      />
    </>
  ),
}

/**
 * Row pinning over a virtualized body. A virtualized row is positioned
 * absolutely and cannot also be sticky, so `sticky` renders the top and bottom
 * sections here — they sit outside the virtualized body and stay put.
 */
export const RowPinningVirtualized: Story = {
  args: {
    enableRowPinning: true,
    rowPinningDisplayMode: 'sticky',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowPinning: { control: 'boolean', table: { category: 'Rows' } },
    rowPinningDisplayMode: {
      control: 'select',
      options: ['sticky', 'top', 'bottom', 'top-and-bottom'],
      table: { category: 'Rows' },
    },
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makePeople(2000)}
      getRowId={(row) => row.id}
      enablePagination={false}
      enableRowVirtualization
      enableStickyHeader
      height={420}
      initialState={{ rowPinning: { top: ['p3'], bottom: ['p1500'] } }}
      {...args}
    />
  ),
}

/** Drag the grip to reorder rows; the handle also responds to up/down arrows. */
export const RowOrdering: Story = {
  args: {
    enableRowOrdering: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableRowOrdering: { control: 'boolean', table: { category: 'Rows' } },
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Drag a row by its grip, or focus the grip and press the up/down arrow keys.
      </p>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={data.slice(0, 10)}
        getRowId={(row) => row.id}
        enablePagination={false}
        enableStripes
        {...args}
      />
    </>
  ),
}

/** `rowProps` and `cellProps` reach the underlying DOM nodes. */
export const CustomRowAndCellProps: Story = {
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
      data={data.slice(0, 10)}
      getRowId={(row) => row.id}
      rowProps={({ row }) => ({
        style: row.original.active ? undefined : { opacity: 0.5, fontStyle: 'italic' },
        title: `${row.original.firstName} ${row.original.lastName}`,
      })}
      cellProps={({ cell }) =>
        cell.column.id === 'age' && Number(cell.getValue()) > 55
          ? { style: { color: 'var(--rtc-color-danger)', fontWeight: 600 } }
          : {}
      }
      enablePagination={false}
      {...args}
    />
  ),
}
