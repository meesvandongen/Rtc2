import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  bodyRows,
  columnText,
  header,
  headerColumnIds,
  openStory,
  panelField,
  rowIds,
  toolbarAction,
} from './helpers'

/**
 * The stress suite.
 *
 * Every other spec asserts that a feature works; these assert that it still
 * works at a size where the cost of getting it wrong is visible — 50,000 rows,
 * 252 columns, every feature at once, a five-level tree, values chosen to break
 * formatters, and data replaced ten times a second.
 *
 * Two kinds of failure are being watched for, and they need different
 * assertions:
 *
 * - **Correctness at scale.** A sort or a filter that only looks right is easy
 *   to produce when the DOM holds 30 of 50,000 rows, so the assertions compare
 *   the table's own row counts (rendered by the stories as plain numbers) as
 *   well as the mounted window.
 * - **Cost.** A quadratic sort or a table that mounts every row does not throw;
 *   it just gets slower until someone notices. Where that is the risk, the test
 *   bounds the mounted DOM and times the interaction. The budgets are
 *   deliberately loose — several times the observed duration — because a CI
 *   runner under load is not a benchmark. They catch an order-of-magnitude
 *   regression, which is the kind that ships.
 */

const ROW_COUNT = 50_000
const COLUMN_COUNT = 250

/** Generous ceiling for one interaction over the largest fixture. */
const INTERACTION_BUDGET_MS = 12_000

/** The table's scroll container. */
const container = (root: Locator): Locator => root.locator('.rtc-container').first()

/** Numbers the stories publish for the counts the DOM can no longer show. */
const metric = (page: Page, name: 'total' | 'filtered' | 'selected'): Locator =>
  page.getByTestId(`stress-${name}`)

/** Collects uncaught errors, so a story that dies quietly cannot pass. */
function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

/** Scrolls to an offset and waits for the virtualizer to catch up. */
async function scrollTo(root: Locator, top: number | 'end'): Promise<void> {
  await container(root).evaluate((element, offset) => {
    element.scrollTop = offset === 'end' ? element.scrollHeight : (offset as number)
  }, top)
}

test.describe('scale: 50,000 rows', () => {
  const story = 'datatable-17-stress--many-rows'

  test('holds the whole set in the row model and a window in the DOM', async ({ page }) => {
    const root = await openStory(page, story)

    await expect(metric(page, 'total')).toHaveText(String(ROW_COUNT))
    await expect(metric(page, 'filtered')).toHaveText(String(ROW_COUNT))

    const mounted = await bodyRows(root).count()
    expect(mounted).toBeGreaterThan(5)
    // The window plus overscan. Anything near the row count means the
    // virtualizer stopped virtualizing.
    expect(mounted).toBeLessThan(100)
  })

  test('the window stays bounded and reaches the last row while scrolling', async ({ page }) => {
    const root = await openStory(page, story)

    const firstBefore = (await rowIds(root))[0]
    await scrollTo(root, 20_000)
    await expect.poll(async () => (await rowIds(root))[0]).not.toBe(firstBefore)
    expect(await bodyRows(root).count()).toBeLessThan(100)

    // The virtualizer measures rows as they mount, so the total scroll height
    // keeps being revised on the way down — hence re-scrolling on each poll
    // rather than jumping once.
    await expect
      .poll(
        async () => {
          await scrollTo(root, 'end')
          return (await rowIds(root)).at(-1)
        },
        { timeout: 20_000 },
      )
      .toBe(`p${ROW_COUNT}`)

    expect(await bodyRows(root).count()).toBeLessThan(100)
  })

  test('sorting orders the whole set, both ways, within budget', async ({ page }) => {
    const root = await openStory(page, story)
    const sort = header(root, 'age').locator('.rtc-th-sort')

    const started = Date.now()
    await sort.click()
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'ascending')
    // 22 is the fixture's floor, so the top of an ascending sort proves the sort
    // saw rows outside the mounted window rather than reordering the window.
    await expect.poll(async () => (await columnText(root, 'age'))[0]).toBe('22')
    expect(Date.now() - started).toBeLessThan(INTERACTION_BUDGET_MS)

    const ascending = (await columnText(root, 'age')).map(Number)
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b))

    await sort.click()
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'descending')
    await expect.poll(async () => (await columnText(root, 'age'))[0]).toBe('64')

    const descending = (await columnText(root, 'age')).map(Number)
    expect(descending).toEqual([...descending].sort((a, b) => b - a))
  })

  test('the global filter narrows the whole set within budget', async ({ page }) => {
    const root = await openStory(page, story)

    const started = Date.now()
    await root.locator('[data-rtc-global-filter]').fill('Lisbon')
    await expect.poll(async () => Number(await metric(page, 'filtered').innerText())).toBeLessThan(
      ROW_COUNT,
    )
    expect(Date.now() - started).toBeLessThan(INTERACTION_BUDGET_MS)

    const matches = Number(await metric(page, 'filtered').innerText())
    // Seven cities in the fixture: a search for one has to leave a real share
    // of the rows, not one page of them.
    expect(matches).toBeGreaterThan(ROW_COUNT / 20)

    // And every mounted row is a match, not just the count.
    const cities = new Set(await columnText(root, 'city'))
    expect([...cities]).toEqual(['Lisbon'])
  })

  test('select-all covers the filtered set, not the mounted window', async ({ page }) => {
    const root = await openStory(page, story)

    const started = Date.now()
    await root.getByLabel('Toggle select all').check()
    await expect(metric(page, 'selected')).toHaveText(String(ROW_COUNT), { timeout: 20_000 })
    expect(Date.now() - started).toBeLessThan(INTERACTION_BUDGET_MS * 2)

    await expect(root.locator('[data-rtc-selection-summary]')).toContainText(
      `${ROW_COUNT} of ${ROW_COUNT}`,
    )

    // Filtering afterwards leaves the selection alone — it is keyed by row id,
    // not by what is on screen.
    await root.locator('[data-rtc-global-filter]').fill('Lisbon')
    await expect.poll(async () => Number(await metric(page, 'filtered').innerText())).toBeLessThan(
      ROW_COUNT,
    )
    await expect(metric(page, 'selected')).toHaveText(String(ROW_COUNT))
  })
})

