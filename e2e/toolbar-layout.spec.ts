import { expect, test, type Locator, type Page } from '@playwright/test'

import { emptyToolbars, openStory } from './helpers'

/** One of the tables in a gallery story, by the order it is rendered in. */
function table(page: Page, index: number): Locator {
  return page.locator('.rtc-root').nth(index)
}

/** What a region holds, as the ids of the occupants the toolbar gives ids to. */
async function regionItems(root: Locator, bar: string, region: string): Promise<string[]> {
  return root
    .locator(`[data-rtc-toolbar="${bar}"] [data-rtc-region="${region}"]`)
    .evaluate((node) => {
      const named: Array<[string, string]> = [
        ['search', '.rtc-search'],
        ['pagination', '[data-rtc-pagination]'],
        ['filter-chips', '[data-rtc-active-filters]'],
        ['selection-summary', '[data-rtc-selection-summary]'],
        ['grouping-chips', '[data-rtc-grouping-zone]'],
        ['search-toggle', '[data-rtc-action="toggle-search"]'],
        ['filter-toggle', '[data-rtc-action="toggle-filters"]'],
        ['column-visibility', '[data-rtc-action="toggle-columns"]'],
        ['density-toggle', '[data-rtc-action="toggle-density"]'],
        ['fullscreen-toggle', '[data-rtc-action="toggle-fullscreen"]'],
      ]
      return named.filter(([, selector]) => node.querySelector(selector)).map(([id]) => id)
    })
}

const LAYOUT_STORY = 'datatable-01-basics--toolbar-layout'

test.describe('toolbar layout', () => {
  /**
   * What a table draws when nobody configures a layout: exactly what the
   * toolbar drew before layouts existed, since every region is unwritten and
   * every region therefore inherits.
   */
  test('the default arrangement is unchanged', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    const root = table(page, 0)

    // No funnel: with filters in a popover on a wide viewport there is no
    // panel for it to open, which is a decision of the flags, not the layout.
    expect(await regionItems(root, 'top', 'end')).toEqual([
      'search',
      'column-visibility',
      'density-toggle',
      'fullscreen-toggle',
    ])
    expect(await regionItems(root, 'bottom', 'end')).toEqual(['pagination'])
    await expect(root.locator('[data-rtc-toolbar="top"] [data-rtc-region="start"]')).toHaveCount(0)
  })

  /** A written region is what it says; an unwritten one is untouched. */
  test('writing one region leaves the others alone', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    const root = table(page, 1)

    expect(await regionItems(root, 'top', 'start')).toEqual(['search'])
    expect(await regionItems(root, 'top', 'end')).toEqual([
      'column-visibility',
      'density-toggle',
      'fullscreen-toggle',
    ])
  })

  /**
   * Removal, with no verb of its own: the region names two icons, so the
   * density and full-screen toggles that a flag still has switched on are not
   * drawn.
   */
  test('a region leaves out what it does not name', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    const root = table(page, 2)

    expect(await regionItems(root, 'top', 'end')).toEqual([
      'search',
      'filter-toggle',
      'column-visibility',
    ])
    // The bar it was not told about is untouched.
    expect(await regionItems(root, 'bottom', 'end')).toEqual(['pagination'])
  })

  /**
   * Naming pagination in the top bar gives up its seat in the bottom one,
   * which is the whole of what `paginationPosition="top"` used to say — and
   * the emptied bar goes rather than staying behind as a sliver.
   */
  test('pagination named in the top bar leaves the bottom bar empty', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    const root = table(page, 3)

    expect(await regionItems(root, 'top', 'center')).toEqual(['pagination'])
    await expect(root.locator('[data-rtc-toolbar="bottom"]')).toHaveCount(0)
  })

  /** A second row is an array, and a first row that writes no region inherits every one. */
  test('a row of its own for the filter chips', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    const root = table(page, 4)
    const rows = root.locator('[data-rtc-toolbar="top"] .rtc-toolbar-row')

    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0).locator('.rtc-search')).toHaveCount(1)
    await expect(rows.nth(1).locator('[data-rtc-active-filters]')).toHaveCount(1)
    // The chip row is below the search row, not beside it.
    const [first, second] = await Promise.all([rows.nth(0).boundingBox(), rows.nth(1).boundingBox()])
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1)
  })

  /** A cluster stays a cluster wherever it is put, at its own gap. */
  test('the icon actions keep their cluster in the other bar', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    const root = table(page, 5)
    const group = root.locator('[data-rtc-toolbar="bottom"] .rtc-toolbar-group')

    await expect(group).toHaveCount(1)
    await expect(group.locator('button')).toHaveCount(3)
    expect(await regionItems(root, 'top', 'end')).toEqual(['search'])
    expect(await regionItems(root, 'bottom', 'start')).toEqual([
      'column-visibility',
      'density-toggle',
      'fullscreen-toggle',
    ])
  })

  /** No arrangement leaves a bar, a row or a region behind with nothing in it. */
  test('no arrangement draws an empty bar', async ({ page }) => {
    await openStory(page, LAYOUT_STORY)
    for (const index of [0, 1, 2, 3, 4, 5]) {
      expect(await emptyToolbars(table(page, index))).toEqual([])
    }
  })

  /**
   * The ids the deprecated slots used to fill keep the places they had, which
   * is what makes migrating one of them the key and nothing else.
   */
  test('a registered top-actions item lands where the slot did', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--custom-toolbar-slots')

    await expect(
      root.locator('[data-rtc-toolbar="top"] [data-rtc-region="start"] [data-testid="bulk-action"]'),
    ).toHaveCount(1)
    await expect(
      root.locator('[data-rtc-toolbar="bottom"] [data-rtc-region="start"]'),
    ).toContainText('Updated just now')
  })

  /**
   * Content of a consumer's own, placed by id rather than appended to the one
   * point its slot is written at.
   */
  test('toolbarItems go where the layout puts them', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--toolbar-items')

    await expect(
      root.locator('[data-rtc-toolbar="top"] [data-rtc-region="start"]'),
    ).toContainText('Team')

    const bottomEnd = root.locator('[data-rtc-toolbar="bottom"] [data-rtc-region="end"]')
    await expect(bottomEnd.locator('button', { hasText: 'Export' })).toHaveCount(1)
    // Past the pagination, because the layout named it after it.
    const [pagination, button] = await Promise.all([
      bottomEnd.locator('[data-rtc-pagination]').boundingBox(),
      bottomEnd.locator('button', { hasText: 'Export' }).boundingBox(),
    ])
    expect(button!.x).toBeGreaterThan(pagination!.x)
  })
})
