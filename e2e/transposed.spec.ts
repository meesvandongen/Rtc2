import { expect, test, type Locator } from '@playwright/test'

import { dragTo, filterPopover, openMenu, openStory, toolbarAction } from './helpers'

/**
 * A transposed table is the same table with its axes swapped: one `<tr>` per
 * column — a *band* — and one column per record.
 *
 * The suite is written against what the reader sees rather than against the
 * markup where it can be: "sorting a band reorders the values along it" holds
 * whichever way round the table is, and is the assertion that would have caught
 * every way the transposition could be wired up backwards.
 */

/** The `<tr>` a column renders as. */
function band(root: Locator, columnId: string): Locator {
  return root.locator(`tbody tr[data-rtc-column-id="${columnId}"]`)
}

/** The values along one band, in record order. */
function bandText(root: Locator, columnId: string): Promise<string[]> {
  return band(root, columnId).locator('td.rtc-td').allInnerTexts()
}

/** Left edge of each element, which is what a record's position comes down to. */
async function lefts(locator: Locator): Promise<number[]> {
  return locator.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().left)),
  )
}

/** Scrolls the table's own scroll container, which is where sticky bites. */
async function scrollTable(root: Locator, x: number, y: number): Promise<void> {
  await root.locator('.rtc-container').first().evaluate(
    (element, offset) => {
      element.scrollLeft = offset.x
      element.scrollTop = offset.y
    },
    { x, y },
  )
}

test.describe('transposed shape', () => {
  test('one row per column, one column per record', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--transposed')

    // Ten columns in the fixture, eight records in the story.
    await expect(root.locator('tbody tr')).toHaveCount(10)
    await expect(band(root, 'firstName').locator('td.rtc-td')).toHaveCount(8)

    // The header block moves into the body: a header that labels a row is a
    // row header, and there is nothing left for `<thead>` to hold.
    await expect(root.locator('thead')).toHaveCount(0)
    await expect(band(root, 'firstName').locator('th[scope="row"]')).toContainText('First name')
    await expect(root).toHaveAttribute('data-rtc-transposed', 'true')
  })

  test('the same data reads the same both ways round', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--both-ways-round')
    const upright = page.locator('.rtc-root').first()
    const transposed = page.locator('.rtc-root').nth(1)

    const firstRow = await upright.locator('tbody tr').first().locator('td').allInnerTexts()
    const firstRecord = await transposed
      .locator('tbody tr td.rtc-td:nth-of-type(1)')
      .allInnerTexts()

    expect(firstRecord).toEqual(firstRow)
    expect(root).toBeTruthy()
  })

  test('the table is sized by its two custom properties', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--sizing')
    // The first table declares 120px labels and 110px records, and overflows
    // its container — which is when the widths are exact rather than stretched.
    const widths = await page
      .locator('.rtc-root')
      .first()
      .locator('tbody tr')
      .first()
      .locator('th,td')
      .evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().width)))

    expect(widths).toEqual([120, 110, 110, 110, 110, 110])
    expect(root).toBeTruthy()
  })
})