test.describe('width: 252 columns', () => {
  const story = 'datatable-17-stress--many-columns'

  test('renders every column and keeps the pinned edges in place', async ({ page }) => {
    const root = await openStory(page, story)

    const ids = await headerColumnIds(root)
    // Two named columns plus the generated metrics.
    expect(ids).toHaveLength(COLUMN_COUNT + 2)
    expect(ids[0]).toBe('firstName')
    expect(ids.at(-1)).toBe(`metric-${COLUMN_COUNT}`)

    const pinnedStart = header(root, 'firstName')
    const pinnedEnd = header(root, `metric-${COLUMN_COUNT}`)
    await expect(pinnedStart).toHaveAttribute('data-rtc-pinned', 'start')
    await expect(pinnedEnd).toHaveAttribute('data-rtc-pinned', 'end')

    const startBefore = (await pinnedStart.boundingBox())!.x
    const endBefore = (await pinnedEnd.boundingBox())!.x
    const neighbourBefore = (await header(root, 'metric-1').boundingBox())!.x

    await container(root).evaluate((element) => {
      element.scrollLeft = 8_000
    })
    await expect
      .poll(async () => (await header(root, 'metric-1').boundingBox())!.x)
      .not.toBe(neighbourBefore)

    // Pinned columns are positioned against the scroll offset, which is what
    // breaks at this width if it breaks at all.
    expect(Math.abs((await pinnedStart.boundingBox())!.x - startBefore)).toBeLessThan(2)
    expect(Math.abs((await pinnedEnd.boundingBox())!.x - endBefore)).toBeLessThan(2)
  })

  test('a wide table still virtualizes its rows', async ({ page }) => {
    const root = await openStory(page, story)

    const mounted = await bodyRows(root).count()
    expect(mounted).toBeGreaterThan(5)
    expect(mounted).toBeLessThan(100)

    // Every mounted row carries every column: a cell count that scales with
    // both axes is the cost this story exists to make visible.
    const cells = await bodyRows(root).first().locator('td').count()
    expect(cells).toBe(COLUMN_COUNT + 2)
  })
})

