import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { loadingArgTypes } from './controls'
import { groupedHeaderColumns, makePeople, makeWideColumns, personColumns } from './fixtures'

const meta: Meta = {
  title: 'DataTable/11 Virtualization',
  argTypes: { ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/** Virtualization on/off controls shared by the stories below. Column virtualization
 *  is opt-in and independent of row virtualization. */
const virtualizationArgTypes = {
  enableRowVirtualization: { control: 'boolean', table: { category: 'Virtualization' } },
  enableColumnVirtualization: { control: 'boolean', table: { category: 'Virtualization' } },
} as const

/**
 * 10,000 rows with only the visible window mounted.
 *
 * Virtualization needs a bounded scroll container, so `height` is required;
 * the layout also switches to `grid` automatically because absolutely
 * positioned rows are impossible under the native table algorithm.
 */
export const RowVirtualization: Story = {
  args: {
    enableRowVirtualization: true,
    enableColumnVirtualization: false,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <>
      <p className="rtc-sb-note">10,000 rows — scroll to see rows mount and unmount on demand.</p>
      <DataTable
        columns={personColumns.slice(0, 7)}
        data={makePeople(10_000)}
        getRowId={(row) => row.id}
        enablePagination={false}
        enableStickyHeader
        height={520}
        density="compact"
        enableStripes
        {...args}
      />
    </>
  ),
}

/** Virtualized rows still support sorting, filtering and selection. */
export const VirtualizedWithFeatures: Story = {
  args: {
    enableRowVirtualization: true,
    enableColumnVirtualization: false,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={makePeople(5000)}
      getRowId={(row) => row.id}
      enableRowSelection
      enableColumnActions
      enableColumnPinning
      filterDisplayMode="popover-and-panel"
      enablePagination={false}
      enableStickyHeader
      height={520}
      initialState={{ showFilterPanel: true, columnPinning: { start: ['rtc-select'], end: [] } }}
      {...args}
    />
  ),
}

/**
 * 200 columns over 50 rows, with the rows left alone.
 *
 * The two axes are independent options, and this is the case that only needs
 * the horizontal one: 50 rows are nothing to mount, but 200 columns each of
 * them would be 10,000 cells. Scroll sideways — the header, the rows and the
 * footer all render the same window of columns, and the space the rest would
 * have taken is held open so the scrollbar spans the whole table.
 */
export const ColumnVirtualization: Story = {
  args: {
    enableRowVirtualization: false,
    enableColumnVirtualization: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        200 columns over 50 rows — only the columns in view are mounted, on every row at once.
      </p>
      <DataTable
        columns={makeWideColumns(200)}
        data={makePeople(50)}
        getRowId={(row) => row.id}
        layoutMode="grid-no-grow"
        enablePagination={false}
        enableStickyHeader
        enableColumnResizing
        enableColumnActions
        enableColumnDragging
        height={520}
        density="compact"
        enableStripes
        {...args}
      />
    </>
  ),
}

/**
 * The same window, mirrored.
 *
 * `direction="rtl"` reverses which way the container scrolls, and the browser
 * reports that offset differently — so the virtualizer is told about it, and
 * the gap left by the columns outside the window is expressed as
 * `padding-inline`, which follows the writing direction on its own.
 */
export const RightToLeftColumns: Story = {
  args: {
    enableRowVirtualization: false,
    enableColumnVirtualization: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        The 200-column table in RTL. Scroll from the right: the pinned column holds the start edge.
      </p>
      <DataTable
        columns={makeWideColumns(200)}
        data={makePeople(50)}
        getRowId={(row) => row.id}
        direction="rtl"
        layoutMode="grid-no-grow"
        enablePagination={false}
        enableStickyHeader
        enableColumnPinning
        height={520}
        density="compact"
        initialState={{ columnPinning: { start: ['firstName'], end: [] } }}
        {...args}
      />
    </>
  ),
}

/**
 * Both axes at once: 40 columns over 3,000 rows, with a pinned column.
 *
 * A pinned column is the part of column virtualization worth looking at. It is
 * force-mounted at every scroll offset — the window is allowed to drop
 * anything else, but a sticky column that unmounted would leave the edge of
 * the table blank — and the gap left by the columns that *were* dropped is
 * measured from just after it, so it holds its position while the rest slide
 * underneath.
 */
export const WideAndTall: Story = {
  args: {
    enableRowVirtualization: true,
    enableColumnVirtualization: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <DataTable
      columns={makeWideColumns(40)}
      data={makePeople(3000)}
      getRowId={(row) => row.id}
      layoutMode="grid-no-grow"
      enablePagination={false}
      enableStickyHeader
      enableColumnPinning
      height={520}
      density="compact"
      initialState={{ columnPinning: { start: ['firstName'], end: [] } }}
      {...args}
    />
  ),
}

/**
 * Grouped headers decline column virtualization.
 *
 * A window is a range of *leaf* columns, and a header that spans several of
 * them has no width to be given when only some of its children are rendered.
 * Rather than draw a header out of step with the cells under it, the table
 * renders every column and says so on the root: `data-rtc-column-virtual` is
 * absent here even though the option is on. Rows are still virtualized.
 */
export const GroupedHeaders: Story = {
  args: {
    enableRowVirtualization: true,
    enableColumnVirtualization: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Two header groups over 2,000 rows. Every column is mounted; the rows are still a window.
      </p>
      <DataTable
        columns={groupedHeaderColumns}
        data={makePeople(2000)}
        getRowId={(row) => row.id}
        enablePagination={false}
        enableStickyHeader
        height={520}
        density="compact"
        {...args}
      />
    </>
  ),
}

/** Tune the overscan and estimated row height for taller rows. */
export const CustomVirtualizerOptions: Story = {
  args: {
    enableRowVirtualization: true,
    enableColumnVirtualization: false,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: virtualizationArgTypes,
  render: (args) => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makePeople(2000)}
      getRowId={(row) => row.id}
      rowVirtualizerOptions={{ overscan: 20, estimateSize: () => 60 }}
      density="spacious"
      enablePagination={false}
      enableStickyHeader
      height={520}
      {...args}
    />
  ),
}
