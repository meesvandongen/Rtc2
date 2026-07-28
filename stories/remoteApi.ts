import { http, HttpResponse, delay } from 'msw'

import { makePeople, type Person } from './fixtures'

/** The "server" dataset. Fixed seed so assertions can hard-code cell values. */
export const REMOTE_PEOPLE = makePeople(137, 42)

export interface PeoplePage {
  rows: Person[]
  total: number
  page: number
  pageSize: number
}

export const PEOPLE_ENDPOINT = '/api/people'

/**
 * MSW handler standing in for a paginated REST endpoint.
 *
 * Sorting, searching and pagination are all applied server-side here, which is
 * what `manualPagination` / `manualSorting` / `manualFiltering` expect.
 */
export const peopleHandler = http.get(PEOPLE_ENDPOINT, async ({ request }) => {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '0')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
  const search = (url.searchParams.get('search') ?? '').toLowerCase()
  const sortBy = url.searchParams.get('sortBy')
  const sortDesc = url.searchParams.get('sortDesc') === 'true'

  let rows = REMOTE_PEOPLE

  if (search) {
    rows = rows.filter((person) =>
      [person.firstName, person.lastName, person.email, person.department, person.city]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }

  if (sortBy) {
    rows = [...rows].sort((a, b) => {
      const left = a[sortBy as keyof Person]
      const right = b[sortBy as keyof Person]
      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right))
      return sortDesc ? -comparison : comparison
    })
  }

  const total = rows.length

  // A small delay makes the loading state observable in both Storybook and the
  // Playwright assertions rather than resolving within the same frame.
  await delay(120)

  return HttpResponse.json<PeoplePage>({
    rows: rows.slice(page * pageSize, page * pageSize + pageSize),
    total,
    page,
    pageSize,
  })
})

/** Always-failing variant used by the remote error story. */
export const peopleErrorHandler = http.get(PEOPLE_ENDPOINT, async () => {
  await delay(80)
  return HttpResponse.json({ message: 'Upstream unavailable' }, { status: 503 })
})