test.describe('width: 252 columns, virtualized', () => {
  const story = 'datatable-17-stress--many-columns-virtualized'

  interface ColumnGeometry {
    /** Left edge of each mounted header, relative to the scroll container. */
    head: Record<string, number>
    /** The same for the first mounted body row. */
    body: Record<string, number>
    viewport: number
  }

  /**
   * The whole window's geometry in one round trip.
   *
   * It has to be read at one instant. The header and the body always render
   * the same window — they are handed the same object — but a column arriving
   * from off-screen has its header floor measured as it lands, and that can
   * move the window between two separate reads.
   */
  function geometry(root: Locator): Promise<ColumnGeometry> {
    return root.evaluate((element) => {
      const scroller = element.querySelector('.rtc-container')!
      const origin = scroller.getBoundingClientRect().x
      const offsets = (scope: Element | null, selector: string) => {
        const result: Record<string, number> = {}
        for (const cell of scope?.querySelectorAll(selector) ?? []) {
          const id = cell.getAttribute('data-rtc-column-id')
          if (id) result[id] = Math.round(cell.getBoundingClientRect().x - origin)
        }
        return result
      }
      return {
        head: offsets(element.querySelector('thead tr:last-child'), 'th[data-rtc-column-id]'),
        body: offsets(element.querySelector('tbody tr[data-rtc-row-id]'), 'td'),
        viewport: Math.round(scroller.getBoundingClientRect().width),
      }
    })
  }

  test('mounts a window of columns instead of all 252', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)
    await expect(root).toHaveAttribute('data-rtc-column-virtual', 'true')

    const cells = await bodyRows(root).first().locator('td').count()
    expect(cells).toBeGreaterThan(2)
    // The whole point: the row costs what fits on screen, not what exists.
    expect(cells).toBeLessThan(40)

    // Both axes windowed, so the mounted DOM is bounded by the viewport in
    // both directions rather than by the size of the data.
    expect(cells * (await bodyRows(root).count())).toBeLessThan(2_000)

    expect(errors).toEqual([])
  })

  test('the window scrolls without moving the columns it already showed', async ({ page }) => {
    const root = await openStory(page, story)

    // Visit the whole width first: a column's measured header floor can only
    // be taken while it is mounted, and it is part of the width every offset
    // after it is built from.
    const width = await container(root).evaluate((element) => element.scrollWidth)
    for (let left = 0; left < width; left += 1_000) {
      await container(root).evaluate((element, offset) => {
        element.scrollLeft = offset
      }, left)
    }

    await container(root).evaluate((element) => {
      element.scrollLeft = 12_000
    })
    await expect.poll(async () => Object.keys((await geometry(root)).head).length).toBeGreaterThan(3)
    const before = (await geometry(root)).head

    await container(root).evaluate((element) => {
      element.scrollLeft = 12_400
    })
    await expect.poll(async () => (await geometry(root)).head['firstName']).toBe(0)
    const after = (await geometry(root)).head

    // Every column mounted on both sides of the scroll moved by exactly the
    // scroll distance. A window whose padding is off by a column drifts here,
    // and it is the failure that looks like nothing until a cell lands under
    // the wrong header.
    const shared = Object.keys(before).filter(
      (id) => id in after && id !== 'firstName' && id !== `metric-${COLUMN_COUNT}`,
    )
    expect(shared.length).toBeGreaterThan(3)
    for (const id of shared) expect(Math.abs(before[id]! - after[id]! - 400)).toBeLessThanOrEqual(1)
  })

  test('headers, cells and the pinned edges stay in one column', async ({ page }) => {
    const root = await openStory(page, story)

    await container(root).evaluate((element) => {
      element.scrollLeft = 9_000
    })
    await expect.poll(async () => Object.keys((await geometry(root)).head).length).toBeGreaterThan(3)

    const { head, body, viewport } = await geometry(root)
    const ids = Object.keys(head)
    expect(ids[0]).toBe('firstName')
    expect(ids.at(-1)).toBe(`metric-${COLUMN_COUNT}`)

    // One window, two sections of the table: every mounted header has its
    // cell, at its offset.
    expect(Object.keys(body)).toEqual(ids)
    for (const id of ids) expect(Math.abs(head[id]! - body[id]!)).toBeLessThanOrEqual(1)

    // Both pins are force-mounted at any offset, and both sit on their edge.
    expect(head['firstName']).toBe(0)
    const endBox = (await header(root, `metric-${COLUMN_COUNT}`).boundingBox())!
    const scroller = (await container(root).boundingBox())!
    expect(Math.abs(endBox.x + endBox.width - (scroller.x + viewport))).toBeLessThan(2)
  })
})

