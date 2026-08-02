import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Opens a story in Storybook's isolated iframe and waits for the table to
 * render. Using `iframe.html` avoids the manager UI entirely, which keeps the
 * tests focused on the component and stops Storybook chrome from stealing
 * clicks or focus.
 */
export async function openStory(page: Page, storyId: string): Promise<Locator> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  const root = page.locator('.rtc-root').first()
  await expect(root).toBeVisible()
  return root
}

/** Text of every cell in the given body column, top to bottom. */
export async function columnText(root: Locator, columnId: string): Promise<string[]> {
  return root.locator(`tbody tr td[data-rtc-column-id="${columnId}"]`).allInnerTexts()
}

/** The header cell for a column id. */
export function header(root: Locator, columnId: string): Locator {
  return root.locator(`thead th[data-rtc-column-id="${columnId}"]`).first()
}

/** Body rows, excluding detail-panel rows. */
export function bodyRows(root: Locator): Locator {
  return root.locator('tbody tr[data-rtc-row-id]')
}

/** Row ids in render order — the cheapest way to assert an exact row order. */
export async function rowIds(root: Locator): Promise<Array<string | null>> {
  return bodyRows(root).evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-rtc-row-id')),
  )
}

/**
 * A toolbar control by its `data-rtc-action` marker.
 *
 * The marker sits on a span inside the button because the button itself now
 * comes from the component registry and cannot take arbitrary attributes.
 */
export function toolbarAction(root: Locator, action: string): Locator {
  return root.locator(`button:has([data-rtc-action="${action}"])`)
}

/**
 * The menu currently open.
 *
 * Built-in overlays are native popovers: the surface stays in the DOM while
 * closed (so the trigger's `popovertarget` has a stable target) and only enters
 * the top layer when shown, so the selector has to ask for `:popover-open`
 * rather than mere presence.
 */
export function openMenu(page: Page): Locator {
  return page.locator('.rtc-menu[role="menu"]:popover-open')
}

/** The filter popover currently open. */
export function filterPopover(page: Page): Locator {
  return page.locator('[data-rtc-filter-popover]')
}

/** Opens a column's filter popover from its header. */
export async function openColumnFilter(
  root: Locator,
  page: Page,
  columnId: string,
): Promise<Locator> {
  await header(root, columnId).locator('.rtc-filter-trigger').click()
  const popover = filterPopover(page)
  await expect(popover).toBeVisible()
  return popover
}

/** A field in the docked or standalone filter panel. */
export function panelField(root: Locator, columnId: string): Locator {
  return root.locator(`[data-rtc-filter-field="${columnId}"]`)
}

/**
 * Drives a pointer-based drag from one element to another.
 *
 * `edge` picks the half of the target to release over, which is what decides
 * whether the dragged item lands before or after it. The midpoint itself is
 * the boundary between the two halves, so an edge-sensitive test has to aim at
 * a quarter point rather than the centre.
 */
export async function dragTo(
  page: Page,
  source: Locator,
  target: Locator,
  options: { edge?: 'before' | 'after' } = {},
): Promise<void> {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('drag source or target is not visible')

  const fraction = options.edge === 'before' ? 0.25 : options.edge === 'after' ? 0.75 : 0.5
  const x = to.x + to.width / 2
  const y = to.y + to.height * fraction

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // Two intermediate moves: the first starts the drag, the second lets the
  // component's `elementFromPoint` hit-test settle on the target.
  await page.mouse.move(x, y, { steps: 12 })
  await page.mouse.move(x, y)
  await page.mouse.up()
}
