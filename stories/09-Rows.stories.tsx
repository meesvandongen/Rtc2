import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(20)

const meta: Meta = {
  title: 'DataTable/09 Rows',
  parameters: { layout: 'fullscreen' },
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
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      enableRowActions
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
    />
  ),
}

/** An overflow menu instead of inline buttons. */
export const RowActionMenu: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      enableRowActions
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
    />
  ),
}

export const ActionsColumnFirst: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enableRowActions
      positionActionsColumn="first"
      renderRowActions={({ row }) => <span className="rtc-group-count">#{row.index + 1}</span>}
      enablePagination={false}
    />
  ),
}

/** Pinned rows stay visible while the rest of the body scrolls. */
export const RowPinningSticky: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Pinned rows are sticky within the scroll container. Pin from your own UI by calling
        <code> row.pin(&apos;top&apos;)</code>.
      </p>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={makePeople(40)}
        getRowId={(row) => row.id}
        enableRowPinning
        rowPinningDisplayMode="sticky"
        enableRowActions
        renderRowActions={({ row }) => (
          <button
            type="button"
            className="rtc-button"
            style={{ height: 24, padding: '0 8px' }}
            onClick={() => row.pin(row.getIsPinned() ? false : 'top')}
          >
            {row.getIsPinned() ? 'Unpin' : 'Pin'}
          </button>
        )}
        enablePagination={false}
        height={420}
        enableStickyHeader
        initialState={{ rowPinning: { top: ['p2'], bottom: [] } }}
      />
    </>
  ),
}

/** Pinned rows lifted into dedicated sections above and below the body. */
export const RowPinningSections: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makePeople(20)}
      getRowId={(row) => row.id}
      enableRowPinning
      rowPinningDisplayMode="top-and-bottom"
      enablePagination={false}
      height={420}
      initialState={{ rowPinning: { top: ['p1'], bottom: ['p20'] } }}
    />
  ),
}

/** Drag the grip to reorder rows; the handle also responds to up/down arrows. */
export const RowOrdering: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Drag a row by its grip, or focus the grip and press the up/down arrow keys.
      </p>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={data.slice(0, 10)}
        getRowId={(row) => row.id}
        enableRowOrdering
        enablePagination={false}
        enableStripes
      />
    </>
  ),
}

/** `rowProps` and `cellProps` reach the underlying DOM nodes. */
export const CustomRowAndCellProps: Story = {
  render: () => (
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
    />
  ),
}
