import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { makePeople, personColumns, type Person } from './fixtures'

const meta: Meta = {
  title: 'DataTable/10 Editing',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

const editableColumns = personColumns.slice(0, 7)

/** Double-click a cell to edit it. Enter or blur commits, Escape reverts. */
export const CellEditing: Story = {
  render: function CellEditing() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <>
        <p className="sb-note">Double-click any cell to edit it.</p>
        <DataTable
          columns={editableColumns}
          data={rows}
          getRowId={(row) => row.id}
          enableEditing
          editMode="cell"
          onDataChange={setRows}
          enablePagination={false}
        />
      </>
    )
  },
}

/** The whole row becomes editable, with explicit save and cancel actions. */
export const RowEditing: Story = {
  render: function RowEditing() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <DataTable
        columns={editableColumns}
        data={rows}
        getRowId={(row) => row.id}
        enableEditing
        editMode="row"
        onEditingRowSave={({ values, exitEditingMode }) => {
          setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
          exitEditingMode()
        }}
        enablePagination={false}
      />
    )
  },
}

/** Every cell is an input at once — useful for bulk data entry. */
export const TableEditing: Story = {
  render: function TableEditing() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(6))
    return (
      <>
        <DataTable
          columns={editableColumns}
          data={rows}
          getRowId={(row) => row.id}
          enableEditing
          editMode="table"
          onDataChange={setRows}
          enablePagination={false}
          density="compact"
        />
        <pre className="sb-panel">{JSON.stringify(rows.slice(0, 2), null, 2)}</pre>
      </>
    )
  },
}

/** Editing in a modal dialog, with focus trapped inside it. */
export const ModalEditing: Story = {
  render: function ModalEditing() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <>
        <p className="sb-note">Use the pencil action to open the edit dialog.</p>
        <DataTable
          columns={editableColumns}
          data={rows}
          getRowId={(row) => row.id}
          enableEditing
          editMode="modal"
          onEditingRowSave={({ values, exitEditingMode }) => {
            setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
            exitEditingMode()
          }}
          enablePagination={false}
        />
      </>
    )
  },
}

/** Only active employees are editable. */
export const ConditionalEditing: Story = {
  render: function ConditionalEditing() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(10))
    return (
      <>
        <p className="sb-note">Inactive rows show no edit action.</p>
        <DataTable
          columns={editableColumns.concat(personColumns.slice(-1))}
          data={rows}
          getRowId={(row) => row.id}
          enableEditing={(row) => row.original.active}
          editMode="row"
          onEditingRowSave={({ values, exitEditingMode }) => {
            setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
            exitEditingMode()
          }}
          enablePagination={false}
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
  render: function EditorVariants() {
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
        enableEditing
        editMode="table"
        onDataChange={setRows}
        enablePagination={false}
      />
    )
  },
}

/** A save handler that takes time; `isSaving` shows the progress bar. */
export const AsyncSave: Story = {
  render: function AsyncSave() {
    const [rows, setRows] = useState<Person[]>(() => makePeople(8))
    const [isSaving, setIsSaving] = useState(false)
    return (
      <DataTable
        columns={editableColumns}
        data={rows}
        getRowId={(row) => row.id}
        enableEditing
        editMode="row"
        isSaving={isSaving}
        onEditingRowSave={async ({ values, exitEditingMode }) => {
          setIsSaving(true)
          await new Promise((resolve) => setTimeout(resolve, 700))
          setRows((old) => old.map((row) => (row.id === values.id ? values : row)))
          setIsSaving(false)
          exitEditingMode()
        }}
        enablePagination={false}
      />
    )
  },
}
