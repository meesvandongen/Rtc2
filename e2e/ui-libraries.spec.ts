import { expect, test, type Locator, type Page } from '@playwright/test'

import { bodyRows, columnText, header, openStory } from './helpers'

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
  mantine: 'datatable-15-ui-libraries--mantine',
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

      // Mantine renders a combobox rather than a native <select>, so branch here.
      if (library === 'mantine') {
        await popover.getByLabel('Filter by Department').click()
        await page.getByRole('option', { name: 'Engineering', exact: true }).first().click()
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
  })
}

test.describe('registry composition', () => {
  test('switching libraries at runtime keeps the table working', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    const root = await openStory(page, 'datatable-15-ui-libraries--side-by-side-switcher')
    await expect(bodyRows(root).first()).toBeVisible()

    for (const library of ['mui', 'radix', 'mantine', 'built-in'] as const) {
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