test.describe('every feature at once, on 5,000 rows', () => {
  const story = 'datatable-17-stress--everything-at-once'

  test('all the feature surfaces render together', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)

    // Toolbar internals, the docked filter panel, the grouping chips, the
    // generated display columns and the footer, all in one table.
    await expect(toolbarAction(root, 'toggle-density')).toBeVisible()
    await expect(toolbarAction(root, 'toggle-fullscreen')).toBeVisible()
    await expect(root.locator('[data-rtc-global-filter]')).toBeVisible()
    await expect(root.locator('[data-rtc-group-chip="department"]')).toBeVisible()
    await expect(panelField(root, 'city')).toBeVisible()
    await expect(header(root, 'rtc-select')).toBeVisible()
    await expect(header(root, 'rtc-expand')).toBeVisible()
    await expect(header(root, 'rtc-row-number')).toBeVisible()
    await expect(header(root, 'rtc-row-actions')).toBeVisible()
    await expect(root.locator('tfoot')).toContainText('Totals')

    expect(errors).toEqual([])
  })

  test('grouping 5,000 rows summarises them and expands on demand', async ({ page }) => {
    const root = await openStory(page, story)

    const groupCells = root.locator('td[data-rtc-grouped="true"]')
    // Five departments in the fixture, all of them present at this size.
    await expect(groupCells).toHaveCount(5)
    // The group row carries its own count and its aggregates.
    await expect(groupCells.first()).toContainText(/\(\d{3,}\)/)
    await expect(root.locator('tbody').getByText(/^Σ /).first()).toBeVisible()
    await expect(root.locator('tbody').getByText(/^x̄ /).first()).toBeVisible()

    const before = await bodyRows(root).count()
    await bodyRows(root).first().locator('.rtc-expand-button').click()
    await expect.poll(() => bodyRows(root).count()).toBeGreaterThan(before)
    // Expanding a group of a thousand rows still mounts a window.
    expect(await bodyRows(root).count()).toBeLessThan(100)
  })

  test('a filter, a search and a sort compose over the grouped set', async ({ page }) => {
    const root = await openStory(page, story)

    await panelField(root, 'city').getByRole('combobox').selectOption('Lisbon')
    await expect.poll(() => root.locator('td[data-rtc-grouped="true"]').count()).toBeGreaterThan(0)

    await root.locator('[data-rtc-global-filter]').fill('Engineering')
    // One department survives both, so one group row does.
    await expect(root.locator('td[data-rtc-grouped="true"]')).toHaveCount(1)
    await expect(root.locator('td[data-rtc-grouped="true"]').first()).toContainText('Engineering')

    await header(root, 'salary').locator('.rtc-th-sort').click()
    await expect(header(root, 'salary')).toHaveAttribute('aria-sort', 'ascending')

    // Expanding what is left proves the three narrowed the same rows rather
    // than fighting over them.
    await bodyRows(root).first().locator('.rtc-expand-button').click()
    await expect.poll(() => bodyRows(root).count()).toBeGreaterThan(1)
    const cities = new Set(await columnText(root, 'city'))
    expect([...cities].filter((city) => city !== '')).toEqual(['Lisbon'])
  })

  test('density and full screen still respond under load', async ({ page }) => {
    const root = await openStory(page, story)

    await expect(root).toHaveAttribute('data-rtc-density', 'compact')
    await toolbarAction(root, 'toggle-density').click()
    await expect(root).toHaveAttribute('data-rtc-density', 'spacious')

    await toolbarAction(root, 'toggle-fullscreen').click()
    await expect(root).toHaveAttribute('data-rtc-fullscreen', 'true')
    await page.keyboard.press('Escape')
    await expect(root).not.toHaveAttribute('data-rtc-fullscreen', 'true')
  })
})

test.describe('depth: a five-level tree', () => {
  const story = 'datatable-17-stress--deep-tree'

  test('expand-all flattens ~3,900 rows into a bounded window', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)

    // Five roots, collapsed.
    await expect(bodyRows(root)).toHaveCount(5)

    await header(root, 'rtc-expand').locator('.rtc-expand-button').click()

    // Every level is present…
    await expect
      .poll(
        async () =>
          bodyRows(root).evaluateAll((rows) =>
            Math.max(...rows.map((row) => Number(row.getAttribute('data-rtc-depth') ?? 0))),
          ),
        { timeout: 20_000 },
      )
      .toBe(4)
    // …and the DOM still holds a window rather than the tree.
    expect(await bodyRows(root).count()).toBeLessThan(100)

    await scrollTo(root, 'end')
    await expect.poll(() => bodyRows(root).count()).toBeLessThan(100)

    // Collapsing returns the roots, which is where an expansion that lost
    // track of its parents shows up.
    await header(root, 'rtc-expand').locator('.rtc-expand-button').click()
    await expect(bodyRows(root)).toHaveCount(5)

    expect(errors).toEqual([])
  })
})

