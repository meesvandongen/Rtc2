import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  bodyRows,
  columnText,
  dragTo,
  filterPopover,
  header,
  headerColumnIds,
  headerLabelIsTruncated,
  headerLabelOverlaps,
  openColumnFilter,
  openMenu,
  openStory,
  panelField,
  rowIds,
  toolbarAction,
} from './helpers'

test.describe('rendering and appearance', () => {
  test('renders headers and rows', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--basic')

    await expect(root.locator('thead th')).toHaveCount(10)
    await expect(bodyRows(root)).toHaveCount(10)
    await expect(header(root, 'firstName')).toContainText('First name')
  })

  test('density toggle cycles the presets', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--basic')

    await expect(root).toHaveAttribute('data-rtc-density', 'comfortable')
    await toolbarAction(root, 'toggle-density').click()
    await expect(root).toHaveAttribute('data-rtc-density', 'compact')
    await toolbarAction(root, 'toggle-density').click()
    await expect(root).toHaveAttribute('data-rtc-density', 'spacious')
    await toolbarAction(root, 'toggle-density').click()
    await expect(root).toHaveAttribute('data-rtc-density', 'comfortable')
  })

  test('full screen toggles and Escape exits', async ({ page }) => {
    const root = await openStory(page, 'datatable-14-state-composition--full-screen')

    await toolbarAction(root, 'toggle-fullscreen').click()
    await expect(root).toHaveAttribute('data-rtc-fullscreen', 'true')

    await page.keyboard.press('Escape')
    await expect(root).not.toHaveAttribute('data-rtc-fullscreen', 'true')
  })

  test('empty and error states replace the body', async ({ page }) => {
    const empty = await openStory(page, 'datatable-01-basics--empty-state')
    await expect(empty.getByText('No records to display')).toBeVisible()

    const errored = await openStory(page, 'datatable-01-basics--error-state')
    await expect(errored.locator('.rtc-error')).toContainText('Could not reach')
  })

  test('loading state renders skeletons', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--loading-states')
    await expect(root.locator('.rtc-skeleton').first()).toBeVisible()
  })

  test('RTL flips the writing direction', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--right-to-left')
    await expect(root).toHaveAttribute('dir', 'rtl')
  })
})

test.describe('sorting', () => {
  test('cycles ascending, descending, then clears', async ({ page }) => {
    const root = await openStory(page, 'datatable-02-sorting--basic')
    const cell = header(root, 'age')
    const button = cell.getByRole('button').first()

    await expect(cell).toHaveAttribute('aria-sort', 'none')

    await button.click()
    await expect(cell).toHaveAttribute('aria-sort', 'ascending')
    let ages = (await columnText(root, 'age')).map(Number)
    expect(ages).toEqual([...ages].sort((a, b) => a - b))

    await button.click()
    await expect(cell).toHaveAttribute('aria-sort', 'descending')
    ages = (await columnText(root, 'age')).map(Number)
    expect(ages).toEqual([...ages].sort((a, b) => b - a))

    await button.click()
    await expect(cell).toHaveAttribute('aria-sort', 'none')
  })

  test('shift-click adds a second sort and shows its precedence', async ({ page }) => {
    const root = await openStory(page, 'datatable-02-sorting--basic')

    await header(root, 'department').getByRole('button').first().click()
    await header(root, 'age').getByRole('button').first().click({ modifiers: ['Shift'] })

    await expect(header(root, 'department')).toHaveAttribute('aria-sort', 'ascending')
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'ascending')
    // The badge only appears for the second and later sort columns.
    await expect(header(root, 'age').locator('.rtc-sort-index')).toHaveText('2')
  })

  test('sortingRemoval disabled keeps a column sorted', async ({ page }) => {
    const root = await openStory(page, 'datatable-02-sorting--no-sort-removal')
    const cell = header(root, 'lastName')
    const button = cell.getByRole('button').first()

    await expect(cell).toHaveAttribute('aria-sort', 'ascending')
    await button.click()
    await expect(cell).toHaveAttribute('aria-sort', 'descending')
    await button.click()
    await expect(cell).toHaveAttribute('aria-sort', 'ascending')
  })
})

test.describe('filtering', () => {
  test('a column filter popover narrows the rows', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--column-filter-popovers')

    const popover = await openColumnFilter(root, page, 'department')
    await popover.getByLabel('Filter by Department').selectOption('Engineering')

    await expect.poll(async () => new Set(await columnText(root, 'department'))).toEqual(
      new Set(['Engineering']),
    )
  })

  test('the header funnel reflects an active filter', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--column-filter-popovers')

    await expect(header(root, 'department')).not.toHaveAttribute('data-rtc-filtered', 'true')

    const popover = await openColumnFilter(root, page, 'department')
    await popover.getByLabel('Filter by Department').selectOption('Design')
    await expect(header(root, 'department')).toHaveAttribute('data-rtc-filtered', 'true')
  })

  test('an active filter shows a removable chip in the toolbar', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--column-filter-popovers')

    const popover = await openColumnFilter(root, page, 'department')
    await popover.getByLabel('Filter by Department').selectOption('Sales')
    await page.keyboard.press('Escape')

    const chip = root.locator('[data-rtc-filter-chip="department"]')
    await expect(chip).toBeVisible()

    await chip.getByRole('button').click()
    await expect(chip).toHaveCount(0)
    await expect(header(root, 'department')).not.toHaveAttribute('data-rtc-filtered', 'true')
  })

  test('the docked panel filters and clears', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--docked-filter-panel')

    const panel = root.locator('[data-rtc-filter-panel]')
    await expect(panel).toBeVisible()

    await panelField(root, 'department').getByLabel('Filter by Department').selectOption('Design')
    await expect.poll(async () => new Set(await columnText(root, 'department'))).toEqual(
      new Set(['Design']),
    )

    await panel.getByRole('button', { name: 'Clear all' }).click()
    await expect.poll(async () => (await columnText(root, 'department')).length).toBeGreaterThan(1)
  })

  test('a tall range editor lives in the panel without changing row height', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--docked-filter-panel')

    // The reason the filter row was removed: this editor is far taller than a row.
    const sliderField = panelField(root, 'salary')
    await expect(sliderField).toBeVisible()

    const rowHeight = (await bodyRows(root).first().boundingBox())!.height
    expect(rowHeight).toBeLessThan(60)
  })

  test('the standalone panel drives a table it is not inside', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--filter-panel-outside-the-table')

    // The panel is a sibling of the table, so scope to the page not the root.
    await page
      .locator('[data-rtc-filter-field="department"]')
      .getByLabel('Filter by Department')
      .selectOption('Engineering')

    await expect.poll(async () => new Set(await columnText(root, 'department'))).toEqual(
      new Set(['Engineering']),
    )
  })

  test('the global filter searches across columns', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--global-filter')

    await root.locator('[data-rtc-global-filter]').fill('Lisbon')
    await expect.poll(async () => new Set(await columnText(root, 'city'))).toEqual(
      new Set(['Lisbon']),
    )
  })

  test('a range filter bounds a numeric column', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--docked-filter-panel')

    await panelField(root, 'age').getByLabel('Filter by Age Min').fill('50')
    await expect
      .poll(async () => (await columnText(root, 'age')).every((age) => Number(age) >= 50))
      .toBe(true)
  })

  test('the filter mode menu switches the operator', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--filter-modes')

    const popover = await openColumnFilter(root, page, 'firstName')
    await popover.getByRole('button', { name: 'Contains' }).click()
    await openMenu(page).getByRole('menuitemcheckbox', { name: 'Starts with' }).click()

    await filterPopover(page).getByLabel('Filter by First name').fill('A')
    await expect
      .poll(async () =>
        (await columnText(root, 'firstName')).every((name) => name.toLowerCase().startsWith('a')),
      )
      .toBe(true)
  })

  test('the panel can be toggled from the toolbar', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--popover-and-panel')

    await expect(root.locator('[data-rtc-filter-panel]')).toHaveCount(1)
    await toolbarAction(root, 'toggle-filters').click()
    await expect(root.locator('[data-rtc-filter-panel]')).toHaveCount(0)
    await toolbarAction(root, 'toggle-filters').click()
    await expect(root.locator('[data-rtc-filter-panel]')).toHaveCount(1)
  })

  test('faceted options come from the data', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--faceting')

    const options = await panelField(root, 'department')
      .getByLabel('Filter by Department')
      .locator('option')
      .allInnerTexts()
    expect(options).toContain('Engineering')
    expect(options).toContain('Finance')
  })
})

