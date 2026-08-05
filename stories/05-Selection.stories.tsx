import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type RowSelectionState } from '../src'
import { loadingArgTypes } from './controls'
import { makePeople, makeTree, personColumns } from './fixtures'

const data = makePeople(20)

/** Selection-related props shared across most stories in this file. */
const selectionArgTypes = {
  enableRowSelection: {
    control: 'boolean',
    description:
      'Enables row selection. Also accepts a predicate to restrict which rows are selectable (see Conditional Selection, which keeps its predicate fixed).',
    table: { category: 'Selection' },
  },
  enableMultiRowSelection: {
    control: 'boolean',
    description: 'Allow more than one row selected at once. Forced off by `selectDisplayMode="radio"`.',
    table: { category: 'Selection' },
  },
  enableSubRowSelection: {
    control: 'boolean',
    description: 'Selecting a parent row cascades the selection to its sub-rows.',
    table: { category: 'Selection' },
  },
  enableSelectAll: { control: 'boolean', table: { category: 'Selection' } },
  selectDisplayMode: {
    control: 'select',
    options: ['checkbox', 'radio', 'switch'],
    table: { category: 'Selection' },
  },
  enableClickToSelect: {
    control: 'boolean',
    description: 'Clicking anywhere in a row toggles its selection, in addition to the control itself.',
    table: { category: 'Selection' },
  },
  enableCellSelection: { control: 'boolean', table: { category: 'Selection' } },
  enableCellRangeSelection: { control: 'boolean', table: { category: 'Selection' } },
  enableMultiCellRangeSelection: { control: 'boolean', table: { category: 'Selection' } },
  enableKeyboardNavigation: { control: 'boolean', table: { category: 'Selection' } },
} as const

const meta: Meta = {
  title: 'DataTable/05 Selection',
  argTypes: { ...loadingArgTypes, ...selectionArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

export const Checkboxes: Story = {
  args: {
    enableRowSelection: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns.slice(0, 6)} data={data} getRowId={(row) => row.id} {...args} />
  ),
}

/** Single selection rendered as radio buttons; the select-all header is dropped. */
export const SingleSelectRadio: Story = {
  args: {
    enableRowSelection: true,
    enableMultiRowSelection: false,
    selectDisplayMode: 'radio',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns.slice(0, 6)} data={data} getRowId={(row) => row.id} {...args} />
  ),
}

export const SwitchSelection: Story = {
  args: {
    enableRowSelection: true,
    selectDisplayMode: 'switch',
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
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enablePagination={false}
      {...args}
    />
  ),
}

/** Clicking anywhere in a row toggles it, in addition to the checkbox. */
export const ClickToSelect: Story = {
  args: {
    enableRowSelection: true,
    enableClickToSelect: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns.slice(0, 6)} data={data} getRowId={(row) => row.id} {...args} />
  ),
}

/** Only active employees can be selected. */
export const ConditionalSelection: Story = {
  args: {
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
        <code>enableRowSelection</code> accepts a predicate — inactive rows are not selectable
        here.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6).concat(personColumns.slice(-1))}
        // Sorted so the first page always contains both states.
        data={[...data].sort((a, b) => Number(a.active) - Number(b.active))}
        getRowId={(row) => row.id}
        enableRowSelection={(row) => row.original.active}
        {...args}
      />
    </>
  ),
}

/** Selecting a parent cascades to its sub-rows. */
export const SubRowSelection: Story = {
  args: {
    enableExpanding: true,
    enableRowSelection: true,
    enableSubRowSelection: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    enableExpanding: { control: 'boolean', table: { category: 'Selection' } },
  },
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      enablePagination={false}
      initialState={{ expanded: true }}
      {...args}
    />
  ),
}

export const ControlledSelection: Story = {
  args: {
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: function ControlledSelection(args) {
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({ p1: true, p3: true })
    return (
      <>
        <div className="rtc-sb-row">
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
          {...args}
        />
        <pre className="rtc-sb-panel" data-testid="selection-state">
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
  args: {
    enableCellSelection: true,
    enableCellRangeSelection: true,
    enableMultiCellRangeSelection: true,
    enableKeyboardNavigation: true,
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
        Click and drag across cells to select a range. Hold Ctrl/Cmd while dragging to add another
        range.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data.slice(0, 10)}
        getRowId={(row) => row.id}
        enablePagination={false}
        enableBorders="all"
        {...args}
      />
    </>
  ),
}
