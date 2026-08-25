import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type ColumnPinningState } from '../src'
import { loadingArgTypes } from './controls'
import { groupedHeaderColumns, makePeople, makeWideColumns, personColumns } from './fixtures'

const data = makePeople(25)

/**
 * Two identifier columns opted into click-to-copy; the rest stay plain text.
 *
 * Matched on `accessorKey`, not `id`: the helper leaves `id` undefined for an
 * accessor column and TanStack derives it from the key at runtime.
 */
const COPYABLE_KEYS = new Set(['email', 'city'])
const copyableColumns = personColumns.map((column) => {
  const key = (column as { accessorKey?: string }).accessorKey
  return key && COPYABLE_KEYS.has(key)
    ? { ...column, meta: { ...column.meta, enableClickToCopy: true } }
    : column
})

/** Column-management props shared across most stories in this file. */
const columnsArgTypes = {
  enableColumnVisibility: { control: 'boolean', table: { category: 'Columns' } },
  enableColumnOrdering: { control: 'boolean', table: { category: 'Columns' } },
  enableColumnDragging: { control: 'boolean', table: { category: 'Columns' } },
  enableColumnPinning: { control: 'boolean', table: { category: 'Columns' } },
  enableColumnResizing: { control: 'boolean', table: { category: 'Columns' } },
  columnResizeMode: {
    control: 'select',
    options: ['onChange', 'onEnd'],
    description: '`onChange` resizes live while dragging; `onEnd` defers the layout change until the pointer is released.',
    table: { category: 'Columns' },
  },
  enableColumnActions: { control: 'boolean', table: { category: 'Columns' } },
} as const

const meta: Meta = {
  title: 'DataTable/06 Columns',
  argTypes: { ...loadingArgTypes, ...columnsArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** Per-column menu with sorting, grouping, pinning, sizing and hiding. */
export const ColumnActionsMenu: Story = {
  args: {
    enableColumnActions: true,
    enableColumnPinning: true,
    enableColumnResizing: true,
    enableGrouping: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableGrouping: {
      control: 'boolean',
      description: 'Adds "Group by" to the column actions menu.',
      table: { category: 'Behaviour' },
    },
  },
  render: (args) => (
    <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} {...args} />
  ),
}

/** Toggle columns from the toolbar, or hide one from its own menu. */
export const ColumnVisibility: Story = {
  args: {
    enableColumnVisibility: true,
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
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ columnVisibility: { startDate: false, active: false } }}
      {...args}
    />
  ),
}

/** Drag a header by its grip to reorder. Column order is also controllable. */
export const ColumnOrdering: Story = {
  args: {
    enableColumnOrdering: true,
    enableColumnDragging: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">Drag the grip in any header to move that column.</p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data}
        getRowId={(row) => row.id}
        layoutMode="grid"
        {...args}
      />
    </>
  ),
}

/** Pinned columns stick to the start/end edge with a shadow at the boundary. */
export const ColumnPinning: Story = {
  args: {
    enableColumnPinning: true,
    enableColumnActions: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: function ColumnPinningStory(args) {
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
      start: ['firstName'],
      end: ['metric-12'],
    })
    return (
      <>
        <p className="rtc-sb-note">Scroll horizontally — the pinned columns stay put.</p>
        <DataTable
          columns={makeWideColumns(12)}
          data={data.slice(0, 10)}
          getRowId={(row) => row.id}
          layoutMode="grid-no-grow"
          enablePagination={false}
          height={420}
          enableStickyHeader
          state={{ columnPinning }}
          onColumnPinningChange={(updater) =>
            setColumnPinning((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
          {...args}
        />
        <pre className="rtc-sb-panel">{JSON.stringify(columnPinning)}</pre>
      </>
    )
  },
}

/** Drag the right edge of a header, or focus it and use the arrow keys. */
export const ColumnResizing: Story = {
  args: {
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
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
        Drag a column edge to resize, double-click it to reset. The grip is keyboard-operable with
        the left/right arrows.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data.slice(0, 8)}
        getRowId={(row) => row.id}
        layoutMode="grid"
        enablePagination={false}
        {...args}
      />
    </>
  ),
}

/** `onEnd` defers the layout change until the pointer is released. */
export const ColumnResizingOnEnd: Story = {
  args: {
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
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
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      layoutMode="grid"
      enablePagination={false}
      {...args}
    />
  ),
}

/** Nested header groups, spanning their child columns. */
export const HeaderGroups: Story = {
  args: {
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
      columns={groupedHeaderColumns}
      data={data}
      getRowId={(row) => row.id}
      enableBorders="all"
      {...args}
    />
  ),
}

/** Column footers render whenever any column defines `footer`. */
export const ColumnFooters: Story = {
  args: {
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => {
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
        {...args}
      />
    )
  },
}

/** Per-column alignment and a shared `defaultColumn`. */
export const AlignmentAndDefaults: Story = {
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
      columns={personColumns}
      data={data.slice(0, 6)}
      getRowId={(row) => row.id}
      defaultColumn={{ minSize: 80, maxSize: 400 }}
      enablePagination={false}
      enableBorders="all"
      {...args}
    />
  ),
}

/**
 * `meta.enableClickToCopy` turns a column's cells into copy buttons.
 *
 * Per column rather than per table by default: it is right for an id or an
 * email and wrong for a paragraph. The value keeps its own text as the
 * button's accessible name — "Click to copy" is the tooltip, and the
 * confirmation is announced through a live region — so a screen reader still
 * hears the cell rather than the affordance.
 *
 * It composes with the rest of the cell behaviours: copying stops the click
 * from reaching the row, so `enableClickToSelect` stays quiet, while cell
 * selection (pointer-down) and `editMode: 'cell'` (double-click) are
 * untouched. Grouped, aggregated and placeholder cells never get the
 * affordance — there is no single value under them.
 */
export const ClickToCopy: Story = {
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
      columns={copyableColumns}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enablePagination={false}
      {...args}
    />
  ),
}