test.describe('pagination (client side)', () => {
  test('navigates pages and reports the range', async ({ page }) => {
    const root = await openStory(page, 'datatable-04-pagination--basic')

    await expect(root.locator('[data-rtc-page-range]')).toHaveText('1–10 of 137')
    const firstPage = await columnText(root, 'email')

    await root.getByLabel('Go to next page').click()
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('11–20 of 137')
    expect(await columnText(root, 'email')).not.toEqual(firstPage)

    await root.getByLabel('Go to last page').click()
    await expect(bodyRows(root)).toHaveCount(7)
    await expect(root.getByLabel('Go to next page')).toBeDisabled()
  })

  test('numbered pagination exposes page buttons', async ({ page }) => {
    await openStory(page, 'datatable-04-pagination--display-modes')
    // The story renders one table per display mode; `pages` is the second.
    const numbered = page.locator('.rtc-root').nth(1).locator('[data-rtc-pagination]')

    await expect(numbered.locator('.rtc-page-button').first()).toHaveAttribute(
      'aria-current',
      'page',
    )
    // 137 rows over 14 pages, so the window is 1, 2, …, 14.
    await numbered.getByRole('button', { name: '2', exact: true }).click()
    await expect(numbered.locator('[aria-current="page"]')).toHaveText('2')
    await numbered.getByRole('button', { name: '14', exact: true }).click()
    await expect(numbered.locator('[aria-current="page"]')).toHaveText('14')
  })
})

test.describe('selection', () => {
  test('selects a row and reflects it in the toolbar', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--checkboxes')

    await bodyRows(root).first().getByLabel('Toggle select row').check()
    await expect(bodyRows(root).first()).toHaveAttribute('data-rtc-selected', 'true')
    await expect(root.locator('[data-rtc-selection-summary]')).toContainText('1 of 20 row(s)')
  })

  test('select-all covers the current page', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--checkboxes')

    await root.getByLabel('Toggle select all').check()
    const rows = bodyRows(root)
    const count = await rows.count()
    for (let index = 0; index < count; index += 1) {
      await expect(rows.nth(index)).toHaveAttribute('data-rtc-selected', 'true')
    }
  })

  test('radio mode allows only one selected row', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--single-select-radio')

    await bodyRows(root).nth(0).getByLabel('Toggle select row').check()
    await bodyRows(root).nth(1).getByLabel('Toggle select row').check()

    await expect(root.locator('tbody tr[data-rtc-selected="true"]')).toHaveCount(1)
    await expect(bodyRows(root).nth(1)).toHaveAttribute('data-rtc-selected', 'true')
  })

  test('click-to-select toggles from anywhere in the row', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--click-to-select')

    await bodyRows(root).first().locator('td[data-rtc-column-id="email"]').click()
    await expect(bodyRows(root).first()).toHaveAttribute('data-rtc-selected', 'true')
  })

  test('conditional selection disables ineligible rows', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--conditional-selection')

    const disabled = root.locator('tbody input[type="checkbox"]:disabled')
    await expect(disabled.first()).toBeVisible()
  })

  test('cell range selection marks the dragged cells', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--cell-selection')

    const start = bodyRows(root).nth(0).locator('td[data-rtc-column-id="firstName"]')
    const end = bodyRows(root).nth(2).locator('td[data-rtc-column-id="email"]')
    await dragTo(page, start, end)

    // 3 rows x 3 columns between firstName and email inclusive.
    await expect(root.locator('td[data-rtc-cell-selected="true"]')).toHaveCount(9)
  })

  /**
   * Dragging a range used to drag a text selection with it, which is not what
   * a spreadsheet does and makes the range hard to see.
   */
  test('dragging a range selects no text', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--cell-selection')

    await dragTo(
      page,
      bodyRows(root).nth(0).locator('td[data-rtc-column-id="firstName"]'),
      bodyRows(root).nth(2).locator('td[data-rtc-column-id="email"]'),
    )

    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')
  })

  /**
   * The range outline is drawn by an overlay, not by borders on the cells.
   * A border participates in layout, so the selected rows grew by a pixel and
   * pushed everything beside them out of line — which is what made the
   * multi-cell border look broken.
   */
  test('selecting a range does not move anything', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--cell-selection')

    const geometry = () =>
      root.evaluate((el) =>
        Array.from(el.querySelectorAll('tbody tr')).map((row) => {
          const box = row.getBoundingClientRect()
          return `${Math.round(box.height)}@${Math.round(box.top)}`
        }),
      )

    const before = await geometry()
    await dragTo(
      page,
      bodyRows(root).nth(1).locator('td[data-rtc-column-id="lastName"]'),
      bodyRows(root).nth(3).locator('td[data-rtc-column-id="city"]'),
    )
    await expect(root.locator('td[data-rtc-cell-selected="true"]').first()).toBeVisible()
    expect(await geometry()).toEqual(before)
  })
})

