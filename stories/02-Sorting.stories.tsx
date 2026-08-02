import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type SortingState } from '../src'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(30)

const meta: Meta = {
  title: 'DataTable/02 Sorting',
}

export default meta
type Story = StoryObj<typeof meta>

/** Click a header to cycle asc → desc → unsorted. */
export const Basic: Story = {
  render: () => (
    <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} enableSorting />
  ),
}

/** Shift-click a second header to add it; the badge shows sort precedence. */
export const MultiSort: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableMultiSort
      maxMultiSortColCount={3}
      initialState={{ sorting: [{ id: 'department', desc: false }, { id: 'age', desc: true }] }}
    />
  ),
}

/** `enableSortingRemoval={false}` keeps a column sorted once it has been sorted. */
export const NoSortRemoval: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      enableSortingRemoval={false}
      initialState={{ sorting: [{ id: 'lastName', desc: false }] }}
    />
  ),
}

export const DescendingFirst: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      sortDescFirst
    />
  ),
}

/**
 * Per-column sort functions. `startDate` sorts as a date rather than a string,
 * and `firstName` uses a case-sensitive comparison.
 */
export const CustomSortFunctions: Story = {
  render: () => (
    <DataTable
      columns={personColumns.map((column) => {
        const id = (column as { accessorKey?: string }).accessorKey
        if (id === 'startDate') return { ...column, sortFn: 'datetime' as const }
        if (id === 'firstName') return { ...column, sortFn: 'textCaseSensitive' as const }
        return column
      })}
      data={data}
      getRowId={(row) => row.id}
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