test.describe('transposed behaviour', () => {
  test('sorting a band reorders the records', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--transposed')

    /** Each record as the pair of values it shows in two different bands. */
    const pairs = async () => {
      const [ages, emails] = [await bandText(root, 'age'), await bandText(root, 'email')]
      return ages.map((age, index) => `${age}|${emails[index]}`)
    }

    const before = await pairs()
    await band(root, 'age').locator('.rtc-th-sort').click()
    const after = await pairs()

    expect(after).not.toEqual(before)
    expect(after.map((pair) => Number(pair.split('|')[0]))).toEqual(
      [...after.map((pair) => Number(pair.split('|')[0]))].sort((a, b) => a - b),
    )
    // Sorting moved whole records, not the values of one band: every age is
    // still beside the email it arrived with.
    expect([...after].sort()).toEqual([...before].sort())
  })

  test('a band header filters its own column', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--transposed')

    const before = await bandText(root, 'firstName')
    await band(root, 'firstName').locator('.rtc-filter-trigger').click()
    const popover = filterPopover(page)
    await expect(popover).toBeVisible()

    const target = before[0]!
    await popover.locator('[data-rtc-operand="text"]').fill(target)
    await page.keyboard.press('Escape')

    await expect.poll(() => bandText(root, 'firstName')).toContain(target)
    const remaining = await bandText(root, 'firstName')
    expect(remaining.length).toBeLessThan(before.length)
    expect(remaining.every((value) => value.toLowerCase().includes(target.toLowerCase()))).toBe(true)
    await expect(band(root, 'firstName').locator('th')).toHaveAttribute('data-rtc-filtered', 'true')
  })

  test('selecting a record marks its whole column', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--every-feature')

    const bands = await root.locator('tbody tr').count()
    await band(root, 'rtc-select').locator('td input[type="checkbox"]').first().click()

    await expect(root.locator('td[data-rtc-selected="true"]')).toHaveCount(bands)
    await expect(root.locator('[data-rtc-selection-summary]')).toContainText('selected')
  })

  test('a detail panel opens as a column beside its record', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--every-feature')

    await expect(root.locator('td.rtc-detail-cell')).toHaveCount(0)
    await band(root, 'rtc-expand').locator('td button').first().click()

    const panel = root.locator('td.rtc-detail-cell')
    await expect(panel).toHaveCount(1)
    // It spans every band, which is what makes it a column rather than a cell.
    await expect(panel).toHaveAttribute('rowspan', String(await root.locator('tbody tr').count()))
  })

  test('a grouped header spans the bands it covers', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--grouped-headers')

    const group = root.locator('th', { hasText: 'Identity' }).first()
    await expect(group).toHaveAttribute('rowspan', '3')
    await expect(group).toHaveAttribute('scope', 'rowgroup')
  })

  test('resizing sets the band height', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--sizing')
    const email = band(page.locator('.rtc-root').first(), 'email')

    const before = (await email.boundingBox())!.height
    const grip = email.locator('.rtc-resizer').first()
    const box = (await grip.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 8 })
    await page.mouse.up()

    await expect.poll(async () => (await email.boundingBox())!.height).toBeGreaterThan(before + 40)
    expect(root).toBeTruthy()
  })

  test('keyboard navigation moves between records and bands', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--every-feature')

    /** Which band and which record the focused cell belongs to. */
    const focused = () =>
      page.evaluate(() => {
        const cell = document.activeElement as HTMLElement | null
        return {
          band: cell?.closest('tr')?.getAttribute('data-rtc-column-id') ?? null,
          column: cell?.getAttribute('aria-colindex') ?? null,
        }
      })

    await band(root, 'firstName').locator('td.rtc-td').first().evaluate((cell) => cell.focus())
    const start = await focused()
    expect(start.band).toBe('firstName')

    // Down is the next band, same record; right is the next record, same band.
    await page.keyboard.press('ArrowDown')
    await expect.poll(async () => (await focused()).band).toBe('lastName')
    expect((await focused()).column).toBe(start.column)

    await page.keyboard.press('ArrowRight')
    await expect.poll(async () => (await focused()).column).toBe(String(Number(start.column) + 1))
    expect((await focused()).band).toBe('lastName')
  })
})