test.describe('columns', () => {
  test('hides a column from the visibility menu', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-visibility')

    await expect(header(root, 'city')).toBeVisible()
    await toolbarAction(root, 'toggle-columns').click()
    await openMenu(page).getByRole('menuitemcheckbox', { name: 'City' }).click()
    await expect(header(root, 'city')).toHaveCount(0)
  })

  test('the visibility menu names the generated columns', async ({ page }) => {
    const root = await openStory(page, 'datatable-15-ui-libraries--built-in-primitives')

    await toolbarAction(root, 'toggle-columns').click()
    const menu = openMenu(page)
    // The selection and row-action columns render their header through a
    // function, so there is no header string to name them by. They are named
    // from the localization instead of falling back to their internal id.
    await expect(menu.getByRole('menuitemcheckbox', { name: 'Actions' })).toBeVisible()
    await expect(menu.getByRole('menuitemcheckbox', { name: 'Select' })).toBeVisible()
    await expect(menu).not.toContainText('rtc-')
  })

  test('the column menu sorts, pins and hides', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-actions-menu')

    await header(root, 'age').getByLabel('Column actions').click()
    await openMenu(page).getByRole('menuitem', { name: /Sort by Age descending/ }).click()
    await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'descending')

    await header(root, 'age').getByLabel('Column actions').click()
    await openMenu(page).getByRole('menuitem', { name: 'Pin to start' }).click()
    await expect(header(root, 'age')).toHaveAttribute('data-rtc-pinned', 'start')

    await header(root, 'age').getByLabel('Column actions').click()
    await openMenu(page).getByRole('menuitem', { name: /Hide Age column/ }).click()
    await expect(header(root, 'age')).toHaveCount(0)
  })

  test('pinned columns are sticky with an offset', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-pinning')

    await expect(header(root, 'firstName')).toHaveAttribute('data-rtc-pinned', 'start')
    await expect(header(root, 'metric-12')).toHaveAttribute('data-rtc-pinned', 'end')
    await expect(header(root, 'firstName')).toHaveCSS('position', 'sticky')
    await expect(header(root, 'firstName')).toHaveAttribute('data-rtc-pin-edge', 'true')
  })

  test('dragging a header reorders the columns', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-ordering')

    const order = async () =>
      root.locator('thead th').evaluateAll((cells) =>
        cells.map((cell) => cell.getAttribute('data-rtc-column-id')),
      )
    const before = await order()
    expect(before.slice(0, 2)).toEqual(['firstName', 'lastName'])

    await dragTo(page, header(root, 'firstName').locator('.rtc-drag-handle'), header(root, 'email'))

    await expect.poll(async () => (await order())[0]).not.toBe('firstName')
  })

  test('resizing widens a column', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-resizing')
    const cell = header(root, 'firstName')

    const before = (await cell.boundingBox())!.width
    const resizer = cell.locator('.rtc-resizer')
    const box = (await resizer.boundingBox())!

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()

    await expect.poll(async () => (await cell.boundingBox())!.width).toBeGreaterThan(before + 40)
  })

  test('the resize grip responds to arrow keys', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-resizing')
    const cell = header(root, 'firstName')

    const before = (await cell.boundingBox())!.width
    await cell.locator('.rtc-resizer').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    await expect.poll(async () => (await cell.boundingBox())!.width).toBeGreaterThan(before)
  })

  /**
   * The surplus width of a table wider than its columns belongs to the data
   * columns. Before, the browser spread it over every column in proportion to
   * their widths, which stretched a 44px checkbox column to 82px and doubled
   * the row-actions column — space taken from the columns holding the data.
   *
   * Asserted per layout mode, because each mode distributes the surplus its
   * own way: the auto table algorithm in `semantic`, `flex-grow` in `grid`,
   * and not at all in `grid-no-grow`.
   */
  test('utility columns do not absorb the surplus width', async ({ page }) => {
    await openStory(page, 'datatable-06-columns--surplus-width')

    const modes = ['semantic', 'grid', 'grid-no-grow'] as const
    for (const [index, mode] of modes.entries()) {
      const root = page.locator('.rtc-root').nth(index)
      await expect(root).toHaveAttribute('data-rtc-layout', mode)

      const widthOf = async (columnId: string) =>
        (await header(root, columnId).boundingBox())!.width

      // Their declared sizes are 44, 40, 56 and 72; the expand and actions
      // columns are also held open by their own headers. None of them is
      // anywhere near a data column's share.
      expect(await widthOf('rtc-select')).toBeLessThan(64)
      expect(await widthOf('rtc-expand')).toBeLessThan(72)
      expect(await widthOf('rtc-row-number')).toBeLessThan(76)
      expect(await widthOf('rtc-row-actions')).toBeLessThan(100)

      // And the surplus really was there to be taken: every mode but
      // `grid-no-grow` fills the container, and the email column — declared at
      // 260 — is what grew.
      const email = await widthOf('email')
      if (mode === 'grid-no-grow') {
        expect(email).toBeLessThan(280)
      } else {
        expect(email).toBeGreaterThan(300)
      }
    }
  })

  /**
   * A column declared narrower than its own header is widened to fit it, and
   * the label is drawn in full.
   */
  test('a column is never narrower than its header', async ({ page }) => {
    await openStory(page, 'datatable-06-columns--header-content-fit')
    const root = page.locator('.rtc-root').first()

    // Declared at 140px, against headers that need half again as much.
    for (const columnId of ['firstName', 'department', 'email']) {
      expect((await header(root, columnId).boundingBox())!.width).toBeGreaterThan(130)
      expect(await headerLabelIsTruncated(root, columnId)).toBe(false)
    }

    // The floor reaches the body too, or the header would be the only row that
    // grew — each row is its own flex container in the grid layout modes.
    for (const columnId of ['firstName', 'department', 'email']) {
      const head = (await header(root, columnId).boundingBox())!.width
      const body = (await root
        .locator(`tbody td[data-rtc-column-id="${columnId}"]`)
        .first()
        .boundingBox())!.width
      expect(Math.abs(head - body)).toBeLessThan(2)
    }

    expect(await headerLabelOverlaps(root)).toEqual([])
  })

  /**
   * `enableHeaderContentFit={false}` gives the declared width back, and the
   * label has to give way — by truncating. What it must never do is keep its
   * full width and paint across the filter and column-actions buttons beside
   * it, which is what a label with `overflow: visible` would do.
   */
  test('a header label truncates rather than running under the header buttons', async ({
    page,
  }) => {
    await openStory(page, 'datatable-06-columns--header-content-fit')
    const root = page.locator('.rtc-root').nth(1)

    for (const columnId of ['firstName', 'department', 'email']) {
      expect((await header(root, columnId).boundingBox())!.width).toBeLessThan(150)
      expect(await headerLabelIsTruncated(root, columnId)).toBe(true)
    }

    expect(await headerLabelOverlaps(root)).toEqual([])
  })

  test('header groups span their children', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--header-groups')

    await expect(root.locator('thead tr')).toHaveCount(2)
    await expect(root.locator('thead th', { hasText: 'Identity' }).first()).toHaveAttribute(
      'colspan',
      '3',
    )
  })

  test('column footers render', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-footers')
    await expect(root.locator('tfoot')).toContainText('Total:')
  })
})

