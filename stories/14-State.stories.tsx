import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, toCsv, useDataTable, type DataTableInitialState } from '../src'
import { makePeople, personColumns, type Person } from './fixtures'

const data = makePeople(40)

const meta: Meta = {
  title: 'DataTable/14 State & Composition',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Build the instance yourself with `useDataTable` when the page around the
 * table needs to read or drive its state, then hand it to `<DataTable table />`.
 */
export const ExternalInstance: Story = {
  render: function ExternalInstance() {
    const table = useDataTable<Person>({
      columns: personColumns.slice(0, 6),
      data,
      getRowId: (row) => row.id,
      enableRowSelection: true,
      enableColumnActions: true,
    })

    const selectedCount = Object.values(table.state.rowSelection).filter(Boolean).length

    return (
      <>
        <div className="rtc-sb-row">
          <button type="button" className="rtc-button" onClick={() => table.resetSorting()}>
            Reset sorting
          </button>
          <button type="button" className="rtc-button" onClick={() => table.resetRowSelection()}>
            Reset selection
          </button>
          <button type="button" className="rtc-button" onClick={() => table.setPageIndex(3)}>
            Go to page 4
          </button>
          <span className="rtc-group-count" data-testid="external-count">
            {selectedCount} selected
          </span>
        </div>
        <DataTable table={table} />
      </>
    )
  },
}

/** `onStateChange` reports every slice, including the UI-only ones. */
export const ObserveAllState: Story = {
  render: function ObserveAllState() {
    const [snapshot, setSnapshot] = useState<string>('')
    return (
      <>
        <DataTable
          columns={personColumns.slice(0, 6)}
          data={data}
          getRowId={(row) => row.id}
          enableRowSelection
          enableColumnActions
          onStateChange={(state) =>
            setSnapshot(
              JSON.stringify(
                {
                  sorting: state.sorting,
                  pagination: state.pagination,
                  density: state.density,
                  showFilterPanel: state.showFilterPanel,
                  rowSelection: Object.keys(state.rowSelection).length,
                },
                null,
                2,
              ),
            )
          }
        />
        <pre className="rtc-sb-panel" data-testid="state-snapshot">
          {snapshot}
        </pre>
      </>
    )
  },
}

/** Restore a saved layout through `initialState`. */
export const RestoredInitialState: Story = {
  render: () => {
    const saved: DataTableInitialState = {
      sorting: [{ id: 'salary', desc: true }],
      columnVisibility: { email: false, startDate: false },
      columnPinning: { start: ['firstName'], end: [] },
      pagination: { pageIndex: 1, pageSize: 5 },
      density: 'compact',
      showFilterPanel: true,
    }
    return (
      <>
        <p className="rtc-sb-note">
          Sorting, hidden columns, pinning, page, density and filter visibility all come from a
          single saved <code>initialState</code> object.
        </p>
        <DataTable
          columns={personColumns}
          data={data}
          getRowId={(row) => row.id}
          initialState={saved}
          enableColumnPinning
          enableColumnActions
          filterDisplayMode="popover-and-panel"
        />
      </>
    )
  },
}

/** Export what is currently on screen, respecting filters and sorting. */
export const CsvExport: Story = {
  render: function CsvExport() {
    const [preview, setPreview] = useState('')
    const table = useDataTable<Person>({
      columns: personColumns.slice(0, 6),
      data,
      getRowId: (row) => row.id,
      enableRowSelection: true,
      initialState: { showGlobalFilter: true },
    })

    const exportCsv = (onlySelected: boolean) => {
      const columns = table.getVisibleLeafColumns().filter((column) => !column.id.startsWith('rtc-'))
      const rows = onlySelected ? table.getSelectedRowModel().rows : table.getFilteredRowModel().rows
      const csv = toCsv(
        columns.map((column) => String(column.columnDef.header ?? column.id)),
        rows.map((row) => columns.map((column) => String(row.getValue(column.id) ?? ''))),
      )
      setPreview(csv.split('\r\n').slice(0, 6).join('\n'))
    }

    return (
      <>
        <div className="rtc-sb-row">
          <button type="button" className="rtc-button" onClick={() => exportCsv(false)}>
            Export filtered rows
          </button>
          <button type="button" className="rtc-button" onClick={() => exportCsv(true)}>
            Export selected rows
          </button>
        </div>
        <DataTable table={table} />
        <pre className="rtc-sb-panel">{preview || 'Click a button to preview the CSV.'}</pre>
      </>
    )
  },
}

/** Full screen takes over the viewport; Escape or the button exits. */
export const FullScreen: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Use the full-screen button in the toolbar. Press Escape to return.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        enableFullScreenToggle
        enableStickyHeader
      />
    </>
  ),
}

/** Everything on at once — the realistic upper bound of the component. */
export const KitchenSink: Story = {
  render: function KitchenSink() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(200))
    return (
      <DataTable
        columns={personColumns}
        data={rows}
        getRowId={(row) => row.id}
        enableSorting
        enableMultiSort
        enableColumnFilters
        enableFilterModes
        enableGlobalFilter
        enableFaceting
        enableRowSelection
        enableSelectAll
        enableColumnVisibility
        enableColumnOrdering
        enableColumnDragging
        enableColumnPinning
        enableColumnResizing
        enableColumnActions
        enableGrouping
        enableGroupingChips
        enableAggregation
        enableExpanding
        enableRowNumbers
        enableRowActions
        enableStickyHeader
        enableStripes
        enableDensityToggle
        enableFullScreenToggle
        enableKeyboardNavigation
        enableEditing
        editMode="modal"
        layoutMode="grid"
        height={600}
        onEditingRowSave={({ values, exitEditingMode }) => {
          setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
          exitEditingMode()
        }}
        renderDetailPanel={({ row }) => (
          <span>
            {row.original.firstName} {row.original.lastName} — {row.original.email}
          </span>
        )}
        filterDisplayMode="popover-and-panel"
        initialState={{ showFilterPanel: true, showGlobalFilter: true }}
      />
    )
  },
}
