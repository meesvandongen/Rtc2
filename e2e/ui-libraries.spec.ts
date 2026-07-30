import { expect, test, type Locator, type Page } from '@playwright/test'

import { bodyRows, columnText, header, openStory, panelField } from './helpers'

/**
 * The component registry, verified against each adapter.
 *
 * The point of these tests is that the *same* interactions work regardless of
 * which library backs the controls — if an adapter satisfies the contract, the
 * table behaves identically. Each library renders different DOM, so the
 * assertions go through accessible names and the table's own data attributes
 * rather than library-specific class names.
 */

const STORIES = {
  'built-in': 'datatable-15-ui-libraries--built-in-primitives',
  mui: 'datatable-15-ui-libraries--material-ui',
  radix: 'datatable-15-ui-libraries--radix-shadcn',
  antd: 'datatable-15-ui-libraries--ant-design',
} as const

type LibraryName = keyof typeof STORIES

/** Every adapter's menu must expose real menu semantics. */
async function openColumnMenu(root: Locator, page: Page, columnId: string) {
  await header(root, columnId).getByRole('button', { name: /Column actions/ }).click()
  const item = page.getByRole('menuitem', { name: /Sort by/ }).first()
  await expect(item).toBeVisible()
  return item
}

for (const [library, storyId] of Object.entries(STORIES) as Array<[LibraryName, string]>) {
  test.describe(`registry adapter: ${library}`, () => {
    test('renders the table with the adapter installed', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))

      const root = await openStory(page, storyId)

      await expect(bodyRows(root).first()).toBeVisible()
      await expect(header(root, 'firstName')).toContainText('First name')
      expect(errors).toEqual([])
    })

    test('sorting still works through the adapter', async ({ page }) => {
      const root = await openStory(page, storyId)
      const cell = header(root, 'age')

      await cell.locator('.rtc-th-sort').click()
      await expect(cell).toHaveAttribute('aria-sort', 'ascending')

      const ages = (await columnText(root, 'age')).map(Number)
      expect(ages).toEqual([...ages].sort((a, b) => a - b))
    })

    test('the column menu opens and applies an action', async ({ page }) => {
      const root = await openStory(page, storyId)

      await openColumnMenu(root, page, 'age')
      await page.getByRole('menuitem', { name: /Sort by Age descending/ }).click()

      await expect(header(root, 'age')).toHaveAttribute('aria-sort', 'descending')
    })

    test('row selection works through the adapter checkbox', async ({ page }) => {
      const root = await openStory(page, storyId)

      await bodyRows(root).first().getByLabel('Toggle select row').click()
      await expect(bodyRows(root).first()).toHaveAttribute('data-rtc-selected', 'true')
      await expect(root.locator('[data-rtc-selection-summary]')).toContainText('1 of')
    })

    test('the filter popover opens and filters', async ({ page }) => {
      const root = await openStory(page, storyId)

      await header(root, 'department').locator('.rtc-filter-trigger').click()
      const popover = page.locator('[data-rtc-filter-popover="department"]')
      await expect(popover).toBeVisible()

      // Ant renders a listbox rather than a native <select>, so branch here.
      if (library === 'antd') {
        await popover.locator('.ant-select').click()
        await page.locator('.ant-select-item-option', { hasText: 'Engineering' }).first().click()
      } else {
        await popover.getByLabel('Filter by Department').selectOption('Engineering')
      }

      await expect.poll(async () => new Set(await columnText(root, 'department'))).toEqual(
        new Set(['Engineering']),
      )
    })

    test('the docked filter panel renders its editors', async ({ page }) => {
      const root = await openStory(page, storyId)

      const panel = root.locator('[data-rtc-filter-panel]')
      await expect(panel).toBeVisible()
      await expect(panel.locator('[data-rtc-filter-field]').first()).toBeVisible()
    })

    test('the modal editor opens through the adapter dialog', async ({ page }) => {
      const root = await openStory(page, storyId)

      await bodyRows(root).first().getByRole('button', { name: 'Edit' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('the global search input is wired up', async ({ page }) => {
      const root = await openStory(page, storyId)

      await root.locator('[data-rtc-global-filter]').fill('Lisbon')
      await expect.poll(async () => new Set(await columnText(root, 'city'))).toEqual(
        new Set(['Lisbon']),
      )
    })

    /**
     * The slider must not re-filter the table once per pointer move.
     *
     * This is a crash guard, not a performance preference. React counts a
     * commit that ends with sync-, continuous- or default-lane work already
     * queued as a *nested* update and throws "Maximum update depth exceeded"
     * (error 185) on the fifty-first in an unbroken row. One applied filter
     * takes three commits to settle here, only the last of which empties the
     * queue, so a drag that re-filters per move can keep the count climbing —
     * observed throwing at move 759 with pagination disabled.
     *
     * The assertion counts filter applications rather than waiting for the
     * throw: the throw needs an unbroken run of 51 and is therefore timing
     * dependent, while the per-move re-filtering that feeds it is not.
     */
    test('the range slider does not re-filter the table on every move', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))

      const root = await openStory(page, storyId)
      const slider = panelField(root, 'salary').getByRole('slider').first()
      await slider.scrollIntoViewIfNeeded()

      const box = await slider.boundingBox()
      if (!box) throw new Error('the salary slider is not visible')
      const y = box.y + box.height / 2
      const x = box.x + box.width / 2

      // The row-count summary is rewritten every time the filter is applied.
      const summary = await root.locator('[data-rtc-page-range]').innerText()
      await page.evaluate(() => {
        const target = document.querySelector('[data-rtc-page-range]')!
        const state = { count: 0 }
        ;(window as unknown as { rtcFilterApplied: typeof state }).rtcFilterApplied = state
        new MutationObserver(() => {
          state.count += 1
        }).observe(target, { childList: true, characterData: true, subtree: true })
      })

      const moves = 80
      await page.mouse.move(x, y)
      await page.mouse.down()
      for (let move = 0; move < moves; move += 1) {
        await page.mouse.move(x + 60 * Math.sin(move / 6), y)
      }

      const during = await page.evaluate(
        () => (window as unknown as { rtcFilterApplied: { count: number } }).rtcFilterApplied.count,
      )
      await page.mouse.up()

      // A handful of applications over 80 moves is the delayed commit doing its
      // job; one per move is the failure mode.
      expect(during).toBeLessThan(moves / 4)

      // And the drag still ends in an applied filter.
      await expect(root.locator('[data-rtc-page-range]')).not.toHaveText(summary)
      await expect(bodyRows(root).first()).toBeVisible()
      expect(errors).toEqual([])
    })
  })
}

test.describe('registry composition', () => {
  test('switching libraries at runtime keeps the table working', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    const root = await openStory(page, 'datatable-15-ui-libraries--side-by-side-switcher')
    await expect(bodyRows(root).first()).toBeVisible()

    for (const library of ['mui', 'radix', 'antd', 'built-in'] as const) {
      await page.getByTestId(`ui-${library}`).click()
      await expect(bodyRows(root).first()).toBeVisible()
      await expect(header(root, 'firstName')).toContainText('First name')
    }

    expect(errors).toEqual([])
  })

  test('a partial override replaces only the named component', async ({ page }) => {
    const root = await openStory(page, 'datatable-15-ui-libraries--partial-override')

    // Custom Badge, but the built-in checkbox and menu are still in place.
    await bodyRows(root).first().getByLabel('Toggle select row').click()
    await expect(bodyRows(root).first()).toHaveAttribute('data-rtc-selected', 'true')
    await expect(root.locator('.rtc-icon-button').first()).toBeVisible()
  })
})