test.describe('grouping and aggregation', () => {
  test('grouping collapses rows into group rows', async ({ page }) => {
    const root = await openStory(page, 'datatable-07-grouping-aggregation--grouping')

    const groupCells = root.locator('td[data-rtc-grouped="true"]')
    await expect(groupCells.first()).toBeVisible()
    // Five departments in the fixture.
    await expect(groupCells).toHaveCount(5)
  })

  test('expanding a group reveals its rows', async ({ page }) => {
    const root = await openStory(page, 'datatable-07-grouping-aggregation--grouping')

    const before = await bodyRows(root).count()
    // The chevron lives in the expand column, not in the grouped cell.
    await bodyRows(root).first().locator('.rtc-expand-button').click()
    await expect.poll(() => bodyRows(root).count()).toBeGreaterThan(before)
  })

  test('aggregation summarises each group', async ({ page }) => {
    const root = await openStory(page, 'datatable-07-grouping-aggregation--aggregation')
    await expect(root.locator('tbody').getByText(/^Σ /).first()).toBeVisible()
    await expect(root.locator('tbody').getByText(/^x̄ /).first()).toBeVisible()
  })

  test('a grouping chip removes its grouping', async ({ page }) => {
    const root = await openStory(page, 'datatable-07-grouping-aggregation--grouping-chips')

    const chip = root.locator('[data-rtc-group-chip="department"]')
    await expect(chip).toBeVisible()
    await chip.getByRole('button').click()
    await expect(chip).toHaveCount(0)
    await expect(root.locator('td[data-rtc-grouped="true"]')).toHaveCount(0)
  })

  test.describe('grouped column modes', () => {
    const story = 'datatable-07-grouping-aggregation--grouped-column-modes'
    /** The story renders one table per mode, in this order. */
    const table = (page: Page, index: number) => page.locator('.rtc-root').nth(index)

    test('reorder moves the grouped column in front of the expand column', async ({ page }) => {
      await openStory(page, story)
      const columnIds = await headerColumnIds(table(page, 0))
      expect(columnIds.slice(0, 2)).toEqual(['department', 'rtc-expand'])
    })

    test('remove folds the grouped column into the expand column', async ({ page }) => {
      await openStory(page, story)
      const root = table(page, 1)

      const columnIds = await headerColumnIds(root)
      expect(columnIds).not.toContain('department')
      expect(columnIds[0]).toBe('rtc-expand')
      // The expand column takes over the grouped column's header and values.
      await expect(header(root, 'rtc-expand')).toContainText('Department')
      const groupCell = root.locator('td[data-rtc-column-id="rtc-expand"]').first()
      await expect(groupCell).toHaveAttribute('data-rtc-grouped', 'true')
      await expect(groupCell).toContainText('Design')
      await expect(groupCell).toContainText('(6)')
    })

    test('false leaves the column order alone', async ({ page }) => {
      await openStory(page, story)
      const columnIds = await headerColumnIds(table(page, 2))
      expect(columnIds[0]).toBe('rtc-expand')
      expect(columnIds.indexOf('department')).toBeGreaterThan(columnIds.indexOf('email'))
    })

    test('grouping alone makes group rows expandable', async ({ page }) => {
      await openStory(page, story)
      // No table in this story sets `enableExpanding`.
      const root = table(page, 1)
      const before = await bodyRows(root).count()
      await bodyRows(root).first().locator('.rtc-expand-button').click()
      await expect.poll(() => bodyRows(root).count()).toBeGreaterThan(before)
    })
  })
})

test.describe('expanding', () => {
  test('a sub-row tree expands', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--sub-rows')

    await expect(bodyRows(root)).toHaveCount(3)
    await bodyRows(root).first().locator('.rtc-expand-button').click()
    await expect(bodyRows(root)).toHaveCount(6)
  })

  test('expand all opens every branch', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--expand-all')

    await root.locator('thead .rtc-expand-button').click()
    await expect.poll(() => bodyRows(root).count()).toBeGreaterThan(3)
  })

  test('a detail panel opens beneath its row', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--detail-panel')

    await expect(root.locator('.rtc-detail-row')).toHaveCount(0)
    await bodyRows(root).first().locator('.rtc-expand-button').click()
    await expect(root.locator('.rtc-detail-row')).toHaveCount(1)
    await expect(root.locator('.rtc-detail-row')).toContainText('@example.com')
  })

  /**
   * `initialState.expanded` used to be discarded during the mount render:
   * TanStack's expanded auto-reset fires the first time the grouped row model
   * computes and restores `table.initialState`, which the table did not pass
   * through. The tree collapsed back to its roots before anything painted.
   */
  test('expanded: true opens the whole tree on first paint', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--expanded-by-default')

    // Three roots, three children each, and a third level under the first.
    await expect.poll(() => rowIds(root)).toEqual([
      'p1', 'p4', 'p13', 'p5', 'p14', 'p6', 'p15',
      'p2', 'p7', 'p8', 'p9',
      'p3', 'p10', 'p11', 'p12',
    ])
    await expect(root.locator('tbody tr[data-rtc-depth="2"]')).toHaveCount(3)
    await expect(root.locator('thead .rtc-expand-slot')).toHaveAttribute('data-rtc-expanded', 'true')
  })

  test('an initially expanded tree collapses back to its roots', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--expanded-by-default')
    await expect(bodyRows(root)).toHaveCount(15)

    await root.locator('thead .rtc-expand-button').click()
    await expect.poll(() => rowIds(root)).toEqual(['p1', 'p2', 'p3'])
  })

  /** Collapsing one branch must not disturb — or re-open — the others. */
  test('an initially expanded branch collapses on its own', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--expanded-by-default')
    await expect(bodyRows(root)).toHaveCount(15)

    await bodyRows(root).first().locator('.rtc-expand-button').click()
    await expect.poll(() => rowIds(root)).toEqual([
      'p1',
      'p2', 'p7', 'p8', 'p9',
      'p3', 'p10', 'p11', 'p12',
    ])
  })

  test('a row-id map opens only the branches it names', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--some-rows-expanded-by-default')

    await expect.poll(() => rowIds(root)).toEqual(['p1', 'p4', 'p13', 'p5', 'p6', 'p2', 'p3'])
  })

  test('expanded rows stay on the page their parent is on', async ({ page }) => {
    const root = await openStory(page, 'datatable-08-expanding--expanding-with-pagination')

    // `paginateExpandedRows={false}`, so the page holds two *root* rows and
    // every descendant they bring with them.
    await expect.poll(() => rowIds(root)).toEqual([
      'p1', 'p4', 'p13', 'p5', 'p14', 'p6', 'p15',
      'p2', 'p7', 'p8', 'p9',
    ])
  })

  test('sub-row selection starts from an expanded tree', async ({ page }) => {
    const root = await openStory(page, 'datatable-05-selection--sub-row-selection')

    await expect(bodyRows(root)).toHaveCount(15)
    await bodyRows(root).first().getByLabel('Toggle select row').check()
    await expect(root.locator('tbody tr[data-rtc-selected="true"]')).toHaveCount(7)
  })
})