test.describe('transposed pinning', () => {
  test('a pinned column sticks as a band, a pinned row as a record column', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--pinning')

    await scrollTable(root, 500, 200)

    const box = await root.locator('.rtc-container').first().boundingBox()
    const geometry = await root.evaluate((element) => {
      const container = element.querySelector('.rtc-container')!.getBoundingClientRect()
      const pick = (selector: string) => {
        const node = element.querySelector(selector)
        if (!node) return null
        const rect = node.getBoundingClientRect()
        return { top: Math.round(rect.top - container.top), left: Math.round(rect.left - container.left) }
      }
      // What is actually on top where the two stuck blocks cross. Position
      // alone does not say: the label column is stuck to the inline start with
      // the z-index of a pinned column, which used to paint the labels of the
      // bands scrolling underneath over the pinned band's own.
      const at = (dx: number, dy: number) =>
        document
          .elementFromPoint(container.left + dx, container.top + dy)
          ?.closest('tr')
          ?.getAttribute('data-rtc-column-id') ?? null

      return {
        pinnedBand: pick('tbody tr[data-rtc-column-id="firstName"]'),
        scrolledBand: pick('tbody tr[data-rtc-column-id="city"]'),
        label: pick('tbody tr[data-rtc-column-id="city"] th'),
        labelWidth: Math.round(
          element.querySelector('tbody tr th')!.getBoundingClientRect().width,
        ),
        pinnedRecord: pick('td[data-rtc-pinned="start"]'),
        topLabel: at(60, 8),
        topRecord: at(300, 8),
      }
    })

    expect(box).toBeTruthy()
    // Stuck to the top of the scrollport, while an unpinned band has moved.
    expect(geometry.pinnedBand!.top).toBe(0)
    expect(geometry.scrolledBand!.top).not.toBe(0)
    // The label block stays at the inline start, and the pinned record comes to
    // rest beside it rather than underneath it.
    expect(geometry.label!.left).toBe(0)
    expect(geometry.pinnedRecord!.left).toBe(geometry.labelWidth)
    // And the pinned band is what a reader sees there, label included.
    expect(geometry.topLabel).toBe('firstName')
    expect(geometry.topRecord).toBe('firstName')
  })

  test('the column menu offers the direction the table will pin in', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--every-feature')

    await band(root, 'city').locator('.rtc-column-actions-trigger').click()
    const menu = openMenu(page)
    await expect(menu).toBeVisible()
    await expect(menu.getByText('Pin to top')).toBeVisible()
    await expect(menu.getByText('Pin to bottom')).toBeVisible()
  })
})

test.describe('transposed reordering', () => {
  test('dragging a band moves the column', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--reordering')

    const order = () =>
      root
        .locator('tbody tr')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-rtc-column-id') ?? ''))

    const before = await order()
    // Bands stack vertically, so the drop edge is decided along the block axis.
    await dragTo(page, band(root, 'firstName').locator('th .rtc-drag-handle'), band(root, 'email'), {
      edge: 'after',
    })

    await expect.poll(order).not.toEqual(before)
    const after = await order()
    expect(after.indexOf('firstName')).toBeGreaterThan(after.indexOf('email'))
  })

  test('dragging a record moves the row', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--reordering')

    const names = () => bandText(root, 'firstName')
    const before = await names()
    const handles = band(root, 'rtc-row-drag').locator('td .rtc-drag-handle')
    const cells = band(root, 'firstName').locator('td.rtc-td')

    // Records run across, so the drop edge is decided along the inline axis.
    const columns = await lefts(cells)
    expect(columns[0]).toBeLessThan(columns[1]!)

    await dragTo(page, handles.first(), cells.nth(2), { edge: 'after', axis: 'inline' })

    await expect.poll(names).not.toEqual(before)
    const after = await names()
    expect(after.indexOf(before[0]!)).toBeGreaterThan(after.indexOf(before[2]!))
  })
})

test.describe('transposed chrome', () => {
  test('the toolbar toggle flips the table and keeps its state', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--toggle')

    await expect(root).not.toHaveAttribute('data-rtc-transposed', 'true')
    await root.locator('thead th').first().locator('.rtc-th-sort').click()
    await expect(root.locator('thead th').first()).toHaveAttribute('aria-sort', 'ascending')

    await toolbarAction(root, 'toggle-transpose').click()
    await expect(root).toHaveAttribute('data-rtc-transposed', 'true')
    await expect(root.locator('thead')).toHaveCount(0)
    // Sorting is table state, not a property of the orientation.
    await expect(band(root, 'firstName').locator('th')).toHaveAttribute('aria-sort', 'ascending')

    await toolbarAction(root, 'toggle-transpose').click()
    await expect(root).not.toHaveAttribute('data-rtc-transposed', 'true')
    await expect(root.locator('thead th')).toHaveCount(7)
  })

  test('the empty state keeps the fields on screen', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--states')
    const empty = page.locator('.rtc-root').nth(1)

    await expect(empty.getByText('No records to display')).toBeVisible()
    await expect(empty.locator('tbody tr')).toHaveCount(5)
    await expect(empty.locator('td.rtc-transposed-empty')).toHaveAttribute('rowspan', '5')
  })

  test('skeleton records read across', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--states')
    const loading = page.locator('.rtc-root').first()

    await expect(loading.locator('tbody[aria-busy="true"]')).toBeVisible()
    await expect(band(loading, 'firstName').locator('td.rtc-td')).toHaveCount(4)
    expect(root).toBeTruthy()
  })
})

