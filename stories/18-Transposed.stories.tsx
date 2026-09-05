import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { appearanceArgTypes, chromeArgTypes, loadingArgTypes } from './controls'
import {
  currency,
  groupedHeaderColumns,
  makePeople,
  makeTree,
  makeWideColumns,
  personColumns,
  type Person,
} from './fixtures'

const data = makePeople(25)

const meta: Meta = {
  title: 'DataTable/18 Transposed',
  argTypes: { ...appearanceArgTypes, ...chromeArgTypes, ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** Six columns with a footer, so the footer block has something to show. */
const withFooters = personColumns
  .slice(0, 6)
  .map((column, index) =>
    index === 0
      ? { ...column, footer: 'Summary' }
      : index === 5
        ? { ...column, footer: ({ table }: any) => `avg ${average(table, 'age')}` }
        : column,
  )

function average(table: any, columnId: string): string {
  const rows = table.getPrePaginatedRowModel().rows as Array<{ getValue: (id: string) => unknown }>
  if (rows.length === 0) return '—'
  const total = rows.reduce((sum, row) => sum + Number(row.getValue(columnId) ?? 0), 0)
  return (total / rows.length).toFixed(1)
}

/**
 * `transposed` flips the axes: column headers stack down the inline start and
 * each record runs vertically beside them.
 *
 * Nothing is switched off by it. Every control below still applies — they are
 * the same options they were, acting on the axis they now land on.
 */
export const Transposed: Story = {
  args: {
    transposed: true,
    enableStripes: true,
    enableRowHover: true,
    enableBorders: 'all',
    direction: 'ltr',
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data.slice(0, 8)}
      getRowId={(row) => row.id}
      enablePagination={false}
      {...args}
    />
  ),
}

/**
 * The same data, both ways round.
 *
 * A wide record set reads better upright; a handful of records with a lot of
 * fields reads better on its side, which is the case this option exists for.
 */
export const BothWaysRound: Story = {
  render: () => (
    <>
      {[false, true].map((transposed) => (
        <div key={String(transposed)} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 6)}
            data={data.slice(0, 4)}
            getRowId={(row) => row.id}
            transposed={transposed}
            enableToolbar={false}
            enablePagination={false}
            enableBorders="all"
            caption={`transposed={${transposed}}`}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * Put the flip in the reader's hands.
 *
 * `enableTransposeToggle` adds a button beside the density and full-screen
 * ones. Like `density`, the orientation lives in UI state, so leaving the
 * `transposed` option unset is what keeps the button live — pass it and the
 * button goes, because it would have nothing left to change.
 */
export const Toggle: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        The button with the transpose glyph is at the end of the top toolbar. State can be seeded
        through <code>initialState</code>, observed through <code>onTransposedChange</code>, or
        driven from outside with <code>state</code>.
      </p>
      <DataTable
        columns={personColumns.slice(0, 7)}
        data={data.slice(0, 6)}
        getRowId={(row) => row.id}
        enableTransposeToggle
        enablePagination={false}
        enableBorders="all"
      />
    </>
  ),
}

/**
 * Sorting, filtering, selection, grouping, expanding, editing, row actions,
 * detail panels and column footers — on at once, on their sides.
 *
 * Each acts on the axis it lands on: the sort and filter controls travel with
 * their header into the label column, the checkboxes run along the select band,
 * and a detail panel opens as a column beside the record it belongs to.
 */
export const EveryFeature: Story = {
  render: () => (
    <DataTable
      columns={withFooters}
      data={makeTree()}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      transposed
      enableRowSelection
      enableRowNumbers
      enableRowActions
      enableColumnActions
      enableColumnOrdering
      enableColumnDragging
      enableColumnPinning
      enableRowPinning
      enableColumnResizing
      enableCellSelection
      enableCellRangeSelection
      enableEditing
      editMode="cell"
      enableExpanding
      enableGrouping
      enableGroupingChips
      enableKeyboardNavigation
      enablePagination={false}
      enableBorders="all"
      renderDetailPanel={({ row }) => (
        <div style={{ display: 'grid', gap: 4 }}>
          <strong>{row.original.email}</strong>
          <span>Salary {currency(row.original.salary)}</span>
          <span>{row.original.skills.join(', ')}</span>
        </div>
      )}
      height={520}
    />
  ),
}

/**
 * Pinning, both kinds, on a table that scrolls both ways.
 *
 * A pinned **column** is a band stuck to the top or bottom; a pinned **row** is
 * a record column held against the inline edges. `enableStickyHeader` sticks
 * the label block and `enableStickyFooter` the footer block, which is what a
 * pinned record has to come to rest beside rather than under.
 *
 * `rowPinningDisplayMode` is left at its default, `sticky`: the pinned record
 * keeps its place in the order — you can still see where it ranks — and is held
 * against *both* inline edges, so it waits at the trailing edge until the
 * scroll reaches it and docks beside the labels once the scroll goes past. The
 * transpose of what a sticky pinned row does upright, edges and all.
 */
export const Pinning: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Scroll in both directions. The first name band and the label column stay put. Two records
        are pinned: the third sits among its neighbours until you scroll past it and then docks
        beside the labels, and the thirteenth waits at the far edge until you reach it. Neither
        ever leaves the screen.
      </p>
      <DataTable
        columns={withFooters}
        data={data.slice(0, 14)}
        getRowId={(row) => row.id}
        transposed
        enableColumnPinning
        enableRowPinning
        enableColumnActions
        enableRowActions
        enableStickyHeader
        enableStickyFooter
        enablePagination={false}
        enableBorders="all"
        // Narrower records so the two pinned ones and the footer block all fit
        // with room to spare: held against both edges, a pinned record keeps
        // clear of whatever is parked beyond it, and in a container with no
        // room left that is what pushes it off its own place in the order.
        cssVars={{ '--rtc-transposed-record-width': '150px' }}
        initialState={{
          columnPinning: { start: ['firstName'], end: ['age'] },
          rowPinning: { top: [data[2]!.id], bottom: [data[12]!.id] },
        }}
        height={280}
      />
    </>
  ),
}

