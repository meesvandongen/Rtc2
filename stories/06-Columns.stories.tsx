import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type ColumnPinningState } from '../src'
import { groupedHeaderColumns, makePeople, makeWideColumns, personColumns } from './fixtures'

const data = makePeople(25)

const meta: Meta = {
  title: 'DataTable/06 Columns',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/** Per-column menu with sorting, grouping, pinning, sizing and hiding. */
export const ColumnActionsMenu: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableColumnActions
      enableColumnPinning
      enableColumnResizing
      enableGrouping
    />
  ),
}

/** Toggle columns from the toolbar, or hide one from its own menu. */
export const ColumnVisibility: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableColumnVisibility
      enableColumnActions
      initialState={{ columnVisibility: { startDate: false, active: false } }}
    />
  ),
}

/** Drag a header by its grip to reorder. Column order is also controllable. */
export const ColumnOrdering: Story = {
  render: () => (
    <>
      <p className="sb-note">Drag the grip in any header to move that column.</p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data}
        getRowId={(row) => row.id}
        enableColumnOrdering
        enableColumnDragging
        layoutMode="grid"
      />
    </>
  ),
}

/** Pinned columns stick to the start/end edge with a shadow at the boundary. */
export const ColumnPinning: Story = {
  render: function ColumnPinningStory() {
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
      start: ['firstName'],
      end: ['metric-12'],
    })
    return (
      <>
        <p className="sb-note">Scroll horizontally — the pinned columns stay put.</p>
        <DataTable
          columns={makeWideColumns(12)}
          data={data.slice(0, 10)}
          getRowId={(row) => row.id}
          enableColumnPinning
          enableColumnActions
          layoutMode="grid-no-grow"
          enablePagination={false}
          height={420}
          enableStickyHeader
          state={{ columnPinning }}
          onColumnPinningChange={(updater) =>
            setColumnPinning((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
        />
        <pre className="sb-panel">{JSON.stringify(columnPinning)}</pre>
      </>
    )
  },
}

/** Drag the right edge of a header, or focus it and use the arrow keys. */
export const ColumnResizing: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Drag a column edge to resize, double-click it to reset. The grip is keyboard-operable with
        the left/right arrows.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data.slice(0, 8)}
        getRowId={(row) => row.id}
        enableColumnResizing
        columnResizeMode="onChange"
        layoutMode="grid"
        enablePagination={false}
      />
    </>
  ),
}

/** `onEnd` defers the layout change until the pointer is released. */
export const ColumnResizingOnEnd: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enableColumnResizing
      columnResizeMode="onEnd"
      layoutMode="grid"
      enablePagination={false}
    />
  ),
}

/** Nested header groups, spanning their child columns. */
export const HeaderGroups: Story = {
  render: () => (
    <DataTable
      columns={groupedHeaderColumns}
      data={data}
      getRowId={(row) => row.id}
      enableColumnActions
      enableBorders="all"
    />
  ),
}

/** Column footers render whenever any column defines `footer`. */
export const ColumnFooters: Story = {
  render: () => {
    const rows = data.slice(0, 8)
    const totalSalary = rows.reduce((sum, person) => sum + person.salary, 0)
    return (
      <DataTable
        columns={personColumns.slice(0, 7).map((column) => {
          const key = (column as { accessorKey?: string }).accessorKey
          if (key === 'salary') {
            return { ...column, footer: () => `Total: ${totalSalary.toLocaleString('en-US')}` }
          }
          if (key === 'firstName') return { ...column, footer: 'Summary' }
          return column
        })}
        data={rows}
        getRowId={(row) => row.id}
        enablePagination={false}
      />
    )
  },
}

/** Per-column alignment and a shared `defaultColumn`. */
export const AlignmentAndDefaults: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data.slice(0, 6)}
      getRowId={(row) => row.id}
      defaultColumn={{ minSize: 80, maxSize: 400 }}
      enablePagination={false}
      enableBorders="all"
    />
  ),
}