test.describe('transposed virtualization', () => {
  /** What is mounted, and how big the table says it is. */
  async function survey(root: Locator) {
    return root.evaluate((element) => {
      const container = element.querySelector('.rtc-container')!
      const bands = [...element.querySelectorAll('tbody tr[data-rtc-column-id]')]
      const first = bands[0]
      return {
        scrollWidth: container.scrollWidth,
        scrollHeight: container.scrollHeight,
        bands: bands.map((row) => row.getAttribute('data-rtc-column-id') ?? ''),
        recordsPerBand: first ? first.querySelectorAll('td.rtc-td:not(.rtc-transposed-spacer)').length : 0,
        cells: element.querySelectorAll('td.rtc-td:not(.rtc-transposed-spacer)').length,
        // Every rendered band's label, and where it sits: the label column is
        // never part of a window, and it stays stuck to the inline start.
        labels: bands.map((row) =>
          Math.round(
            row.querySelector('th')!.getBoundingClientRect().left -
              container.getBoundingClientRect().left,
          ),
        ),
      }
    })
  }

  test('both axes are windowed, and the table keeps its full size', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--virtualized')

    await expect(root).toHaveAttribute('data-rtc-row-virtual', 'true')
    await expect(root).toHaveAttribute('data-rtc-column-virtual', 'true')

    const before = await survey(root)
    // 5,000 records at 200px behind a 220px label column; 40 bands.
    expect(before.scrollWidth).toBe(220 + 5000 * 200)
    expect(before.bands.length).toBeLessThan(40)
    expect(before.recordsPerBand).toBeLessThan(80)
    // A window is the whole point: 40 × 5,000 is 200,000 cells unwindowed.
    expect(before.cells).toBeLessThan(2000)
  })

  test('scrolling either way brings different items in', async ({ page }) => {
    const root = await openStory(page, 'datatable-18-transposed--virtualized')
    const before = await survey(root)

    await scrollTable(root, 20_000, 400)
    await expect.poll(async () => (await survey(root)).bands.at(-1)).not.toBe(before.bands.at(-1))

    const after = await survey(root)
    // Different bands and different records, and the table has not changed size
    // underneath the scrollbar — the spacers stand in for exactly what is gone.
    expect(after.bands).not.toEqual(before.bands)
    expect(after.scrollWidth).toBe(before.scrollWidth)
    expect(after.scrollHeight).toBe(before.scrollHeight)
    // The pinned band is force-mounted, so it is still the first one.
    expect(after.bands[0]).toBe('firstName')
    // And every band on screen still has its label, at the inline start.
    expect(after.labels.every((left) => left === 0)).toBe(true)
  })

  test('a grouped header declines the column window but not the record one', async ({ page }) => {
    const root = await openStory(
      page,
      'datatable-18-transposed--grouped-headers-decline-the-column-window',
    )

    await expect(root).toHaveAttribute('data-rtc-row-virtual', 'true')
    await expect(root).not.toHaveAttribute('data-rtc-column-virtual', 'true')

    const survey_ = await survey(root)
    // Every band is mounted; the records are not.
    expect(survey_.bands.length).toBe(6)
    expect(survey_.recordsPerBand).toBeLessThan(2000)
    await expect(root.locator('th[rowspan="3"]').first()).toBeVisible()
  })
})