test.describe('hostile cell values', () => {
  const story = 'datatable-17-stress--hostile-values'

  test('renders every pathological value without throwing', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)

    await expect(bodyRows(root)).toHaveCount(12)
    // Non-finite numbers reach the cell as they are, rather than as a crash or
    // a blank column.
    await expect(root.locator('tbody')).toContainText('NaN')
    await expect(root.locator('tbody')).toContainText('Infinity')

    expect(errors).toEqual([])
  })

  test('a 2,000-character word cannot widen its column', async ({ page }) => {
    const root = await openStory(page, story)

    // `size: 200` on the column holding the long word.
    const declared = 200
    const widths = await root
      .locator('tbody td[data-rtc-column-id="firstName"]')
      .evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().width)))

    expect(widths).toHaveLength(12)
    // Body cells clip and contribute nothing to intrinsic sizing, so the row
    // holding the long word is exactly as wide as the row holding an empty
    // string — and neither is wider than the declared size.
    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBeLessThanOrEqual(declared + 2)

    // And the table is no wider than the columns it declares: ~1,630px of
    // declared sizes plus borders, nowhere near the 2,000 characters.
    const scrollWidth = await container(root).evaluate((element) => element.scrollWidth)
    expect(scrollWidth).toBeLessThan(2_000)
  })

  test('sorting a column of NaN, infinities and holes keeps every row', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)

    const sort = header(root, 'age').locator('.rtc-th-sort')
    await sort.click()
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'ascending')
    await expect(bodyRows(root)).toHaveCount(12)

    await sort.click()
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'descending')
    await expect(bodyRows(root)).toHaveCount(12)

    // The date column is the other formatter with undefined territory in it:
    // unparseable, out-of-range and missing values in one column.
    const dates = header(root, 'startDate').locator('.rtc-th-sort')
    await dates.click()
    await expect(bodyRows(root)).toHaveCount(12)

    expect(errors).toEqual([])
  })

  test('searching finds emoji and right-to-left text', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)
    const search = root.locator('[data-rtc-global-filter]')

    // Each hostile string lands in more than one column, so what matters is
    // that the survivors are exactly the rows that contain the term — not how
    // many they are.
    for (const term of ['👩🏽‍🚒', 'مرحبا']) {
      await search.fill(term)
      // Polled as one property rather than a count then a check: the search is
      // debounced, so a count taken too early is the *previous* term's result,
      // which would pass a count assertion and fail the content one.
      await expect
        .poll(async () => {
          const rows = await bodyRows(root).allInnerTexts()
          return rows.length > 0 && rows.length < 12 && rows.every((text) => text.includes(term))
        })
        .toBe(true)
    }

    // A search that matches nothing empties the body rather than breaking it.
    await search.fill('no such value anywhere')
    await expect(bodyRows(root)).toHaveCount(0)
    await expect(root.getByText('No results found')).toBeVisible()

    await search.fill('')
    await expect(bodyRows(root)).toHaveCount(12)

    expect(errors).toEqual([])
  })
})

test.describe('churn: data replaced ten times a second', () => {
  const story = 'datatable-17-stress--constant-churn'

  test('state keyed by row id survives continuous replacement', async ({ page }) => {
    const errors = trackErrors(page)
    const root = await openStory(page, story)

    // Sorted from the start, so every tick reorders the rows under the window.
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'descending')

    await bodyRows(root).first().getByLabel('Toggle select row').check()
    await expect(page.getByTestId('stress-selected')).toHaveText('1')

    await page.getByTestId('churn-toggle').click()
    await expect.poll(async () => Number(await page.getByTestId('churn-ticks').innerText()), {
      timeout: 20_000,
    }).toBeGreaterThan(20)

    // Through 20+ rounds of new row objects: the selection is intact, the sort
    // still holds, and the row count is unchanged.
    await expect(page.getByTestId('stress-selected')).toHaveText('1')
    await expect(page.getByTestId('stress-total')).toHaveText('2000')
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'descending')
    const ages = (await columnText(root, 'age')).map(Number)
    expect(ages).toEqual([...ages].sort((a, b) => b - a))

    // Interacting mid-churn still works.
    await root.locator('[data-rtc-global-filter]').fill('Lisbon')
    await expect.poll(async () => Number(await page.getByTestId('stress-filtered').innerText()))
      .toBeLessThan(2000)
    await expect(page.getByTestId('stress-selected')).toHaveText('1')

    await page.getByTestId('churn-toggle').click()
    expect(errors).toEqual([])
  })
})
