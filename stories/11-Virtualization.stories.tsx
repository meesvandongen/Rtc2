import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from '../src'
import { makePeople, makeWideColumns, personColumns } from './fixtures'

const meta: Meta = {
  title: 'DataTable/11 Virtualization',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * 10,000 rows with only the visible window mounted.
 *
 * Virtualization needs a bounded scroll container, so `height` is required;
 * the layout also switches to `grid` automatically because absolutely
 * positioned rows are impossible under the native table algorithm.
 */
export const RowVirtualization: Story = {
  render: () => (
    <>
      <p className="sb-note">10,000 rows — scroll to see rows mount and unmount on demand.</p>
      <DataTable
        columns={personColumns.slice(0, 7)}
        data={makePeople(10_000)}
        getRowId={(row) => row.id}
        enableRowVirtualization
        enablePagination={false}
        enableStickyHeader
        height={520}
        density="compact"
        enableStripes
      />
    </>
  ),
}

/** Virtualized rows still support sorting, filtering and selection. */
export const VirtualizedWithFeatures: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={makePeople(5000)}
      getRowId={(row) => row.id}
      enableRowVirtualization
      enableRowSelection
      enableColumnActions
      enableColumnPinning
      enablePagination={false}
      enableStickyHeader
      height={520}
      initialState={{ showColumnFilters: true, columnPinning: { start: ['rtc-select'], end: [] } }}
    />
  ),
}

/** A wide table: many columns plus a large row count. */
export const WideAndTall: Story = {
  render: () => (
    <DataTable
      columns={makeWideColumns(40)}
      data={makePeople(3000)}
      getRowId={(row) => row.id}
      enableRowVirtualization
      layoutMode="grid-no-grow"
      enablePagination={false}
      enableStickyHeader
      enableColumnPinning
      height={520}
      density="compact"
      initialState={{ columnPinning: { start: ['firstName'], end: [] } }}
    />
  ),
}

/** Tune the overscan and estimated row height for taller rows. */
export const CustomVirtualizerOptions: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={makePeople(2000)}
      getRowId={(row) => row.id}
      enableRowVirtualization
      rowVirtualizerOptions={{ overscan: 20, estimateSize: () => 60 }}
      density="spacious"
      enablePagination={false}
      enableStickyHeader
      height={520}
    />
  ),
}
