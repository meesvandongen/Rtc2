import { createDataTableColumnHelper, numberDataType, type DataTableColumn } from '../src'

export interface Person {
  id: string
  firstName: string
  lastName: string
  email: string
  age: number
  department: Department
  city: string
  salary: number
  active: boolean
  startDate: string
  /** Full timestamp, to exercise time-of-day and granularity filtering. */
  lastSeen: string
  /** A list-valued cell, for the `collection` data type. */
  skills: string[]
  /** Coordinates, for the `geoPoint` data type. */
  location: { lat: number; lng: number }
  /** Milliseconds, for the `duration` data type. */
  responseMs: number
  subRows?: Person[]
}

export type Department = 'Engineering' | 'Design' | 'Sales' | 'Support' | 'Finance'

const DEPARTMENTS: Department[] = ['Engineering', 'Design', 'Sales', 'Support', 'Finance']
const CITIES = ['Amsterdam', 'Berlin', 'Lisbon', 'Oslo', 'Madrid', 'Dublin', 'Prague']
/** Rough city centres, so the geo filter has meaningful distances. */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Berlin: { lat: 52.52, lng: 13.405 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  Oslo: { lat: 59.9139, lng: 10.7522 },
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Dublin: { lat: 53.3498, lng: -6.2603 },
  Prague: { lat: 50.0755, lng: 14.4378 },
}
const SKILLS = ['React', 'TypeScript', 'CSS', 'Go', 'SQL', 'Figma', 'Rust']
const FIRST_NAMES = [
  'Ada', 'Grace', 'Alan', 'Linus', 'Barbara', 'Ken', 'Margaret', 'Dennis',
  'Katherine', 'Tim', 'Radia', 'Vint', 'Anita', 'Donald', 'Frances', 'Edsger',
]
const LAST_NAMES = [
  'Lovelace', 'Hopper', 'Turing', 'Torvalds', 'Liskov', 'Thompson', 'Hamilton',
  'Ritchie', 'Johnson', 'Berners-Lee', 'Perlman', 'Cerf', 'Borg', 'Knuth',
  'Allen', 'Dijkstra',
]

/**
 * Deterministic pseudo-random source.
 *
 * Stories and Playwright assertions compare exact cell text, so the fixture
 * must be identical on every run and in every browser — `Math.random` would
 * make the tests flaky.
 */
function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makePeople(count: number, seed = 1): Person[] {
  const random = mulberry32(seed)
  return Array.from({ length: count }, (_, index) => {
    const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]!
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]!
    const year = 2015 + Math.floor(random() * 10)
    const month = 1 + Math.floor(random() * 12)
    const day = 1 + Math.floor(random() * 28)
    const city = CITIES[Math.floor(random() * CITIES.length)]!
    // Spread across the past year so relative date filters have something to
    // find in every window.
    const daysAgo = Math.floor(random() * 400)
    const lastSeen = new Date(Date.UTC(2026, 6, 28) - daysAgo * 86_400_000)
    lastSeen.setUTCHours(6 + Math.floor(random() * 14), Math.floor(random() * 60), 0, 0)
    const skillCount = 1 + Math.floor(random() * 3)
    const skills = Array.from(
      new Set(Array.from({ length: skillCount }, () => SKILLS[Math.floor(random() * SKILLS.length)]!)),
    )
    return {
      id: `p${index + 1}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${index + 1}@example.com`,
      age: 22 + Math.floor(random() * 43),
      department: DEPARTMENTS[Math.floor(random() * DEPARTMENTS.length)]!,
      city,
      // Rounded to the nearest 500, as salary bands usually are — which also
      // gives the "is a round number" operator in the data-type stories
      // something to find.
      salary: 40000 + Math.floor((random() * 90000) / 500) * 500,
      active: random() > 0.3,
      startDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      lastSeen: lastSeen.toISOString(),
      skills,
      location: CITY_COORDS[city]!,
      responseMs: 50 + Math.floor(random() * 4000),
    }
  })
}

/** A small tree for expanding / sub-row stories. */
export function makeTree(): Person[] {
  const flat = makePeople(12, 7)
  const roots = flat.slice(0, 3)
  return roots.map((root, index) => ({
    ...root,
    subRows: flat.slice(3 + index * 3, 6 + index * 3).map((child) => ({
      ...child,
      subRows: index === 0 ? [flat[11]!] : undefined,
    })),
  }))
}

const helper = createDataTableColumnHelper<Person>()

export const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

/** The default column set used by most stories. */
export const personColumns: Array<DataTableColumn<Person, any>> = helper.columns([
  helper.accessor('firstName', { header: 'First name', size: 140 }),
  helper.accessor('lastName', { header: 'Last name', size: 150 }),
  helper.accessor('email', { header: 'Email', size: 260 }),
  helper.accessor('department', {
    header: 'Department',
    size: 150,
    meta: { dataType: 'enum' },
  }),
  helper.accessor('city', { header: 'City', size: 130, meta: { dataType: 'enum' } }),
  helper.accessor('age', {
    header: 'Age',
    size: 90,
    meta: { dataType: 'number', align: 'right', editVariant: 'number' },
  }),
  helper.accessor('salary', {
    header: 'Salary',
    size: 130,
    cell: ({ getValue }) => currency(getValue()),
    meta: {
      // Same numeric operators, but the editor opens on the dual-thumb slider
      // rather than two boxes, since salary has a meaningful faceted min/max.
      dataType: { ...numberDataType, id: 'salary', defaultOperator: 'inRangeSlider' },
      align: 'right',
      editVariant: 'number',
    },
  }),
  helper.accessor('startDate', {
    header: 'Start date',
    size: 140,
    meta: { dataType: 'date', editVariant: 'date' },
  }),
  helper.accessor('active', {
    header: 'Active',
    size: 100,
    cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
    meta: { dataType: 'boolean', align: 'center', editVariant: 'checkbox' },
  }),
])

/**
 * Columns with grouped headers, for the header-group story.
 *
 * `helper.group` declares its child `columns` as `ColumnDef<…, unknown>`, and
 * `ColumnDef` is invariant in its value type, so typed accessor children need
 * a cast on the child array.
 */
export const groupedHeaderColumns: Array<DataTableColumn<Person, any>> = helper.columns([
  helper.group({
    id: 'identity',
    header: 'Identity',
    columns: helper.columns([
      helper.accessor('firstName', { header: 'First name', size: 140 }),
      helper.accessor('lastName', { header: 'Last name', size: 150 }),
      helper.accessor('email', { header: 'Email', size: 240 }),
    ]) as never,
  }),
  helper.group({
    id: 'employment',
    header: 'Employment',
    columns: helper.columns([
      helper.accessor('department', { header: 'Department', size: 150 }),
      helper.accessor('startDate', { header: 'Start date', size: 140 }),
      helper.accessor('salary', {
        header: 'Salary',
        size: 130,
        cell: ({ getValue }) => currency(getValue()),
        meta: { align: 'right' },
      }),
    ]) as never,
  }),
])

/** Wide column set used by the column-virtualization and pinning stories. */
export function makeWideColumns(count: number): Array<DataTableColumn<Person, any>> {
  return helper.columns([
    helper.accessor('firstName', { header: 'First name', size: 150 }),
    helper.accessor('lastName', { header: 'Last name', size: 150 }),
    ...Array.from({ length: count }, (_, index) =>
      helper.display({
        id: `metric-${index + 1}`,
        header: `Metric ${index + 1}`,
        size: 120,
        cell: ({ row }) => ((row.index + 1) * (index + 3)) % 100,
        meta: { align: 'right' },
      }),
    ),
  ])
}
