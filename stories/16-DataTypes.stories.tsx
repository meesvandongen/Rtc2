import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  DataTable,
  createDataTableColumnHelper,
  numberDataType,
  NoOperand,
  TextOperand,
  type ColumnDataType,
  type DataTableColumn,
} from '../src'
import { currency, makePeople, type Person } from './fixtures'

const data = makePeople(200)

/**
 * Relative operators are pinned to a fixed clock so these stories and their
 * Playwright assertions stay reproducible.
 */
const NOW = new Date('2026-07-28T12:00:00Z')

const meta: Meta = {
  title: 'DataTable/16 Filter Data Types',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

const helper = createDataTableColumnHelper<Person>()

/** Columns annotated with an explicit `meta.dataType` for each built-in type. */
const typedColumns: Array<DataTableColumn<Person, any>> = helper.columns([
  helper.accessor('firstName', {
    header: 'First name',
    size: 130,
    meta: { dataType: 'text' },
  }),
  helper.accessor('department', {
    header: 'Department',
    size: 140,
    meta: { dataType: 'enum' },
  }),
  helper.accessor('city', {
    header: 'City',
    size: 120,
    meta: { dataType: 'enum' },
  }),
  helper.accessor('age', {
    header: 'Age',
    size: 90,
    meta: { dataType: 'number', align: 'right' },
  }),
  helper.accessor('salary', {
    header: 'Salary',
    size: 130,
    cell: ({ getValue }) => currency(getValue()),
    meta: { dataType: 'number', align: 'right', filterTypeMeta: { unit: 'USD' } },
  }),
  helper.accessor('active', {
    header: 'Active',
    size: 90,
    cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
    meta: { dataType: 'boolean', align: 'center' },
  }),
  helper.accessor('startDate', {
    header: 'Start date',
    size: 130,
    meta: { dataType: 'date' },
  }),
  helper.accessor('lastSeen', {
    header: 'Last seen',
    size: 190,
    cell: ({ getValue }) => new Date(getValue()).toISOString().slice(0, 16).replace('T', ' '),
    // Minute granularity in UTC, so "time of day between" is meaningful.
    meta: { dataType: 'datetime', filterTypeMeta: { dateTimeZone: 'utc' } },
  }),
  helper.accessor('skills', {
    header: 'Skills',
    size: 190,
    cell: ({ getValue }) => getValue().join(', '),
    meta: { dataType: 'collection' },
  }),
  helper.accessor('responseMs', {
    header: 'Response',
    size: 110,
    cell: ({ getValue }) => `${getValue()} ms`,
    meta: { dataType: 'duration', align: 'right', filterTypeMeta: { durationUnit: 'ms' } },
  }),
  helper.accessor('location', {
    header: 'Location',
    size: 160,
    cell: ({ getValue }) => {
      const point = getValue()
      return `${point.lat.toFixed(2)}, ${point.lng.toFixed(2)}`
    },
    meta: { dataType: 'geoPoint' },
  }),
])

/**
 * Every built-in data type in one table.
 *
 * Open the filter panel: each column offers a different operator list, and
 * each operator brings its own operand editor. Nothing in the filter component
 * knows about dates or coordinates — the types supply all of it.
 */
export const AllBuiltInTypes: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Text, enum, number, boolean, date, datetime, collection, duration and geoPoint. Compare the
        operator menus between the Age, Last seen and Location columns.
      </p>
      <DataTable
        columns={typedColumns}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="popover-and-panel"
        filterNow={NOW}
        layoutMode="grid-no-grow"
        height={620}
        enableStickyHeader
        initialState={{ showFilterPanel: true }}
      />
    </>
  ),
}

/**
 * The date operators the flat variant list could not express: an exact day, a
 * one-sided bound, a two-sided range, a named period, a rolling window, a set
 * of weekdays, and a time-of-day band independent of date.
 */