/**
 * The other three `rowPinningDisplayMode`s, turned.
 *
 * Where `sticky` leaves a pinned record among its neighbours, `top`, `bottom`
 * and `top-and-bottom` lift it into a block of its own — at the inline **start**
 * for `top` and the inline **end** for `bottom`, the same rotation the rest of
 * the table makes. The block is docked against that one edge and stacks there,
 * and the record facing the rest of the table carries the boundary.
 *
 * Upright the block is a `<tbody>` of its own outside the scrolling one. It
 * cannot be here — a record is a column, and a column has no element — so each
 * record of the block sticks on its own account, at an offset counted from the
 * label block. The result is the same: a block that holds one edge while the
 * records between them scroll under it.
 */
export const PinnedSections: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Scroll across. Two records are lifted out to the start and one to the end, and the records
        in between pass underneath.
      </p>
      <DataTable
        columns={withFooters}
        data={data.slice(0, 14)}
        getRowId={(row) => row.id}
        transposed
        enableRowPinning
        rowPinningDisplayMode="top-and-bottom"
        enableRowActions
        enableStickyHeader
        enableStickyFooter
        enablePagination={false}
        enableBorders="all"
        initialState={{
          rowPinning: { top: [data[2]!.id, data[5]!.id], bottom: [data[9]!.id] },
        }}
        height={280}
      />
    </>
  ),
}

/**
 * Both drags turn with the table.
 *
 * A column is dropped between two bands, so its grip drags vertically and its
 * indicator is a horizontal line; a record is dropped between two columns, so
 * that one drags across. Which half of the target the pointer is in still
 * decides which side the item lands on — along whichever axis it is now.
 */
export const Reordering: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Drag a label by its grip to move that field up or down. Drag a record by the grip in the
        first band to move it left or right.
      </p>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={data.slice(0, 5)}
        getRowId={(row) => row.id}
        transposed
        enableColumnDragging
        enableRowOrdering
        enablePagination={false}
        enableBorders="all"
      />
    </>
  ),
}

/**
 * Both virtualizers, on their new axes.
 *
 * Each option still windows the thing it names — `enableRowVirtualization` the
 * records, `enableColumnVirtualization` the columns — which transposed means
 * they have swapped axes: the records run across, so their window is the
 * horizontal one, and the columns run down.
 *
 * The window is held open by spacers rather than by taking anything out of
 * flow, which is what lets a virtualized transposed table stay a real
 * `<table>`. And like the upright `<thead>`, the label column is never part of
 * a window: every band brings its own label, whichever records are on screen.
 */
