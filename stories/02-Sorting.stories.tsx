import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type SortingState } from '../src'
import { loadingArgTypes } from './controls'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(30)

/** Sorting behaviour knobs shared across the stories in this file. */
const sortingArgTypes = {
  enableSorting: { control: 'boolean', table: { category: 'Sorting' } },
  enableMultiSort: {
    control: 'boolean',
    description: 'Allow shift-click to add a second (and further) sort column.',
    table: { category: 'Sorting' },
  },
  enableSortingRemoval: {
    control: 'boolean',
    description: 'Whether a third click on a sorted header clears it, instead of staying sorted.',
    table: { category: 'Sorting' },
  },
  sortDescFirst: {
    control: 'boolean',
    description: 'First click sorts descending instead of ascending.',
    table: { category: 'Sorting' },
  },
  maxMultiSortColCount: {
    control: { type: 'number', min: 1, max: 5, step: 1 },
    description: 'Maximum number of columns that can be sorted at once.',
    table: { category: 'Sorting' },
  },
} as const

const meta: Meta = {
  title: 'DataTable/02 Sorting',
  argTypes: { ...sortingArgTypes, ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** Click a header to cycle asc → desc → unsorted. */
export const Basic: Story = {
  args: {
    enableSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: true,
    sortDescFirst: false,
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

/** Shift-click a second header to add it; the badge shows sort precedence. */
export const MultiSort: Story = {
  args: {
    enableMultiSort: true,
    maxMultiSortColCount: 3,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ sorting: [{ id: 'department', desc: false }, { id: 'age', desc: true }] }}
      {...args}
    />
  ),
}

/** `enableSortingRemoval={false}` keeps a column sorted once it has been sorted. */
export const NoSortRemoval: Story = {
  args: {
    enableSortingRemoval: false,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ sorting: [{ id: 'lastName', desc: false }] }}
      {...args}
    />
  ),
}

export const DescendingFirst: Story = {
  args: {
    sortDescFirst: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns.slice(0, 6)} data={data} getRowId={(row) => row.id} {...args} />
  ),
}

/**
 * Per-column sort functions. `startDate` sorts as a date rather than a string,
 * and `firstName` uses a case-sensitive comparison.
 */
export const CustomSortFunctions: Story = {
  args: {
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns.map((column) => {
        const id = (column as { accessorKey?: string }).accessorKey
        if (id === 'startDate') return { ...column, sortFn: 'datetime' as const }
        if (id === 'firstName') return { ...column, sortFn: 'textCaseSensitive' as const }
        return column
      })}
      data={data}
      getRowId={(row) => row.id}
      {...args}
    />
  ),
}

/** Sorting held outside the table; the panel shows the controlled value. */
export const Controlled: Story = {
  render: function Controlled() {
    const [sorting, setSorting] = useState<SortingState>([{ id: 'age', desc: true }])
    return (
      <>
        <div className="rtc-sb-row">
          <button type="button" className="rtc-button" onClick={() => setSorting([])}>
            Clear sorting
          </button>
          <button
            type="button"
            className="rtc-button"
            onClick={() => setSorting([{ id: 'salary', desc: true }])}
          >
            Sort by salary desc
          </button>
        </div>
        <DataTable
          columns={personColumns}
          data={data}
          getRowId={(row) => row.id}
          state={{ sorting }}
          onSortingChange={(updater) =>
            setSorting((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
        />
        <pre className="rtc-sb-panel">{JSON.stringify(sorting)}</pre>
      </>
    )
  },
}

/**
 * With `manualSorting`, the table stops reordering rows and only reports the
 * requested sort — the server is expected to return them already ordered.
 */
export const ManualSorting: Story = {
  render: function ManualSorting() {
    const [sorting, setSorting] = useState<SortingState>([])
    const sorted = [...data].sort((a, b) => {
      const rule = sorting[0]
      if (!rule) return 0
      const left = String(a[rule.id as keyof typeof a])
      const right = String(b[rule.id as keyof typeof b])
      return (rule.desc ? -1 : 1) * left.localeCompare(right)
    })
    return (
      <>
        <p className="rtc-sb-note">
          Sorting is applied outside the table to simulate a server round-trip.
        </p>
        <DataTable
          columns={personColumns.slice(0, 6)}
          data={sorted}
          getRowId={(row) => row.id}
          manualSorting
          state={{ sorting }}
          onSortingChange={(updater) =>
            setSorting((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
        />
      </>
    )
  },
}
