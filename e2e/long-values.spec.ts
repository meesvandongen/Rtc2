import { expect, test, type Locator } from '@playwright/test'

import { header, openStory } from './helpers'

/** Whether the value inside a body cell is showing less than all of itself. */
function isTruncated(cell: Locator): Promise<boolean> {
  return cell.evaluate((element) =>
    [element.querySelector('.rtc-cell-value'), ...element.querySelectorAll('.rtc-copy-cell')].some(
      (node) =>
        !!node && (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight),
    ),
  )
}

function cell(root: Locator, columnId: string, row = 0): Locator {
  return root.locator(`tbody tr`).nth(row).locator(`td[data-rtc-column-id="${columnId}"]`)
}

test.describe('long values', () => {
  test('a cut-short cell peeks on hover, showing the whole value over the cell', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--playground')
    const notes = cell(root, 'notes')
    expect(await isTruncated(notes)).toBe(true)

    await notes.hover()
    const peek = root.locator('.rtc-cell-peek')
    await expect(peek).toBeVisible()
    await expect(peek).toHaveText(await notes.innerText())
    await expect(peek).toHaveAttribute('aria-hidden', 'true')

    // Laid over the cell it belongs to, and at least as big.
    const cellBox = (await notes.boundingBox())!
    const peekBox = (await peek.boundingBox())!
    expect(Math.abs(peekBox.x - cellBox.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(peekBox.y - cellBox.y)).toBeLessThanOrEqual(1)
    expect(peekBox.width).toBeGreaterThan(cellBox.width)

    // Takes no pointer events, so it can never cover a click meant for a cell.
    expect(await peek.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none')

    await page.mouse.move(0, 0)
    await expect(peek).toBeHidden()
  })

  test('moving on to the next cut-short cell opens it at once', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--playground')
    const peek = root.locator('.rtc-cell-peek')
    await cell(root, 'notes').hover()
    await expect(peek).toBeVisible()

    const title = cell(root, 'title')
    await title.hover()
    // Well under the delay a first peek waits for.
    await expect(peek).toHaveText(await title.innerText(), { timeout: 250 })
  })

  test('a plain peek cuts what it cannot fit, and never takes the pointer', async ({ page }) => {
    await openStory(page, 'datatable-19-long-values--comparison')
    const table = page.locator('.rtc-root').nth(2)
    await expect(table).toContainText('cellOverflowReveal="peek" ')
    // Scrolled to first: a scroll puts a peek away, pending ones included.
    await table.scrollIntoViewIfNeeded()
    await page.waitForTimeout(100)
    await cell(table, 'notes').hover()
    const peek = table.locator('.rtc-cell-peek')
    await expect(peek).toBeVisible()
    expect(await peek.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none')
    expect(await peek.evaluate((element) => (element as HTMLElement).inert)).toBe(true)
  })

  test('`peek-scroll` stays open under the pointer and scrolls on its own', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--scrollable-peek')
    const notes = cell(root, 'notes')
    const peek = root.locator('.rtc-cell-peek')

    await notes.hover()
    await expect(peek).toBeVisible()
    await expect(peek).toHaveAttribute('data-rtc-scrollable', '')
    expect(await peek.evaluate((element) => (element as HTMLElement).inert)).toBe(false)
    // Taller than it may grow, which is what it is for.
    expect(await peek.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    // Line breaks in the value survive into the peek.
    expect(await peek.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(200)

    // Onto the peek itself, away from the part covering the cell.
    const box = (await peek.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => peek.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await expect(peek).toBeVisible()
    // The table underneath did not scroll with it.
    expect(await root.locator('.rtc-container').evaluate((element) => element.scrollTop)).toBe(0)

    await page.mouse.move(0, 0)
    await expect(peek).toBeHidden()
  })

  test('its text can be selected without closing it', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--scrollable-peek')
    await cell(root, 'notes').hover()
    const peek = root.locator('.rtc-cell-peek')
    await expect(peek).toBeVisible()

    const box = (await peek.boundingBox())!
    await page.mouse.move(box.x + 16, box.y + 16)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 16, box.y + 60, { steps: 5 })
    await page.mouse.up()

    await expect(peek).toBeVisible()
    expect(await page.evaluate(() => document.getSelection()?.toString().length ?? 0)).toBeGreaterThan(10)
  })

  test('a plain click on it closes it and reaches the cell underneath', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--scrollable-peek')
    const row = root.locator('tbody tr').first()
    await cell(root, 'notes').hover()
    const peek = root.locator('.rtc-cell-peek')
    await expect(peek).toBeVisible()

    const cellBox = (await cell(root, 'notes').boundingBox())!
    await page.mouse.click(cellBox.x + 20, cellBox.y + cellBox.height / 2)

    await expect(peek).toBeHidden()
    // `enableClickToSelect` heard the click the peek was covering.
    await expect(row).toHaveAttribute('data-rtc-selected', 'true')
    // And resting there does not reopen it.
    await page.waitForTimeout(700)
    await expect(peek).toBeHidden()
  })

  test('a double-click through it still opens the cell editor', async ({ page }) => {
    const root = await openStory(
      page,
      'datatable-19-long-values--playground&args=cellOverflowReveal:peek-scroll;enableEditing:!true',
    )
    const title = cell(root, 'title')
    await expect(title).toHaveAttribute('data-rtc-reveal', 'peek-scroll')
    await title.hover()
    await expect(root.locator('.rtc-cell-peek')).toBeVisible()

    const box = (await title.boundingBox())!
    await page.mouse.dblclick(box.x + 30, box.y + box.height / 2)

    await expect(title.locator('input')).toBeFocused()
  })

  test('a value that fits never peeks', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--playground')
    const amount = cell(root, 'amount')
    expect(await isTruncated(amount)).toBe(false)

    await amount.hover()
    await page.waitForTimeout(700)
    await expect(root.locator('.rtc-cell-peek')).toBeHidden()
  })

  test('keyboard focus peeks too, and Escape puts it away', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--playground')
    const notes = cell(root, 'notes')

    await notes.focus()
    const peek = root.locator('.rtc-cell-peek')
    await expect(peek).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(peek).toBeHidden()
  })

  test('`title` sets the browser tooltip on cut-short values only', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--comparison')
    const table = page.locator('.rtc-root').nth(1)
    await expect(table).toContainText('cellOverflowReveal="title"')

    const notes = cell(table, 'notes')
    await notes.hover()
    await expect(notes.locator('.rtc-cell-value')).toHaveAttribute('title', await notes.innerText())

    const amount = cell(table, 'amount')
    await amount.hover()
    await expect(amount.locator('.rtc-cell-value')).not.toHaveAttribute('title', /.+/)
    // Never the peek as well.
    await expect(root.locator('.rtc-cell-peek')).toHaveCount(0)
  })

  test('`clamp` shows the set number of lines, `wrap` shows everything', async ({ page }) => {
    await openStory(page, 'datatable-19-long-values--comparison')
    const tables = page.locator('.rtc-root')

    const oneLine = (await cell(tables.nth(0), 'notes').boundingBox())!.height
    const clamped = cell(tables.nth(4), 'notes')
    const wrapped = cell(tables.nth(5), 'notes')

    expect((await clamped.boundingBox())!.height).toBeGreaterThan(oneLine)
    expect(await isTruncated(clamped)).toBe(true)
    expect((await wrapped.boundingBox())!.height).toBeGreaterThan((await clamped.boundingBox())!.height)
    expect(await isTruncated(wrapped)).toBe(false)
  })

  test('wrapped rows in a virtualized grid body do not overlap', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--wrap-with-virtualization')
    const rows = root.locator('tbody tr[data-index]')
    await expect(rows.first()).toBeVisible()
    const boxes = await rows.evaluateAll((nodes) =>
      nodes
        .map((node) => node.getBoundingClientRect())
        .sort((a, b) => a.top - b.top)
        .map(({ top, bottom }) => ({ top, bottom })),
    )
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index]!.top).toBeGreaterThanOrEqual(boxes[index - 1]!.bottom - 1)
    }
  })

  test('double-clicking a column edge fits the column to its content', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--fit-to-content')
    const email = header(root, 'email')
    const before = (await email.boundingBox())!.width
    expect(await isTruncated(cell(root, 'email'))).toBe(true)

    await email.locator('.rtc-resizer').dblclick()

    await expect.poll(async () => (await email.boundingBox())!.width).toBeGreaterThan(before)
    const rows = await root.locator('tbody tr').count()
    for (let row = 0; row < rows; row++) {
      expect(await isTruncated(cell(root, 'email', row))).toBe(false)
    }
  })

  test('fitting respects `maxSize`', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--fit-to-content')
    const url = header(root, 'url')
    await url.locator('.rtc-column-actions-trigger').click()
    await page.getByRole('menuitem', { name: 'Fit to content' }).click()

    // The border between columns is drawn on the cell, so it may add a pixel.
    await expect
      .poll(async () => Math.round((await url.boundingBox())!.width))
      .toBeGreaterThanOrEqual(360)
    expect(Math.round((await url.boundingBox())!.width)).toBeLessThanOrEqual(361)
  })
})
