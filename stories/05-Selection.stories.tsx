import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type RowSelectionState } from '../src'
import { makePeople, makeTree, personColumns } from './fixtures'

const data = makePeople(20)

const meta: Meta = {
  title: 'DataTable/05 Selection',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

export const Checkboxes: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      enableRowSelection
    />
  ),
}

/** Single selection rendered as radio buttons; the select-all header is dropped. */
export const SingleSelectRadio: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      enableRowSelection
      enableMultiRowSelection={false}
      selectDisplayMode="radio"
    />
  ),
}

export const SwitchSelection: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enableRowSelection
      selectDisplayMode="switch"
      enablePagination={false}
    />
  ),
}

/** Clicking anywhere in a row toggles it, in addition to the checkbox. */
export const ClickToSelect: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      enableRowSelection
      enableClickToSelect
    />
  ),
}

/** Only active employees can be selected. */
export const ConditionalSelection: Story = {
  render: () => (
    <>
      <p className="sb-note">
        <code>enableRowSelection</code> accepts a predicate — inactive rows are not selectable
        here.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6).concat(personColumns.slice(-1))}
        // Sorted so the first page always contains both states.
        data={[...data].sort((a, b) => Number(a.active) - Number(b.active))}
        getRowId={(row) => row.id}
        enableRowSelection={(row) => row.original.active}
      />
    </>
  ),
}

/** Selecting a parent cascades to its sub-rows. */
export const SubRowSelection: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enableExpanding
      enableRowSelection
      enableSubRowSelection
      enablePagination={false}
      initialState={{ expanded: true }}
    />
  ),
}

export const ControlledSelection: Story = {
  render: function ControlledSelection() {
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({ p1: true, p3: true })
    return (
      <>
        <div className="sb-row">
          <button type="button" className="rtc-button" onClick={() => setRowSelection({})}>
            Clear selection
          </button>
        </div>
        <DataTable
          columns={personColumns.slice(0, 5)}
          data={data}
          getRowId={(row) => row.id}
          enableRowSelection
          state={{ rowSelection }}
          onRowSelectionChange={(updater) =>
            setRowSelection((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
        />
        <pre className="sb-panel" data-testid="selection-state">
          {JSON.stringify(rowSelection)}
        </pre>
      </>
    )
  },
}

/**
 * Spreadsheet-style cell selection: click a cell, drag to extend, or hold the
 * range modifier to add a second range.
 */
export const CellSelection: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Click and drag across cells to select a range. Hold Ctrl/Cmd while dragging to add another
        range.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data.slice(0, 10)}
        getRowId={(row) => row.id}
        enableCellSelection
        enableCellRangeSelection
        enableMultiCellRangeSelection
        enableKeyboardNavigation
        enablePagination={false}
        enableBorders="all"
      />
    </>
  ),
}