test.describe('rows', () => {
  test('row numbers follow the display order', async ({ page }) => {
    const root = await openStory(page, 'datatable-09-rows--row-numbers')
    const first = root.locator('.rtc-root').first()
    const table = first.or(root)

    await expect(table.locator('td[data-rtc-column-id="rtc-row-number"]').first()).toHaveText('1')
  })

  test('the row action menu opens', async ({ page }) => {
    const root = await openStory(page, 'datatable-09-rows--row-action-menu')

    await bodyRows(root).first().getByLabel('Row actions').click()
    await expect(openMenu(page).getByRole('menuitem', { name: 'Duplicate' })).toBeVisible()
  })

  test('pinned rows are sticky', async ({ page }) => {
    const root = await openStory(page, 'datatable-09-rows--row-pinning-sticky')

    const pinned = root.locator('tr[data-rtc-row-pinned="top"]')
    await expect(pinned).toHaveCount(1)
    await expect(pinned).toHaveCSS('position', 'sticky')
  })

  test('the row drag handle reorders with the keyboard', async ({ page }) => {
    const root = await openStory(page, 'datatable-09-rows--row-ordering')

    const firstEmail = (await columnText(root, 'email'))[0]
    await bodyRows(root).first().locator('.rtc-drag-handle').focus()
    await page.keyboard.press('ArrowDown')

    await expect.poll(async () => (await columnText(root, 'email'))[1]).toBe(firstEmail)
  })

  // Row ordering used to be direction-dependent: `reorder` was handed the drop
  // target's index *after* the dragged row had been spliced out, so a downward
  // drag landed one position too low — below the row it was dropped on, while
  // an upward drag landed above it. These pin down both directions and both
  // halves of the target row.
  test.describe('row ordering', () => {
    const story = 'datatable-09-rows--row-ordering'
    const handle = (root: Locator, index: number) =>
      bodyRows(root).nth(index).locator('.rtc-drag-handle')

    test('starts in data order', async ({ page }) => {
      const root = await openStory(page, story)
      expect(await rowIds(root)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'])
    })

    test('dragging down onto the top half lands above the target', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 0), bodyRows(root).nth(3), { edge: 'before' })

      await expect
        .poll(async () => (await rowIds(root)).slice(0, 5))
        .toEqual(['p2', 'p3', 'p1', 'p4', 'p5'])
    })

    test('dragging down onto the bottom half lands below the target', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 0), bodyRows(root).nth(3), { edge: 'after' })

      await expect
        .poll(async () => (await rowIds(root)).slice(0, 5))
        .toEqual(['p2', 'p3', 'p4', 'p1', 'p5'])
    })

    test('dragging up onto the top half lands above the target', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 4), bodyRows(root).nth(1), { edge: 'before' })

      await expect
        .poll(async () => (await rowIds(root)).slice(0, 5))
        .toEqual(['p1', 'p5', 'p2', 'p3', 'p4'])
    })

    test('dragging up onto the bottom half lands below the target', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 4), bodyRows(root).nth(1), { edge: 'after' })

      await expect
        .poll(async () => (await rowIds(root)).slice(0, 5))
        .toEqual(['p1', 'p2', 'p5', 'p3', 'p4'])
    })

    test('the bottom half of the last row moves a row to the end', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 0), bodyRows(root).nth(9), { edge: 'after' })

      await expect
        .poll(async () => (await rowIds(root)).slice(-2))
        .toEqual(['p10', 'p1'])
    })

    test('successive drags compose', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 0), bodyRows(root).nth(2), { edge: 'after' })
      await expect
        .poll(async () => (await rowIds(root)).slice(0, 4))
        .toEqual(['p2', 'p3', 'p1', 'p4'])

      // p1 now renders third; drag it back to the very top.
      await dragTo(page, handle(root, 2), bodyRows(root).nth(0), { edge: 'before' })
      await expect
        .poll(async () => (await rowIds(root)).slice(0, 4))
        .toEqual(['p1', 'p2', 'p3', 'p4'])
    })

    test('the drop indicator marks the edge the row will land on', async ({ page }) => {
      const root = await openStory(page, story)

      const source = (await handle(root, 0).boundingBox())!
      const target = (await bodyRows(root).nth(3).boundingBox())!
      const x = target.x + target.width / 2

      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
      await page.mouse.down()

      await page.mouse.move(x, target.y + target.height * 0.25, { steps: 8 })
      await expect(bodyRows(root).nth(3)).toHaveAttribute('data-rtc-drop-edge', 'before')

      await page.mouse.move(x, target.y + target.height * 0.75)
      await expect(bodyRows(root).nth(3)).toHaveAttribute('data-rtc-drop-edge', 'after')

      await page.mouse.up()

      // Released on the bottom half, so the row lands below the target — the
      // side the indicator was drawn on.
      await expect
        .poll(async () => (await rowIds(root)).slice(0, 4))
        .toEqual(['p2', 'p3', 'p4', 'p1'])
    })

    test('dropping a row back on its own edge changes nothing', async ({ page }) => {
      const root = await openStory(page, story)

      await dragTo(page, handle(root, 1), bodyRows(root).nth(2), { edge: 'before' })

      await expect
        .poll(async () => (await rowIds(root)).slice(0, 4))
        .toEqual(['p1', 'p2', 'p3', 'p4'])
    })
  })
})

test.describe('editing', () => {
  test('cell editing commits on blur', async ({ page }) => {
    const root = await openStory(page, 'datatable-10-editing--cell-editing')
    const cell = bodyRows(root).first().locator('td[data-rtc-column-id="firstName"]')

    await cell.dblclick()
    const input = cell.locator('input')
    await expect(input).toBeFocused()
    await input.fill('Zaphod')
    await input.blur()

    await expect(cell).toHaveText('Zaphod')
  })

  test('cell editing reverts on Escape', async ({ page }) => {
    const root = await openStory(page, 'datatable-10-editing--cell-editing')
    const cell = bodyRows(root).first().locator('td[data-rtc-column-id="firstName"]')

    const original = await cell.innerText()
    await cell.dblclick()
    await cell.locator('input').fill('Discarded')
    await page.keyboard.press('Escape')

    await expect(cell).toHaveText(original)
  })

  test('row editing saves the whole row', async ({ page }) => {
    const root = await openStory(page, 'datatable-10-editing--row-editing')
    const row = bodyRows(root).first()

    await row.getByLabel('Edit').click()
    await row.locator('td[data-rtc-column-id="firstName"] input').fill('Trillian')
    await row.getByLabel('Save').click()

    await expect(row.locator('td[data-rtc-column-id="firstName"]')).toHaveText('Trillian')
  })

  test('row editing can be cancelled', async ({ page }) => {
    const root = await openStory(page, 'datatable-10-editing--row-editing')
    const row = bodyRows(root).first()
    const original = await row.locator('td[data-rtc-column-id="firstName"]').innerText()

    await row.getByLabel('Edit').click()
    await row.locator('td[data-rtc-column-id="firstName"] input').fill('Nope')
    await row.getByLabel('Cancel').click()

    await expect(row.locator('td[data-rtc-column-id="firstName"]')).toHaveText(original)
  })

  test('table editing renders every cell as an input', async ({ page }) => {
    const root = await openStory(page, 'datatable-10-editing--table-editing')
    await expect(bodyRows(root).first().locator('input, select')).not.toHaveCount(0)
  })

  test('modal editing saves from the dialog', async ({ page }) => {
    const root = await openStory(page, 'datatable-10-editing--modal-editing')
    const row = bodyRows(root).first()

    await row.getByLabel('Edit').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.locator('input').first().fill('Ford')
    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(dialog).toHaveCount(0)
    await expect(row.locator('td[data-rtc-column-id="firstName"]')).toHaveText('Ford')
  })
})

