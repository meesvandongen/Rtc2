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
  lolmath: 'datatable-15-ui-libraries--lolmath-ui',
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

      const row = bodyRows(root).first()
      // Every adapter has to give the control an accessible name, and that is
      // asserted for all of them. Clicking it is another matter: React Aria
      // puts the name on a visually hidden `<input>` sitting behind the
      // artwork the library draws, so the named element is a 1×1 clipped box
      // no pointer can reach. Its `<label>` is what a user clicks, and it
      // toggles the same input.
      const named = row.getByLabel('Toggle select row')
      await expect(named).toHaveCount(1)
      await (library === 'lolmath' ? row.locator('label').first() : named).click()

      await expect(bodyRows(root).first()).toHaveAttribute('data-rtc-selected', 'true')
      await expect(root.locator('[data-rtc-selection-summary]')).toContainText('1 of')
    })

    test('the filter popover opens and filters', async ({ page }) => {
      const root = await openStory(page, storyId)

      await header(root, 'department').locator('.rtc-filter-trigger').click()
      const popover = page.locator('[data-rtc-filter-popover="department"]')
      await expect(popover).toBeVisible()

      // Mantine and lolmath render a combobox rather than a native <select>,
      // so branch here. They differ again in what carries the accessible name:
      // Mantine names the input, React Aria names the button that opens the
      // listbox and folds the current value into that name.
      if (library === 'mantine') {
        await popover.getByLabel('Filter by Department').click()
        await page.getByRole('option', { name: 'Engineering', exact: true }).first().click()
      } else if (library === 'lolmath') {
        await popover.getByRole('button', { name: /Filter by Department/ }).click()
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

    /**
     * A design system is free to give the table a transparent header — shadcn's
     * is — but the header is sticky, and a transparent sticky header shows the
     * rows scrolling behind it, which reads as two rows printed on top of each
     * other. The header colour is therefore painted over the table surface
     * rather than instead of it, and what that guarantees is this: whatever the
     * theme, a header cell ends up opaque.
     */
    test('the sticky header is opaque, whatever the theme paints on it', async ({ page }) => {
      const root = await openStory(page, storyId)
      await root.locator('.rtc-container').first().evaluate((el) => el.scrollTo(0, 200))

      const alpha = await header(root, 'firstName').evaluate((cell) => {
        const colour = getComputedStyle(cell).backgroundColor
        const parts = colour.match(/[\d.]+/g) ?? []
        return parts.length > 3 ? Number(parts[3]) : 1
      })
      expect(alpha).toBe(1)
    })

    /**
     * Toolbar buttons are icon-only and should be square. They stopped being
     * square once — an SVG is an inline box, so it sat on a text baseline and
     * inherited the line height of whatever font size the library's button
     * used; MUI's 1.5rem turned a 16px glyph into a 51px-tall button.
     */
    test('toolbar icon buttons are square', async ({ page }) => {
      const root = await openStory(page, storyId)

      const button = root.locator(
        '[data-rtc-toolbar="top"] button:has([data-rtc-action="toggle-columns"])',
      )
      const box = (await button.boundingBox())!

      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(2)
      expect(box.height).toBeLessThanOrEqual(40)
    })
  })
}

test.describe('registry composition', () => {
  test('switching libraries at runtime keeps the table working', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    const root = await openStory(page, 'datatable-15-ui-libraries--side-by-side-switcher')
    await expect(bodyRows(root).first()).toBeVisible()

    for (const library of ['mui', 'radix', 'mantine', 'lolmath', 'built-in'] as const) {
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
