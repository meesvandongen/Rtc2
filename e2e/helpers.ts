import { expect, type Locator, type Page } from '@playwright/test'

/** One entry of Storybook's catalogue: a story, or a documentation page. */
export interface IndexEntry {
  id: string
  type: string
  title: string
  tags?: string[]
}

/**
 * Everything Storybook publishes, read from the built site.
 *
 * Tests that have to cover the whole catalogue derive their list from here so
 * that a story or documentation page added later is included automatically.
 */
export async function catalogueEntries(page: Page): Promise<IndexEntry[]> {
  const index = await page.request.get('/index.json')
  expect(index.ok()).toBe(true)
  const { entries } = (await index.json()) as { entries: Record<string, IndexEntry> }
  return Object.values(entries)
}

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

/**
 * Every place a header label overlaps one of the header's own buttons.
 *
 * A header cell lays out a label and up to three controls in one flex row, and
 * the label is the item that yields when they do not all fit — by truncating,
 * never by painting across them. Buttons related to the label by containment
 * are excluded: the sort button wraps the label, and the header standing in for
 * removed grouped columns puts the expand-all button inside it, so in both
 * cases the two boxes legitimately intersect.
 *
 * Returns a description per overlap, so a failure names the column.
 */
export async function headerLabelOverlaps(root: Locator): Promise<string[]> {
  return root.evaluate((element) => {
    const found: string[] = []
    for (const cell of Array.from(element.querySelectorAll('thead .rtc-th'))) {
      const label = cell.querySelector('.rtc-th-label')
      if (!label || !label.textContent?.trim()) continue
      const labelBox = label.getBoundingClientRect()
      if (labelBox.width === 0) continue
      for (const button of Array.from(cell.querySelectorAll('button'))) {
        if (button.contains(label) || label.contains(button)) continue
        const box = button.getBoundingClientRect()
        if (box.width === 0) continue
        const x = Math.min(labelBox.right, box.right) - Math.max(labelBox.left, box.left)
        const y = Math.min(labelBox.bottom, box.bottom) - Math.max(labelBox.top, box.top)
        if (x > 0.5 && y > 0.5) {
          const id = (cell as HTMLElement).dataset.rtcColumnId
          found.push(`${id}: "${label.textContent}" overlaps .${button.className} by ${x}px`)
        }
      }
    }
    return found
  })
}

/** Whether a column's header label is drawn truncated. */
export function headerLabelIsTruncated(root: Locator, columnId: string): Promise<boolean> {
  return header(root, columnId)
    .locator('.rtc-th-label')
    .evaluate((label) => label.scrollWidth > label.clientWidth + 1)
}

/** Ids of the leaf header cells, left to right. */
export async function headerColumnIds(root: Locator): Promise<string[]> {
  return root
    .locator('thead tr')
    .last()
    .locator('th')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-rtc-column-id') ?? ''))
}

/** Body rows, excluding detail-panel rows. */
export function bodyRows(root: Locator): Locator {
  return root.locator('tbody tr[data-rtc-row-id]')
}

/**
 * Row ids in render order — the cheapest way to assert an exact row order.
 *
 * Comparing the whole sequence catches an expanded tree that came out in the
 * wrong order or lost a level, which a row count alone lets through.
 */
export function rowIds(root: Locator): Promise<string[]> {
  return bodyRows(root).evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-rtc-row-id') ?? ''),
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
