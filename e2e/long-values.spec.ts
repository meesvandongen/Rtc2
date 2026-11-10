import { expect, test, type Locator, type Page } from '@playwright/test'

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

    await page.mouse.move(0, 0)
    await expect(peek).toBeHidden()
  })

  test('moving on to the next cut-short cell opens it at once', async ({ page }) => {
    const root = await openStory(page, 'datatable-19-long-values--playground')
    const peek = root.locator('.rtc-cell-peek')
    await cell(root, 'notes').hover()
    await expect(peek).toBeVisible()

    // By the mouse, not `hover()`: the title's peek opens over the title the
    // moment the pointer arrives, and `hover()` would take that for something
    // in its way and scroll the table to try again.
    const title = cell(root, 'title')
    const box = (await title.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    // Well under the delay a first peek waits for.
    await expect(peek).toHaveText(await title.innerText(), { timeout: 250 })
  })

  /** Opens the long note in row `row` of the `index`th table of the long-notes story. */
  async function openLongNote(page: Page, index: number, row = 0) {
    await page.setViewportSize({ width: 1280, height: 600 })
    await openStory(page, 'datatable-19-long-values--long-notes')
    const table = page.locator('.rtc-root').nth(index)
    await table.evaluate((element) =>
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 12),
    )
    const notes = cell(table, 'notes', row)
    const peek = table.locator('.rtc-cell-peek')
    await notes.hover()
    await expect(peek).toBeVisible()
    return { table, notes, peek }
  }

  const scrollTop = (locator: Locator) => locator.evaluate((element) => element.scrollTop)

  test('the peek is one area: the pointer can cross it, and the wheel scrolls it natively', async ({ page }) => {
    const { table, notes, peek } = await openLongNote(page, 0)
    expect(await peek.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    expect(await peek.evaluate((element) => getComputedStyle(element).overscrollBehaviorY)).toBe('auto')

    // Out of the cell and onto the part of the peek over the next column.
    const amount = (await cell(table, 'amount').boundingBox())!
    const peekBox = (await peek.boundingBox())!
    expect(peekBox.x + peekBox.width).toBeGreaterThan(amount.x + 10)
    await page.mouse.move(amount.x + 10, amount.y + amount.height / 2, { steps: 4 })
    await expect(peek).toBeVisible()
    expect(await notes.evaluate((element) => element.matches(':hover'))).toBe(false)

    // The wheel there scrolls the peek, and nothing else.
    const pageScroll = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 100)
    await expect.poll(() => scrollTop(peek)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll)

    // Off the peek altogether, it goes.
    await page.mouse.move(peekBox.x + peekBox.width + 40, peekBox.y + peekBox.height + 40)
    await expect(peek).toBeHidden()
  })

  test('when the page scrolls, the peek goes with what it covered', async ({ page }) => {
    // Whether a wheel past the end of the note chains on to the page is the
    // browser's to decide — the peek only declares `overscroll-behavior: auto`
    // — and Chromium builds differ on it for a box in the top layer. What is
    // the table's is that a scroll, however it came, puts the peek away.
    const { peek } = await openLongNote(page, 0)
    await page.evaluate(() => window.scrollBy(0, 40))
    await expect(peek).toBeHidden()
  })

  test('a wheel over a peek with nothing more to show scrolls the table', async ({ page }) => {
    // The table scrolls its rows itself, so the peek is nested in its scroll
    // container and the browser chains the wheel on to the table.
    await page.setViewportSize({ width: 1280, height: 720 })
    const root = await openStory(page, 'datatable-19-long-values--wrap-with-virtualization')
    const notes = root.locator('td[data-rtc-column-id="notes"]').first()
    const peek = root.locator('.rtc-cell-peek')
    await notes.hover()
    await expect(peek).toBeVisible()
    expect(await peek.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(false)

    const container = root.locator('.rtc-container')
    const pageScroll = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 120)
    await expect.poll(() => scrollTop(container)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll)
  })

  test('past the end of the note, the wheel scrolls the table it is in', async ({ page }) => {
    const { table, peek } = await openLongNote(page, 1)
    // Set in code, the end is a fraction of a pixel short, and the first turn
    // of the wheel goes on finishing it; it is the next that is handed on.
    await peek.evaluate((element) => (element.scrollTop = element.scrollHeight))
    const container = table.locator('.rtc-container')
    for (let turn = 0; turn < 3; turn++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(100)
    }
    await expect.poll(() => scrollTop(container)).toBeGreaterThan(0)
  })

  test('in a table that scrolls itself, the peek is in its scroll container and moves with its row', async ({ page }) => {
    const { table, notes, peek } = await openLongNote(page, 1)
    const container = table.locator('.rtc-container')
    expect(await peek.evaluate((element) => element.parentElement?.classList.contains('rtc-container'))).toBe(true)
    expect(await peek.evaluate((element) => element.matches(':popover-open'))).toBe(false)

    // Kept to what is in view: it adds nothing to the area it scrolls in.
    const before = await container.evaluate((element) => [element.scrollWidth, element.scrollHeight])
    const closed = await container.evaluate((element) => {
      const peek = element.querySelector('.rtc-cell-peek') as HTMLElement
      peek.style.display = 'none'
      const size = [element.scrollWidth, element.scrollHeight]
      peek.style.display = ''
      return size
    })
    expect(before).toEqual(closed)

    // The table scrolls; the peek goes with its cell rather than staying put.
    const offset = async () => {
      const [cellBox, peekBox] = [(await notes.boundingBox())!, (await peek.boundingBox())!]
      return Math.round(peekBox.y - cellBox.y)
    }
    const start = await offset()
    await container.evaluate((element) => (element.scrollTop = 20))
    await expect(peek).toBeVisible()
    expect(await offset()).toBe(start)
  })

  test('in a table the page scrolls, the peek is in the top layer', async ({ page }) => {
    const { peek } = await openLongNote(page, 0)
    expect(await peek.evaluate((element) => element.matches(':popover-open'))).toBe(true)
  })

  test('its text can be selected without closing it', async ({ page }) => {
    const { peek } = await openLongNote(page, 0)
    const box = (await peek.boundingBox())!
    await page.mouse.move(box.x + 16, box.y + 16)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 16, box.y + 60, { steps: 5 })
    await page.mouse.up()

    await expect(peek).toBeVisible()
    expect(await page.evaluate(() => document.getSelection()?.toString().length ?? 0)).toBeGreaterThan(10)
  })

  test('a plain click on it closes it and reaches what is underneath', async ({ page }) => {
    const { table, notes, peek } = await openLongNote(page, 0)
    const row = table.locator('tbody tr').first()

    const box = (await notes.boundingBox())!
    await page.mouse.click(box.x + 20, box.y + box.height / 2)

    await expect(peek).toBeHidden()
    // `enableClickToSelect` heard the click the peek was covering.
    await expect(row).toHaveAttribute('data-rtc-selected', 'true')
    // And resting there does not reopen it.
    await page.waitForTimeout(700)
    await expect(peek).toBeHidden()
  })

  test('a click on it reaches a control in the cell underneath', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const { table, notes, peek } = await openLongNote(page, 1)
    // The value itself, line breaks and all; the cell shows it on one line.
    const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
    const expected = squash(await notes.innerText())
    const button = (await notes.locator('[data-rtc-copy-cell]').boundingBox())!
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2)

    await expect(peek).toBeHidden()
    await expect
      .poll(async () => squash(await page.evaluate(() => navigator.clipboard.readText())))
      .toBe(expected)
    // The copy button keeps the click from the row, as it does uncovered.
    await expect(table.locator('tbody tr').first()).not.toHaveAttribute('data-rtc-selected', 'true')
  })

  test('a double-click through it still opens the cell editor', async ({ page }) => {
    const root = await openStory(
      page,
      'datatable-19-long-values--playground&args=enableEditing:!true',
    )
    const title = cell(root, 'title')
    await title.hover()
    await expect(root.locator('.rtc-cell-peek')).toBeVisible()

    const box = (await title.boundingBox())!
    await page.mouse.dblclick(box.x + 30, box.y + box.height / 2)

    await expect(title.locator('input')).toBeFocused()
  })

  test('a double-click the browser sends elsewhere is passed on to the cell', async ({ page }) => {
    // Some Chromium builds send a double-click whose first click landed on the
    // peek to what the peek and the cell have in common, which the cell never
    // hears. This sends it there on purpose, after a real click through.
    const root = await openStory(
      page,
      'datatable-19-long-values--playground&args=enableEditing:!true',
    )
    const title = cell(root, 'title')
    await title.hover()
    await expect(root.locator('.rtc-cell-peek')).toBeVisible()

    const box = (await title.boundingBox())!
    const [x, y] = [box.x + 30, box.y + box.height / 2]
    await page.mouse.click(x, y)
    await root.evaluate(
      (element, [px, py]) =>
        element.dispatchEvent(
          new MouseEvent('dblclick', { bubbles: true, detail: 2, clientX: px, clientY: py }),
        ),
      [x, y],
    )
    await expect(title.locator('input')).toBeFocused()
  })

  test('a peek near the bottom of the screen starts where its cell does', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 })
    await openStory(page, 'datatable-19-long-values--long-notes')
    const table = page.locator('.rtc-root').nth(0)
    const notes = cell(table, 'notes', 2)
    // Put the cell 200px above the bottom of the viewport.
    await notes.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, top - (window.innerHeight - 200))
    })
    await page.waitForTimeout(100)
    const peek = table.locator('.rtc-cell-peek')
    await notes.hover()
    await expect(peek).toBeVisible()

    const cellBox = (await notes.boundingBox())!
    const peekBox = (await peek.boundingBox())!
    expect(Math.abs(peekBox.y - cellBox.y)).toBeLessThanOrEqual(1)
    expect(peekBox.y + peekBox.height).toBeLessThanOrEqual(480)
    expect(await peek.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  })

  test('nothing opens under a pointer the page scrolled cells beneath', async ({ page }) => {
    // The table in the page: its peek is in the top layer, and a scroll puts
    // it away, so what the pointer is over afterwards is the next note.
    const { table, notes, peek } = await openLongNote(page, 0)
    const start = (await notes.boundingBox())!
    const [x, y] = [start.x + 30, start.y + start.height / 2]
    await page.mouse.move(x, y)

    // Slide the next long note (two rows down) under the pointer without
    // moving it, as scrolling the page past it would.
    const rows = table.locator('tbody tr')
    const offset = await rows.nth(2).evaluate(
      (row, first) => row.getBoundingClientRect().top - first!.getBoundingClientRect().top,
      await rows.nth(0).elementHandle(),
    )
    await page.evaluate((by) => window.scrollBy(0, by), offset)
    await expect(peek).toBeHidden()

    // A browser re-hovers what is now under a still pointer with pointer
    // events at the same spot. Headless Chromium does not do it after a
    // programmatic scroll, so the test sends them itself.
    const next = cell(table, 'notes', 2)
    await next.evaluate(
      (element, [px, py]) => {
        for (const type of ['pointerover', 'pointermove']) {
          element.dispatchEvent(
            new PointerEvent(type, { bubbles: true, clientX: px, clientY: py, pointerType: 'mouse' }),
          )
        }
      },
      [x, y],
    )
    await page.waitForTimeout(700)
    await expect(peek).toBeHidden()

    // The pointer moving is the reader pointing at it.
    await page.mouse.move(x + 4, y + 1)
    await expect(peek).toBeVisible()
    await expect(peek).toHaveText(await next.innerText())
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
    const clamped = cell(tables.nth(3), 'notes')
    const wrapped = cell(tables.nth(4), 'notes')

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