test.describe('virtualization', () => {
  test('mounts only a window of rows and updates on scroll', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--row-virtualization')

    const rows = bodyRows(root)
    await expect(rows.first()).toBeVisible()

    const mounted = await rows.count()
    expect(mounted).toBeGreaterThan(0)
    // 10,000 rows in the story; only a fraction may be in the DOM.
    expect(mounted).toBeLessThan(200)

    const firstBefore = await rows.first().getAttribute('data-rtc-row-id')
    await root.locator('.rtc-container').evaluate((element) => {
      element.scrollTop = 4000
    })

    await expect
      .poll(async () => bodyRows(root).first().getAttribute('data-rtc-row-id'))
      .not.toBe(firstBefore)
  })

  /**
   * Virtualization switches the layout to `grid` without the caller naming it,
   * and the header has to be sized for the mode the table actually renders in.
   * It was not: the header cells were laid out as if this were a semantic
   * table, whose columns the browser widens to fit their headers, while the
   * table rendered as a grid, whose columns take the floor that is measured for
   * them — and no floor was ever measured. Every column stayed at its declared
   * `size` and the labels ran under the filter and column-actions buttons.
   */
  test('a virtualized table sizes its headers like the grid it renders as', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--virtualized-with-features')
    await expect(root).toHaveAttribute('data-rtc-layout', 'grid')

    // Declared at 140 and 100, against headers carrying a label, a funnel and
    // a column menu.
    await expect
      .poll(async () => (await header(root, 'firstName').boundingBox())!.width)
      .toBeGreaterThan(140)
    await expect
      .poll(async () => (await header(root, 'active').boundingBox())!.width)
      .toBeGreaterThan(100)

    expect(await headerLabelOverlaps(root)).toEqual([])
    expect(await headerLabelIsTruncated(root, 'firstName')).toBe(false)
  })

  test('mounts only a window of columns and updates on horizontal scroll', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--column-virtualization')
    await expect(root).toHaveAttribute('data-rtc-column-virtual', 'true')

    /**
     * Header and body ids in one round trip.
     *
     * They have to be read together: the header and the body always render the
     * same window, but a column arriving from off-screen is measured as it
     * lands, and that can move the window between two separate reads.
     */
    const columnsInView = () =>
      root.evaluate((element) => {
        const ids = (scope: Element | null, selector: string) =>
          [...(scope?.querySelectorAll(selector) ?? [])].map((cell) =>
            cell.getAttribute('data-rtc-column-id'),
          )
        return {
          head: ids(element.querySelector('thead tr:last-child'), 'th[data-rtc-column-id]'),
          body: ids(element.querySelector('tbody tr[data-rtc-row-id]'), 'td'),
        }
      })

    // 202 columns in the story, and the rows are deliberately not virtualized:
    // the two axes are independent options.
    const mounted = await columnsInView()
    expect(mounted.head.length).toBeGreaterThan(2)
    expect(mounted.head.length).toBeLessThan(40)
    expect(mounted.body).toEqual(mounted.head)
    expect(await bodyRows(root).count()).toBe(50)

    await root.locator('.rtc-container').evaluate((element) => {
      element.scrollLeft = 8000
    })

    await expect.poll(async () => (await columnsInView()).head[0]).not.toBe(mounted.head[0])
    // The body follows the header, cell for cell.
    const scrolled = await columnsInView()
    expect(scrolled.body).toEqual(scrolled.head)
  })

  test('column virtualization is declined for a grouped header', async ({ page }) => {
    // A window is a range of leaf columns, and a header spanning several of
    // them cannot be given a width when only some are rendered — so the table
    // renders all of its columns rather than something misaligned.
    const root = await openStory(page, 'datatable-11-virtualization--grouped-headers')
    await expect(root).not.toHaveAttribute('data-rtc-column-virtual', 'true')

    // Every column is there, and the rows are still a window.
    expect(await headerColumnIds(root)).toEqual([
      'firstName',
      'lastName',
      'email',
      'department',
      'startDate',
      'salary',
    ])
    expect(await bodyRows(root).count()).toBeLessThan(200)
  })

  /**
   * The mounted columns that are actually on screen, once they have stopped
   * moving.
   *
   * Two things a test driving the mouse has to know. A window reaches past
   * both edges of the viewport by its overscan, so a column's position in the
   * mounted list says nothing about whether a pointer can reach it — the ones
   * at either end are deliberately outside it. And a column arriving from
   * off-screen has its header floor measured as it lands, which can nudge the
   * window once more, so the aim has to be taken after that has settled.
   */
  async function visibleColumns(root: Locator): Promise<string[]> {
    const read = () =>
      root.evaluate((element) => {
        const viewport = element.querySelector('.rtc-container')!.getBoundingClientRect()
        return [...element.querySelectorAll('thead tr:last-child th[data-rtc-column-id]')]
          .filter((cell) => {
            const box = cell.getBoundingClientRect()
            return box.left >= viewport.left && box.right <= viewport.right
          })
          .map((cell) => cell.getAttribute('data-rtc-column-id')!)
      })

    let previous: string[] = []
    await expect
      .poll(async () => {
        const current = await read()
        const settled = current.length > 0 && current.join() === previous.join()
        previous = current
        return settled
      })
      .toBe(true)
    return previous
  }

  test('a column dragged inside the window keeps hold of the pointer', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--column-virtualization')
    await root.locator('.rtc-container').evaluate((element) => {
      element.scrollLeft = 5000
    })
    await expect.poll(async () => (await headerColumnIds(root))[0]).not.toBe('rtc-expand')

    // Both ends of the drag have to be on screen: there is no auto-scroll, and
    // a window cannot be dragged past itself.
    const ids = await visibleColumns(root)
    expect(ids.length).toBeGreaterThan(4)
    const from = ids[0]!
    const to = ids[3]!

    await dragTo(page, header(root, from).locator('.rtc-drag-handle'), header(root, to))

    // Three columns apart before, neighbours after. The dragged column is
    // force-mounted for exactly this: its pointer handlers live on the header,
    // which the window would otherwise be free to drop the moment the drag
    // moved off it.
    await expect
      .poll(async () => {
        const after = await headerColumnIds(root)
        const moved = after.indexOf(from)
        return moved >= 0 && Math.abs(after.indexOf(to) - moved)
      })
      .toBe(1)
  })

  test('a detail panel spans the table the window is a slice of', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--column-virtualization')
    const scroller = root.locator('.rtc-container')

    await bodyRows(root).first().locator('.rtc-expand-button').click()
    const panel = root.locator('.rtc-detail-row')
    await expect(panel).toHaveCount(1)

    await scroller.evaluate((element) => {
      element.scrollLeft = 6000
    })
    await expect.poll(async () => (await headerColumnIds(root))[0]).not.toBe('rtc-expand')

    // A panel spans every column, so it is the one row the window's padding
    // must not reach. It starts where the table starts and is as wide — while
    // the row above it, which does take the padding, holds its first cell
    // thousands of pixels further along.
    const geometry = await root.evaluate((element) => {
      const box = (node: Element | null) =>
        node ? Math.round(node.getBoundingClientRect().x) : null
      const table = element.querySelector('.rtc-table')!
      const panel = element.querySelector('.rtc-detail-row')!
      const row = element.querySelector('tbody tr[data-rtc-row-id]')!
      return {
        tableX: box(table),
        tableWidth: Math.round(table.getBoundingClientRect().width),
        panelX: box(panel),
        panelWidth: Math.round(panel.getBoundingClientRect().width),
        rowX: box(row),
        firstCellX: box(row.querySelector('td')),
      }
    })

    expect(Math.abs(geometry.panelX! - geometry.tableX!)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.panelWidth - geometry.tableWidth)).toBeLessThanOrEqual(1)
    // The padding is real, and the panel escaped it.
    expect(geometry.firstCellX! - geometry.rowX!).toBeGreaterThan(1000)
  })

  test('the window mirrors in RTL', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--right-to-left-columns')
    await expect(root).toHaveAttribute('data-rtc-column-virtual', 'true')

    const scroller = root.locator('.rtc-container')
    const viewport = (await scroller.boundingBox())!
    const pinned = header(root, 'firstName')

    // RTL puts the start edge on the right, and the container scrolls the
    // other way — the offset the browser reports for it is negative.
    const startBefore = (await pinned.boundingBox())!
    expect(Math.abs(startBefore.x + startBefore.width - (viewport.x + viewport.width))).toBeLessThan(
      2,
    )

    const mounted = await headerColumnIds(root)
    await scroller.evaluate((element) => {
      element.scrollLeft = -8000
    })
    await expect.poll(async () => (await headerColumnIds(root)).at(-1)).not.toBe(mounted.at(-1))

    const startAfter = (await pinned.boundingBox())!
    expect(Math.abs(startAfter.x - startBefore.x)).toBeLessThan(2)
  })

  /**
   * A detail panel used to be a second `<tr>` rendered inside its row's slot,
   * which the virtualizer neither positioned nor measured: the panel fell back
   * to its static position at the top of the body, painting over the first row,
   * and — being the only thing in the body's flow — pushed every row after it
   * in the DOM down by its own height.
   */
  test('an open detail panel sits under its own row and shifts nothing', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--virtualized-detail-panels')

    const rows = bodyRows(root)
    const target = rows.nth(2)
    const rowId = await target.getAttribute('data-rtc-row-id')
    const followingBefore = await rows.nth(3).boundingBox()

    await target.locator('.rtc-expand-button').click()

    const panel = root.locator(`.rtc-detail-row[data-rtc-detail-for="${rowId}"]`)
    await expect(panel).toHaveCount(1)

    const row = (await target.boundingBox())!
    const box = (await panel.boundingBox())!
    // Directly beneath its row, not at the top of the body.
    expect(Math.abs(box.y - (row.y + row.height))).toBeLessThan(2)
    // As wide as the row: `colSpan` does nothing in the grid layout that
    // virtualization switches on, so the panel's cell fills the row instead.
    expect(Math.abs(box.width - row.width)).toBeLessThan(2)

    // The row that followed has moved down by the panel's height, and by
    // nothing else: an unmeasured panel left a row-height gap of its own.
    const followingAfter = (await rows.nth(3).boundingBox())!
    expect(followingAfter.y - followingBefore!.y).toBeCloseTo(box.height, 0)

    // Scrolling the panel out of the window and back keeps it under its row.
    await root.locator('.rtc-container').evaluate((element) => {
      element.scrollTop = 3000
    })
    await expect(panel).toHaveCount(0)
    await root.locator('.rtc-container').evaluate((element) => {
      element.scrollTop = 0
    })
    await expect(panel).toHaveCount(1)
    const reopened = (await panel.boundingBox())!
    const rowAgain = (await root.locator(`tr[data-rtc-row-id="${rowId}"]`).boundingBox())!
    expect(Math.abs(reopened.y - (rowAgain.y + rowAgain.height))).toBeLessThan(2)
  })
})

