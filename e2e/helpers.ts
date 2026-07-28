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

/** A toolbar control by its `data-rtc-action` marker. */
export function toolbarAction(root: Locator, action: string): Locator {
  return root.locator(`[data-rtc-action="${action}"]`)
}

/** The portalled menu currently open. Menus render into `document.body`. */
export function openMenu(page: Page): Locator {
  return page.locator('.rtc-menu[role="menu"]')
}

/** Drives a pointer-based drag from one element to another. */
export async function dragTo(page: Page, source: Locator, target: Locator): Promise<void> {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('drag source or target is not visible')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // Two intermediate moves: the first starts the drag, the second lets the
  // component's `elementFromPoint` hit-test settle on the target.
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2)
  await page.mouse.up()
}
