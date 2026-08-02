import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type PaginationState, type SortingState } from '../src'
import { makePeople, personColumns, type Person } from './fixtures'
import {
  PEOPLE_ENDPOINT,
  PEOPLE_ERROR_ENDPOINT,
  peopleErrorHandler,
  peopleHandler,
  type PeoplePage,
} from './remoteApi'

const data = makePeople(137)

const meta: Meta = {
  title: 'DataTable/04 Pagination',
  parameters: {
    layout: 'fullscreen',
    // Registered on the meta rather than per story: MSW's handler set is
    // global, and a Docs page mounts both remote stories at once, so the
    // successful and failing endpoints have to be live at the same time.
    msw: { handlers: [peopleHandler, peopleErrorHandler] },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
    />
  ),
}

/** `default` (arrows), `pages` (numbered) and `simple` (prev/next only). */
export const DisplayModes: Story = {
  render: () => (
    <>
      {(['default', 'pages', 'simple'] as const).map((mode) => (
        <div key={mode} style={{ marginBottom: 16 }}>
          <DataTable
            columns={personColumns.slice(0, 4)}
            data={data}
            getRowId={(row) => row.id}
            paginationDisplayMode={mode}
            enableTopToolbar={false}
            caption={`paginationDisplayMode="${mode}"`}
          />
        </div>
      ))}
    </>
  ),
}

export const PaginationOnTop: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={data}
      getRowId={(row) => row.id}
      paginationPosition="top"
      enableBottomToolbar={false}
      pageSizeOptions={[5, 10, 20]}
    />
  ),
}

export const NoPagination: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 5)}
      data={makePeople(15)}
      getRowId={(row) => row.id}
      enablePagination={false}
      height={420}
      enableStickyHeader
    />
  ),
}

export const ControlledPagination: Story = {
  render: function ControlledPagination() {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 2, pageSize: 5 })
    return (
      <>
        <div className="rtc-sb-row">
          <button
            type="button"
            className="rtc-button"
            onClick={() => setPagination((old) => ({ ...old, pageIndex: 0 }))}
          >
            Jump to first page
          </button>
        </div>
        <DataTable
          columns={personColumns.slice(0, 5)}
          data={data}
          getRowId={(row) => row.id}
          state={{ pagination }}
          onPaginationChange={(updater) =>
            setPagination((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
        />
        <pre className="rtc-sb-panel">{JSON.stringify(pagination)}</pre>
      </>
    )
  },
}

/**
 * Server-side pagination against a mocked REST endpoint.
 *
 * `manualPagination` stops the table slicing rows, and `rowCount` tells it how
 * many rows exist server-side so the page count and range read correctly. The
 * same pattern covers `manualSorting` and `manualFiltering`, both wired here.
 */
function RemoteTable({ endpoint = PEOPLE_ENDPOINT }: { endpoint?: string }) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Person[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [fetchCount, setFetchCount] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    const id = ++requestId.current
    setIsLoading(true)
    setIsError(false)

    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
    })
    if (search) params.set('search', search)
    if (sorting[0]) {
      params.set('sortBy', sorting[0].id)
      params.set('sortDesc', String(sorting[0].desc))
    }

    fetch(`${endpoint}?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as PeoplePage
      })
      .then((payload) => {
        // Ignore responses that lost the race to a newer request.
        if (id !== requestId.current) return
        setRows(payload.rows)
        setTotal(payload.total)
        setFetchCount((count) => count + 1)
      })
      .catch(() => {
        if (id !== requestId.current) return
        setIsError(true)
        setRows([])
        setTotal(0)
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false)
      })
  }, [endpoint, pagination.pageIndex, pagination.pageSize, sorting, search])

  return (
    <>
      <p className="rtc-sb-note">
        Rows come from a mocked <code>GET {endpoint}</code> endpoint. Paging, sorting and
        searching each trigger a new request.
      </p>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={rows}
        getRowId={(row) => row.id}
        manualPagination
        manualSorting
        manualFiltering
        rowCount={total}
        isLoading={isLoading}
        showProgressBars={rows.length > 0}
        isLoadingError={isError}
        enableGlobalFilterToggle={false}
        state={{ pagination, sorting, globalFilter: search }}
        onPaginationChange={(updater) =>
          setPagination((old) => (typeof updater === 'function' ? updater(old) : updater))
        }
        onSortingChange={(updater) =>
          setSorting((old) => (typeof updater === 'function' ? updater(old) : updater))
        }
        onGlobalFilterChange={(updater) => {
          setSearch((old) => (typeof updater === 'function' ? updater(old) : updater))
          // A new query invalidates the current page.
          setPagination((old) => ({ ...old, pageIndex: 0 }))
        }}
      />
      <pre className="rtc-sb-panel" data-testid="remote-status">
        {JSON.stringify({ page: pagination.pageIndex, total, fetchCount, isLoading, isError })}
      </pre>
    </>
  )
}

export const RemotePagination: Story = {
  render: () => <RemoteTable />,
}

/** The same table when the endpoint returns 503. */
export const RemoteError: Story = {
  render: () => <RemoteTable endpoint={PEOPLE_ERROR_ENDPOINT} />,
}
