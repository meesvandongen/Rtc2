import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { loadingArgTypes } from './controls'
import { makePeople, makeWideColumns, personColumns } from './fixtures'

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

/** A wide table: many columns plus a large row count. */
export const WideAndTall: Story = {
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