export const DateOperators: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Switch the operator on <strong>Last seen</strong> to see the operand change shape: a single
        datetime, two datetimes, a period picker, an amount-plus-unit pair, weekday toggles, or two
        clock times.
      </p>
      <DataTable
        columns={typedColumns.filter((column) =>
          ['firstName', 'startDate', 'lastSeen'].includes(
            (column as { accessorKey?: string }).accessorKey ?? '',
          ),
        )}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="panel"
        filterNow={NOW}
        height={620}
        enableStickyHeader
      />
    </>
  ),
}

/** Restrict a column to a subset of its type's operators. */
export const RestrictedOperators: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Age offers only <code>between</code> and <code>greaterThan</code> here, via
        <code> meta.filterOperators</code>.
      </p>
      <DataTable
        columns={helper.columns([
          helper.accessor('firstName', { header: 'First name', size: 140 }),
          helper.accessor('age', {
            header: 'Age',
            size: 120,
            meta: {
              dataType: 'number',
              filterOperators: ['between', 'greaterThan'],
              align: 'right',
            },
          }),
        ])}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="panel"
        height={520}
      />
    </>
  ),
}

/**
 * A custom data type, registered by id.
 *
 * Semantic versions cannot be compared as strings ("1.10.0" sorts before
 * "1.9.0"), so this type parses them and supplies its own operators. The
 * filter component is unchanged.
 */
const parseSemver = (value: unknown): number[] | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value ?? ''))
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

const compareSemver = (a: number[], b: number[]) =>
  a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!

const semverDataType: ColumnDataType = {
  id: 'semver',
  defaultOperator: 'semverAtLeast',
  Operand: TextOperand,
  operators: [
    {
      id: 'semverEquals',
      label: 'Is exactly',
      arity: 1,
      test: (data, operand) => {
        const left = parseSemver(data)
        const right = parseSemver(operand)
        return !right || (!!left && compareSemver(left, right) === 0)
      },
    },
    {
      id: 'semverAtLeast',
      label: 'Is at least',
      arity: 1,
      test: (data, operand) => {
        const left = parseSemver(data)
        const right = parseSemver(operand)
        return !right || (!!left && compareSemver(left, right) >= 0)
      },
    },
    {
      id: 'semverBelow',
      label: 'Is below',
      arity: 1,
      test: (data, operand) => {
        const left = parseSemver(data)
        const right = parseSemver(operand)
        return !right || (!!left && compareSemver(left, right) < 0)
      },
    },
    {
      id: 'semverMajorIs',
      label: 'Major version is',
      arity: 1,
      test: (data, operand) => {
        const left = parseSemver(data)
        const major = Number(operand)
        return !Number.isFinite(major) || (!!left && left[0] === major)
      },
    },
    {
      id: 'isEmpty',
      label: 'Is empty',
      arity: 0,
      Operand: NoOperand,
      isIncomplete: () => false,
      test: (data) => parseSemver(data) == null,
    },
  ],
  describe: (condition, ctx) =>
    `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${condition.value ?? ''}`,
}

interface Release {
  id: string
  service: string
  version: string
}

const releases: Release[] = [
  { id: 'r1', service: 'gateway', version: '2.10.0' },
  { id: 'r2', service: 'billing', version: '2.9.4' },
  { id: 'r3', service: 'search', version: '1.0.12' },
  { id: 'r4', service: 'auth', version: '3.1.0' },
  { id: 'r5', service: 'mailer', version: '1.4.7' },
  { id: 'r6', service: 'reports', version: '2.0.0' },
]

const releaseHelper = createDataTableColumnHelper<Release>()