test.describe('theming', () => {
  test('a preset changes the resolved custom properties', async ({ page }) => {
    const root = await openStory(page, 'datatable-12-theming--theme-switcher')
    const table = root.locator('.rtc-root').or(root).first()

    const readAccent = () =>
      table.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--rtc-color-accent').trim(),
      )

    const shadcnAccent = await readAccent()
    await page.getByTestId('theme-ant').click()
    await expect.poll(readAccent).not.toBe(shadcnAccent)
    expect(await readAccent()).toBe('#1677ff')
  })

  test('inline variable overrides apply', async ({ page }) => {
    const root = await openStory(page, 'datatable-12-theming--inline-variable-overrides')

    const radius = await root.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--rtc-radius').trim(),
    )
    expect(radius).toBe('20px')
  })

  test('dark mode swaps the surface colour', async ({ page }) => {
    const light = await openStory(page, 'datatable-01-basics--basic')
    const lightSurface = await light.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--rtc-color-surface').trim(),
    )

    const dark = await openStory(page, 'datatable-12-theming--dark-mode')
    const darkSurface = await dark.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--rtc-color-surface').trim(),
    )

    expect(darkSurface).not.toBe(lightSurface)
    expect(darkSurface).toBe('#0f172a')
  })

  test('dark mode sets the color scheme so browser chrome follows', async ({ page }) => {
    const light = await openStory(page, 'datatable-01-basics--basic')
    expect(await light.evaluate((element) => getComputedStyle(element).colorScheme)).toBe('light')

    const dark = await openStory(page, 'datatable-12-theming--dark-mode')
    expect(await dark.evaluate((element) => getComputedStyle(element).colorScheme)).toBe('dark')
  })

  /**
   * `rtc-vars` exists so a surface rendered outside the table can opt into the
   * theme. Nested inside one it must do nothing at all: a declaration on the
   * element beats one inherited from an ancestor, so the docked filter panel —
   * which carries the class for its standalone form — used to reset every
   * variable to the package defaults and ignore the `cssVars` set on the table
   * root above it. A recoloured table then had a stock-coloured panel bolted to
   * its side.
   *
   * The Mantine story is the case in point: it is the one that remaps the whole
   * surface palette *and* docks a panel.
   */
  test('a docked filter panel inherits the root variable overrides', async ({ page }) => {
    const root = await openStory(page, 'datatable-15-ui-libraries--mantine')
    const readSurface = (target: Locator) =>
      target.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--rtc-color-surface').trim(),
      )

    const surface = await readSurface(root)
    expect(surface).not.toBe('#ffffff')
    expect(await readSurface(root.locator('[data-rtc-filter-panel]'))).toBe(surface)
  })

  test('an overlay scrollbar is painted from the active theme', async ({ page }) => {
    const readMenuScrollbar = async () => {
      await toolbarAction(page.locator('.rtc-root').first(), 'toggle-columns').click()
      return openMenu(page).evaluate((element) => {
        const style = getComputedStyle(element)
        return { colorScheme: style.colorScheme, scrollbarColor: style.scrollbarColor }
      })
    }

    await openStory(page, 'datatable-01-basics--basic')
    const light = await readMenuScrollbar()

    await openStory(page, 'datatable-12-theming--dark-mode')
    const dark = await readMenuScrollbar()

    // Both halves matter: `color-scheme` is what stops the browser painting a
    // light scrollbar on a dark menu, and the thumb colour is ours.
    expect(light.colorScheme).toBe('light')
    expect(dark.colorScheme).toBe('dark')
    expect(dark.scrollbarColor).not.toBe(light.scrollbarColor)
    expect(dark.scrollbarColor).not.toBe('auto')
  })
})

test.describe('localization', () => {
  test('overridden strings are used', async ({ page }) => {
    const root = await openStory(page, 'datatable-13-localization--dutch')

    await expect(root.getByLabel('Naar volgende pagina')).toBeVisible()
    await expect(root.locator('[data-rtc-pagination]')).toContainText('van')
  })

  test('the generated columns are translated too', async ({ page }) => {
    const root = await openStory(page, 'datatable-13-localization--dutch')

    await toolbarAction(root, 'toggle-columns').click()
    const menu = openMenu(page)
    await expect(menu.getByRole('menuitemcheckbox', { name: 'Acties' })).toBeVisible()
    await expect(menu.getByRole('menuitemcheckbox', { name: 'Selecteren' })).toBeVisible()
  })
})

