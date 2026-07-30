import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'

import {
  DataTable,
  defaultComponents,
  numberDataType,
  useComponents,
  type DataTableColumn,
  type DataTableComponents,
  type FilterOperandProps,
} from '../../src'
import { createAntComponents } from '../../stories/adapters/antd'
import { makePeople, personColumns, type Person } from '../../stories/fixtures'
import '../../src/styles.css'

/**
 * Harness for React error 185, "Maximum update depth exceeded".
 *
 * Knobs, all via the query string:
 *
 *   eager=on|off     write the filter on every pointer move (the old behaviour)
 *                    versus the shipped delayed commit. Default `on`.
 *   antd=on|off      Ant adapter versus the built-in primitives. Default `on`.
 *   pagination=on|off  Default `off`, which renders every row and reproduces
 *                      most readily.
 *   rows=N           Default 60.
 *
 * `debug/react-185/record.mjs` drives it. See the README beside this file.
 */
const params = new URLSearchParams(location.search)
const on = (key: string, fallback = true) => (params.get(key) ?? (fallback ? 'on' : 'off')) === 'on'
const data = makePeople(Number(params.get('rows') ?? 60))

/**
 * The pre-fix operand: writes straight through to the table filter on every
 * change. Kept here rather than by reverting `SliderOperand`, so the harness
 * exercises shipped code and the `eager` knob is a real A/B.
 */
function EagerSliderOperand({ value, onChange, bounds, label }: FilterOperandProps) {
  const ui = useComponents()
  const min = bounds?.[0] ?? 0
  const max = bounds?.[1] ?? 100
  const range = Array.isArray(value) ? (value as Array<number | undefined>) : []
  return (
    <ui.RangeSlider
      label={label}
      min={min}
      max={max}
      value={[range[0] ?? min, range[1] ?? max]}
      onChange={(next) => onChange(next)}
    />
  )
}

const salaryDataType = {
  ...numberDataType,
  id: 'harness-salary',
  defaultOperator: 'inRangeSlider',
  operators: numberDataType.operators.map((operator) =>
    operator.id === 'inRangeSlider' && on('eager')
      ? { ...operator, Operand: EagerSliderOperand }
      : operator,
  ),
}

const columns = personColumns.map((column) =>
  (column as { accessorKey?: string }).accessorKey === 'salary'
    ? ({
        ...column,
        meta: { ...(column as DataTableColumn<Person, any>).meta, dataType: salaryDataType },
      } as DataTableColumn<Person, any>)
    : column,
)

function App() {
  const components = useMemo<DataTableComponents>(
    () => (on('antd') ? createAntComponents(defaultComponents) : defaultComponents),
    [],
  )
  return (
    <DataTable
      components={components}
      columns={columns}
      data={data}
      getRowId={(row: Person) => row.id}
      enableRowSelection
      enableColumnActions
      enableColumnPinning
      enableFilterModes
      enableGrouping
      enableEditing
      editMode="modal"
      filterDisplayMode="popover-and-panel"
      height={560}
      enableStickyHeader
      enablePagination={on('pagination', false)}
      initialState={{ showGlobalFilter: true, showFilterPanel: true }}
    />
  )
}

createRoot(document.getElementById('root')!).render(<App />)
