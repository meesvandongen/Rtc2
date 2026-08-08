import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { loadingArgTypes } from './controls'
import { makePeople, personColumns, type Person } from './fixtures'

const meta: Meta = {
  title: 'DataTable/10 Editing',
  argTypes: { ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

const editableColumns = personColumns.slice(0, 7)

/** `editMode` control shared by the stories that expose a fixed editing mode. */
const editModeArgType = {
  control: 'select',
  options: ['cell', 'row', 'table', 'modal'],
  table: { category: 'Editing' },
} as const

const enableEditingArgType = { control: 'boolean', table: { category: 'Editing' } } as const

/** Double-click a cell to edit it. Enter or blur commits, Escape reverts. */
export const CellEditing: Story = {
  args: {
    editMode: 'cell',
    enableEditing: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType, enableEditing: enableEditingArgType },
  render: function CellEditing(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <>
        <p className="rtc-sb-note">Double-click any cell to edit it.</p>
        <DataTable
          columns={editableColumns}
          data={rows}
          getRowId={(row) => row.id}
          onDataChange={setRows}
          enablePagination={false}
          {...args}
        />
      </>
    )
  },
}

/** The whole row becomes editable, with explicit save and cancel actions. */
export const RowEditing: Story = {
  args: {
    editMode: 'row',
    enableEditing: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType, enableEditing: enableEditingArgType },
  render: function RowEditing(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <DataTable
        columns={editableColumns}
        data={rows}
        getRowId={(row) => row.id}
        onEditingRowSave={({ values, exitEditingMode }) => {
          setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
          exitEditingMode()
        }}
        enablePagination={false}
        {...args}
      />
    )
  },
}

/** Every cell is an input at once — useful for bulk data entry. */
export const TableEditing: Story = {
  args: {
    editMode: 'table',
    enableEditing: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType, enableEditing: enableEditingArgType },
  render: function TableEditing(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(6))
    return (
      <>
        <DataTable
          columns={editableColumns}
          data={rows}
          getRowId={(row) => row.id}
          onDataChange={setRows}
          enablePagination={false}
          density="compact"
          {...args}
        />
        <pre className="rtc-sb-panel">{JSON.stringify(rows.slice(0, 2), null, 2)}</pre>
      </>
    )
  },
}

/** Editing in a modal dialog, with focus trapped inside it. */
export const ModalEditing: Story = {
  args: {
    editMode: 'modal',
    enableEditing: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType, enableEditing: enableEditingArgType },
  render: function ModalEditing(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <>
        <p className="rtc-sb-note">Use the pencil action to open the edit dialog.</p>
        <DataTable
          columns={editableColumns}
          data={rows}
          getRowId={(row) => row.id}
          onEditingRowSave={({ values, exitEditingMode }) => {
            setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
            exitEditingMode()
          }}
          enablePagination={false}
          {...args}
        />
      </>
    )
  },
}

/** Only active employees are editable. */
export const ConditionalEditing: Story = {
  args: {
    editMode: 'row',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType },
  render: function ConditionalEditing(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <>
        <p className="rtc-sb-note">Inactive rows show no edit action.</p>
        <DataTable
          columns={editableColumns.concat(personColumns.slice(-1))}
          data={rows}
          getRowId={(row) => row.id}
          enableEditing={(row) => row.original.active}
          onEditingRowSave={({ values, exitEditingMode }) => {
            setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
            exitEditingMode()
          }}
          enablePagination={false}
          {...args}
        />
      </>
    )
  },
}

/**
 * Editor widgets are chosen per column with `meta.editVariant` — here a select
 * for department and a checkbox for the boolean column.
 */
export const EditorVariants: Story = {
  args: {
    editMode: 'table',
    enableEditing: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType, enableEditing: enableEditingArgType },
  render: function EditorVariants(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(8))
    return (
      <DataTable
        columns={personColumns.map((column) => {
          const key = (column as { accessorKey?: string }).accessorKey
          if (key === 'department') {
            return {
              ...column,
              meta: {
                ...(column as any).meta,
                editVariant: 'select' as const,
                editSelectOptions: ['Engineering', 'Design', 'Sales', 'Support', 'Finance'],
              },
            }
          }
          return column
        })}
        data={rows}
        getRowId={(row) => row.id}
        onDataChange={setRows}
        enablePagination={false}
        {...args}
      />
    )
  },
}

/** A save handler that takes time; `isSaving` shows the progress bar. */
export const AsyncSave: Story = {
  args: {
    editMode: 'row',
    enableEditing: true,
    isLoading: false,
    showProgressBars: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: { editMode: editModeArgType, enableEditing: enableEditingArgType },
  render: function AsyncSave(args) {
    const [rows, setRows] = useState<Person[]>(() => makePeople(8))
    const [isSaving, setIsSaving] = useState(false)
    return (
      <DataTable
        columns={editableColumns}
        data={rows}
        getRowId={(row) => row.id}
        onEditingRowSave={async ({ values, exitEditingMode }) => {
          setIsSaving(true)
          await new Promise((resolve) => setTimeout(resolve, 700))
          setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
          setIsSaving(false)
          exitEditingMode()
        }}
        enablePagination={false}
        {...args}
        isSaving={isSaving}
      />
    )
  },
}