export const Virtualized: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        5,000 records across and 40 fields down, with a bounded height. Scroll either way — the
        label column stays at the side, and only what is in view is mounted. Two records are
        pinned and stay on screen the whole way, one of them 2,500 columns in.
      </p>
      <DataTable
        columns={makeWideColumns(40)}
        data={makePeople(5000)}
        getRowId={(row) => row.id}
        transposed
        enableRowVirtualization
        enableColumnVirtualization
        enableColumnPinning
        enableRowPinning
        enablePagination={false}
        enableBorders="all"
        density="compact"
        initialState={{
          columnPinning: { start: ['firstName'], end: [] },
          // `sticky` survives a window here, where upright it falls back to the
          // sections: a windowed record is held in flow by a spacer rather than
          // taken out of it, so it can stick like any other cell. The window
          // force-mounts both of them at any scroll offset.
          rowPinning: { top: ['p3'], bottom: ['p2500'] },
        }}
        height={420}
      />
    </>
  ),
}

/**
 * A grouped header still declines the column window.
 *
 * A window over the bands is a range of *leaf* columns, and a header spanning
 * several of them has no span to be given when only some are rendered — the
 * same reason the upright table declines it. The records are still windowed;
 * `data-rtc-column-virtual` is absent from the root and
 * `data-rtc-row-virtual` is not.
 */
export const GroupedHeadersDeclineTheColumnWindow: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Both options are on. Every band is mounted; the records are still a window.
      </p>
      <DataTable
        columns={groupedHeaderColumns}
        data={makePeople(2000)}
        getRowId={(row) => row.id}
        transposed
        enableRowVirtualization
        enableColumnVirtualization
        enablePagination={false}
        enableBorders="all"
        height={360}
      />
    </>
  ),
}

/**
 * Grouped headers turn with everything else.
 *
 * A header spanning three columns upright spans three bands here: `colSpan` and
 * `rowSpan` simply trade places, which is one of the things that stays free by
 * keeping the transposed table a real `<table>`.
 */
export const GroupedHeaders: Story = {
  render: () => (
    <DataTable
      columns={groupedHeaderColumns}
      data={data.slice(0, 6)}
      getRowId={(row) => row.id}
      transposed
      enableColumnActions
      enablePagination={false}
      enableBorders="all"
    />
  ),
}

/**
 * Both axes are sized by CSS variables rather than by each column's `size`,
 * which measures the axis a transposed table no longer lays columns out along.
 */
export const Sizing: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        <code>--rtc-transposed-header-width</code> sizes the label column,{' '}
        <code>--rtc-transposed-record-width</code> every record column. With{' '}
        <code>enableColumnResizing</code> on, dragging the bottom edge of a label sets that band's
        height — the same <code>columnSizing</code> state, read along the other axis.
      </p>
      {[
        { '--rtc-transposed-header-width': '120px', '--rtc-transposed-record-width': '110px' },
        { '--rtc-transposed-header-width': '220px', '--rtc-transposed-record-width': '240px' },
      ].map((cssVars, index) => (
        <div key={index} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 5)}
            data={data.slice(0, 5)}
            getRowId={(row) => row.id}
            transposed
            cssVars={cssVars}
            enableColumnResizing
            enableToolbar={false}
            enablePagination={false}
            enableBorders="all"
            // Both widths are exact while the records overflow the container,
            // which is the case worth showing; a table narrower than the space
            // it is given stretches to fill it instead.
            style={{ maxWidth: 640 }}
            caption={JSON.stringify(cssVars)}
          />
        </div>
      ))}
    </>
  ),
}

/**
 * Loading, empty and error states, transposed.
 *
 * A skeleton record is a skeleton *column*, so `skeletonRowCount` reads across
 * rather than down; the empty state keeps the label column, since the fields
 * still say what the table is about when the records do not.
 */
export const States: Story = {
  args: { isLoading: true, isLoadingError: false, skeletonRowCount: 4 },
  render: (args) => (
    <>
      <div style={{ marginBottom: 16 }}>
        <DataTable
          columns={personColumns.slice(0, 5)}
          data={[]}
          transposed
          enableToolbar={false}
          enablePagination={false}
          enableBorders="all"
          {...args}
        />
      </div>
      <DataTable
        columns={personColumns.slice(0, 5)}
        data={[] as Person[]}
        transposed
        enableToolbar={false}
        enablePagination={false}
        enableBorders="all"
      />
    </>
  ),
}