test.describe('state and composition', () => {
  test('an external instance drives the table', async ({ page }) => {
    const root = await openStory(page, 'datatable-14-state-composition--external-instance')

    await bodyRows(root).first().getByLabel('Toggle select row').check()
    await expect(page.getByTestId('external-count')).toHaveText('1 selected')

    await page.getByRole('button', { name: 'Reset selection' }).click()
    await expect(page.getByTestId('external-count')).toHaveText('0 selected')
  })

  test('onStateChange reports UI state too', async ({ page }) => {
    const root = await openStory(page, 'datatable-14-state-composition--observe-all-state')

    await toolbarAction(root, 'toggle-density').click()
    await expect(page.getByTestId('state-snapshot')).toContainText('"density": "compact"')
  })

  test('initialState restores a saved layout', async ({ page }) => {
    const root = await openStory(page, 'datatable-14-state-composition--restored-initial-state')

    await expect(root).toHaveAttribute('data-rtc-density', 'compact')
    await expect(header(root, 'salary')).toHaveAttribute('aria-sort', 'descending')
    await expect(header(root, 'email')).toHaveCount(0)
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('6–10 of 40')
  })

  test('the kitchen sink renders with every feature enabled', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    const root = await openStory(page, 'datatable-14-state-composition--kitchen-sink')

    await expect(bodyRows(root).first()).toBeVisible()
    await expect(root.locator('[data-rtc-global-filter]')).toBeVisible()
    await expect(root.locator('[data-rtc-filter-panel]')).toHaveCount(1)
    expect(errors).toEqual([])
  })
})

test.describe('accessibility wiring', () => {
  test('interactive controls carry accessible names', async ({ page }) => {
    const root = await openStory(page, 'datatable-14-state-composition--kitchen-sink')

    const unnamed = await root.locator('button').evaluateAll((buttons) =>
      buttons.filter(
        (button) =>
          !button.getAttribute('aria-label') &&
          !button.getAttribute('title') &&
          !button.textContent?.trim(),
      ).length,
    )
    expect(unnamed).toBe(0)
  })

  test('header cells expose scope and sort state', async ({ page }) => {
    const root = await openStory(page, 'datatable-02-sorting--basic')

    await expect(header(root, 'firstName')).toHaveAttribute('scope', 'col')
    await expect(header(root, 'firstName')).toHaveAttribute('aria-sort', 'none')
  })

  test('the menu closes on Escape and restores focus', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-actions-menu')

    const trigger = header(root, 'age').getByLabel('Column actions')
    await trigger.click()
    await expect(openMenu(page)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(openMenu(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})

/**
 * The controls that reach features which previously had state and rendering
 * but no way in.
 */
test.describe('column and row controls', () => {
  test('the sort control says what it did and what it will do', async ({ page }) => {
    const root = await openStory(page, 'datatable-02-sorting--basic')
    const sort = header(root, 'firstName').locator('.rtc-th-sort')
    // The built-in Tooltip is the native `title` on the element wrapping the
    // control, so the text is assertable without hovering. Selected by
    // structure rather than by a class of ours: the wrapper belongs to whatever
    // implements the `Tooltip` slot, and the table does not name it.
    const tip = header(root, 'firstName').locator('[title]:has(> .rtc-th-sort)')

    await expect(tip).toHaveAttribute('title', /Sort by First name ascending/)
    await sort.click()
    await expect(tip).toHaveAttribute('title', /Sorted by First name ascending/)
    await sort.click()
    await expect(tip).toHaveAttribute('title', /Sorted by First name descending/)
  })

  test('a row is pinned from its own overflow menu', async ({ page }) => {
    const root = await openStory(page, 'datatable-09-rows--row-pinning-sticky')
    const first = bodyRows(root).first()
    const target = await first.getAttribute('data-rtc-row-id')

    await first.getByRole('button', { name: 'Row actions' }).click()
    await openMenu(page).getByRole('menuitem', { name: 'Pin to top' }).click()

    await expect
      .poll(() => root.locator(`tbody tr[data-rtc-row-id="${target}"][data-rtc-row-pinned]`).count())
      .toBe(1)

    // The same entry unpins, and reads as "Unpin" while the row is pinned.
    await root
      .locator(`tbody tr[data-rtc-row-id="${target}"]`)
      .getByRole('button', { name: 'Row actions' })
      .click()
    await openMenu(page).getByRole('menuitem', { name: 'Unpin' }).click()
    await expect
      .poll(() => root.locator(`tbody tr[data-rtc-row-id="${target}"][data-rtc-row-pinned]`).count())
      .toBe(0)
  })

  test('column order and pinning can be reset from the columns menu', async ({ page }) => {
    const root = await openStory(page, 'datatable-06-columns--column-actions-menu')

    // "Unpin all" appears only once something is pinned.
    await toolbarAction(root, 'toggle-columns').click()
    await expect(openMenu(page).getByRole('menuitem', { name: 'Unpin all' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await header(root, 'firstName').locator('.rtc-column-actions-trigger').click()
    await openMenu(page).getByRole('menuitem', { name: 'Pin to start' }).click()
    await expect(header(root, 'firstName')).toHaveAttribute('data-rtc-pinned', 'start')

    await toolbarAction(root, 'toggle-columns').click()
    await openMenu(page).getByRole('menuitem', { name: 'Unpin all' }).click()
    await expect(header(root, 'firstName')).not.toHaveAttribute('data-rtc-pinned', 'start')
  })

  test('the global search mode can be changed', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--global-filter-modes')
    const trigger = root.locator('button:has([data-rtc-action="search-mode"])')

    // The mode is named on the trigger, so the active one is legible without
    // opening the menu.
    await expect(trigger).toHaveAccessibleName(/Contains$/)

    await root.locator('[data-rtc-global-filter]').fill('ma')
    await expect.poll(async () => (await rowIds(root)).length).toBeGreaterThan(0)
    const contains = await rowIds(root)

    await trigger.click()
    await openMenu(page).getByRole('menuitemcheckbox', { name: 'Starts with', exact: true }).click()
    await expect(trigger).toHaveAccessibleName(/Starts with$/)

    // Re-filtering on the mode change alone — the text is untouched between the
    // two reads — is the whole point: TanStack memoizes the filtered row model
    // on the filter state and not on the filter fn, so a mode carried in
    // `options.globalFilterFn` left the rows exactly as they were until the
    // next keystroke.
    //
    // The global filter spans every searchable column, so the assertion is
    // about the mode rather than any one column's text: a leading match is
    // strictly rarer than a match anywhere.
    await expect
      .poll(async () => {
        const startsWith = await rowIds(root)
        return (
          startsWith.length > 0 &&
          startsWith.length < contains.length &&
          startsWith.every((id) => contains.includes(id))
        )
      })
      .toBe(true)
  })

  test('a cell copies its value on click', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const root = await openStory(page, 'datatable-06-columns--click-to-copy')

    const cell = root.locator('tbody tr td[data-rtc-column-id="email"]').first()
    const expected = (await cell.innerText()).trim()
    await cell.locator('[data-rtc-copy-cell]').click()

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected)
    // The confirmation replaces the tooltip's text while it stands.
    await expect(cell.locator('[data-rtc-copy-cell]')).toHaveAttribute('data-rtc-copied', 'true')

    // A column that did not opt in stays plain text.
    await expect(
      root.locator('tbody tr td[data-rtc-column-id="firstName"] [data-rtc-copy-cell]'),
    ).toHaveCount(0)
  })
})