export const CustomDataType: Story = {
  render: () => (
    <>
      <p className="sb-note">
        A <code>semver</code> type registered through <code>dataTypes</code>. Filtering by "is at
        least 2.0.0" keeps 2.10.0 and drops 1.4.7 — which string comparison would get backwards.
      </p>
      <DataTable
        columns={releaseHelper.columns([
          releaseHelper.accessor('service', { header: 'Service', size: 160 }),
          releaseHelper.accessor('version', {
            header: 'Version',
            size: 160,
            meta: { dataType: 'semver' },
          }),
        ])}
        data={releases}
        getRowId={(row) => row.id}
        dataTypes={{ semver: semverDataType }}
        filterDisplayMode="panel"
        enablePagination={false}
        height={400}
      />
    </>
  ),
}

/**
 * A one-off type supplied inline on the column, without registering it.
 *
 * Here a numeric column is reused with a single extra operator, showing that
 * types compose rather than having to be written from scratch.
 */
export const InlineDataType: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Salary keeps the numeric operators and gains "is a round number", declared inline on the
        column via <code>meta.dataType</code>.
      </p>
      <DataTable
        columns={helper.columns([
          helper.accessor('firstName', { header: 'First name', size: 140 }),
          helper.accessor('salary', {
            header: 'Salary',
            size: 160,
            cell: ({ getValue }) => currency(getValue()),
            meta: {
              align: 'right',
              dataType: {
                ...numberDataType,
                id: 'salary',
                operators: [
                  ...numberDataType.operators,
                  {
                    id: 'isRound',
                    label: 'Is a round number',
                    arity: 0,
                    Operand: NoOperand,
                    isIncomplete: () => false,
                    test: (value) => typeof value === 'number' && value % 1000 === 0,
                  },
                ],
              },
            },
          }),
        ])}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="panel"
        height={520}
      />
    </>
  ),
}

/** Coordinates filtered by distance from a point. */
export const GeoFiltering: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Set the centre to 52.37 / 4.90 (Amsterdam) with a 600 km radius to keep Amsterdam and
        Berlin and drop Prague, Dublin, Oslo, Madrid and Lisbon.
      </p>
      <DataTable
        columns={typedColumns.filter((column) =>
          ['firstName', 'city', 'location'].includes(
            (column as { accessorKey?: string }).accessorKey ?? '',
          ),
        )}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="panel"
        height={520}
      />
    </>
  ),
}

/**
 * Several conditions on one column, joined with and/or.
 *
 * One operator per column cannot express "between 30 and 40, or over 60".
 * `enableMultipleFilterConditions` stacks conditions in the same editor; the
 * value becomes `{ join, conditions }` and still round-trips as JSON.
 */
export const MultipleConditions: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Open the <strong>Age</strong> filter, add a second condition and switch the joiner to{' '}
        <em>Match any</em>.
      </p>
      <DataTable
        columns={helper.columns([
          helper.accessor('firstName', { header: 'First name', size: 140 }),
          helper.accessor('age', { header: 'Age', size: 120, meta: { dataType: 'number', align: 'right' } }),
          helper.accessor('department', {
            header: 'Department',
            size: 150,
            meta: { dataType: 'enum' },
          }),
        ])}
        data={data}
        getRowId={(row) => row.id}
        enableMultipleFilterConditions
        filterDisplayMode="panel"
        height={560}
      />
    </>
  ),
}

/** Types inferred from the data when a column declares nothing. */
export const InferredTypes: Story = {
  render: () => (
    <>
      <p className="sb-note">
        No <code>meta.dataType</code> anywhere. Booleans, numbers, ISO dates, arrays and
        coordinates are recognised from the first non-empty cell.
      </p>
      <DataTable
        columns={helper.columns([
          helper.accessor('firstName', { header: 'First name', size: 130 }),
          helper.accessor('age', { header: 'Age', size: 90 }),
          helper.accessor('active', {
            header: 'Active',
            size: 90,
            cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
          }),
          helper.accessor('startDate', { header: 'Start date', size: 130 }),
          helper.accessor('skills', {
            header: 'Skills',
            size: 180,
            cell: ({ getValue }) => getValue().join(', '),
          }),
        ])}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="panel"
        height={520}
      />
    </>
  ),
}
