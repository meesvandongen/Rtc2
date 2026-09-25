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

  test('`peek-wheel` scrolls under the wheel over its own cell, and stays click-through', async ({ page }) => {
    await openStory(page, 'datatable-19-long-values--peek-interaction')
    const table = page.locator('.rtc-root').nth(1)
    await expect(table).toContainText('cellOverflowReveal="peek-wheel"')
    await table.scrollIntoViewIfNeeded()
    const notes = cell(table, 'notes')
    const peek = table.locator('.rtc-cell-peek')

    await notes.hover()
    await expect(peek).toBeVisible()
    expect(await peek.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none')
    expect(await peek.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)

    const pageScroll = await page.evaluate(() => window.scrollY)
    const box = (await notes.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 120)
    await expect.poll(() => peek.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await expect(peek).toBeVisible()
    // The wheel went to the peek, not the page.
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll)

    // The cell beside it is under the peek, and is still what the pointer finds.
    const amount = cell(table, 'amount')
    const amountBox = (await amount.boundingBox())!
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.closest('td')?.dataset.rtcColumnId,
      [amountBox.x + 10, amountBox.y + amountBox.height / 2],
    )
    expect(hit).toBe('amount')
    await amount.hover()
    await expect(peek).toBeHidden()
  })

  test('`peek-wheel` gives the wheel back once the value has been read to the end', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 })
    await openStory(page, 'datatable-19-long-values--peek-interaction')
    const table = page.locator('.rtc-root').nth(1)
    await table.scrollIntoViewIfNeeded()
    const notes = cell(table, 'notes')
    const peek = table.locator('.rtc-cell-peek')
    await notes.hover()
    await expect(peek).toBeVisible()
    await peek.evaluate((element) => (element.scrollTop = element.scrollHeight))

    const pageScroll = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 120)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(pageScroll)
    await expect(peek).toBeHidden()
  })

  test('a scrolling peek near the bottom starts where its cell does', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 })
    await openStory(page, 'datatable-19-long-values--peek-interaction')
    const table = page.locator('.rtc-root').nth(1)
    const notes = cell(table, 'notes')
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

  test('`outlined` and `glass` are told where the cell is inside the peek', async ({ page }) => {
    await openStory(page, 'datatable-19-long-values--peek-appearance')
    for (const [index, appearance] of [[0, 'solid'], [1, 'outlined'], [2, 'glass']] as const) {
      const table = page.locator('.rtc-root').nth(index)
      await table.scrollIntoViewIfNeeded()
      await page.mouse.move(0, 0)
      const notes = cell(table, 'notes')
      const peek = table.locator('.rtc-cell-peek')
      await notes.hover()
      await expect(peek).toBeVisible()
      await expect(peek).toHaveAttribute('data-rtc-peek-appearance', appearance)

      const cellBox = (await notes.boundingBox())!
      const peekBox = (await peek.boundingBox())!
      const bounds = await peek.evaluate((element) => {
        const style = (element as HTMLElement).style
        return ['x', 'y', 'w', 'h'].map((key) => parseFloat(style.getPropertyValue(`--rtc-peek-cell-${key}`)))
      })
      expect(bounds[0]).toBeCloseTo(cellBox.x - peekBox.x, 0)
      expect(bounds[1]).toBeCloseTo(cellBox.y - peekBox.y, 0)
      expect(bounds[2]).toBeCloseTo(cellBox.width, 0)
      expect(bounds[3]).toBeCloseTo(cellBox.height, 0)
    }
  })

  /**
   * Opens the long note in row `row` of the `index`th table of the overscroll
   * story, with the pointer resting on it.
   */
  async function openOverscrollPeek(page: import('@playwright/test').Page, index: number, row = 0) {
    // Short enough that the note overflows its peek wherever the table sits:
    // a peek with room for the whole note has nothing to scroll.
    await page.setViewportSize({ width: 1280, height: 500 })
    await openStory(page, 'datatable-19-long-values--peek-overscroll')
    const table = page.locator('.rtc-root').nth(index)
    await table.scrollIntoViewIfNeeded()
    const notes = cell(table, 'notes', row)
    const peek = table.locator('.rtc-cell-peek')
    const container = table.locator('.rtc-container')
    await notes.hover()
    await expect(peek).toBeVisible()
    const box = (await notes.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    expect(await peek.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    return { table, notes, peek, container }
  }

  /** One flick: wheel events close enough together to be one gesture. */
  async function flick(page: import('@playwright/test').Page, events = 10) {
    for (let index = 0; index < events; index++) {
      await page.mouse.wheel(0, 150)
      await page.waitForTimeout(16)
    }
  }

  const scrollTop = (locator: import('@playwright/test').Locator) =>
    locator.evaluate((element) => element.scrollTop)
  const atEnd = (locator: import('@playwright/test').Locator) =>
    locator.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1)

  test('`chain` carries the rest of a flick on into the table', async ({ page }) => {
    const { peek, container } = await openOverscrollPeek(page, 0)
    await flick(page)
    await expect.poll(() => scrollTop(container)).toBeGreaterThan(0)
    await expect(peek).toBeHidden()
  })

  test('`contain` never passes the wheel on, and marks the edge', async ({ page }) => {
    const { peek, container } = await openOverscrollPeek(page, 1)
    await flick(page)
    expect(await atEnd(peek)).toBe(true)
    await expect(peek).toHaveAttribute('data-rtc-peek-edge', 'end')
    expect(await scrollTop(container)).toBe(0)

    // A second flick, after a pause: still held.
    await page.waitForTimeout(500)
    await flick(page, 3)
    await expect(peek).toBeVisible()
    expect(await scrollTop(container)).toBe(0)
  })

  test('`latch` keeps a flick in the peek, and gives the next one to the table', async ({ page }) => {
    const { peek, container } = await openOverscrollPeek(page, 2)
    await flick(page)
    expect(await atEnd(peek)).toBe(true)
    await expect(peek).toHaveAttribute('data-rtc-peek-edge', 'end')
    expect(await scrollTop(container)).toBe(0)
    await expect(peek).toBeVisible()

    await page.waitForTimeout(500)
    await flick(page, 3)
    await expect.poll(() => scrollTop(container)).toBeGreaterThan(0)
    await expect(peek).toBeHidden()
  })

  test('a peek the table slid under a still pointer does not catch the wheel', async ({ page }) => {
    const { table, notes, peek, container } = await openOverscrollPeek(page, 2)
    const start = (await notes.boundingBox())!
    const [pointerX, pointerY] = [start.x + start.width / 2, start.y + start.height / 2]
    // Slide the next long note (two rows down) under the pointer without
    // moving it, as scrolling the table past it would.
    const rows = table.locator('tbody tr')
    const offset = await rows.nth(2).evaluate(
      (row, first) => row.getBoundingClientRect().top - first!.getBoundingClientRect().top,
      await rows.nth(0).elementHandle(),
    )
    await container.evaluate((element, by) => (element.scrollTop = by), offset)
    await expect(peek).toBeHidden()

    // A browser re-hovers what is now under a still pointer with pointer
    // events at the same spot. Headless Chromium does not do it after a
    // programmatic scroll, so the test sends them itself.
    const box = (await cell(table, 'notes', 2).boundingBox())!
    await cell(table, 'notes', 2).evaluate(
      (element, [x, y]) => {
        for (const type of ['pointerover', 'pointermove']) {
          element.dispatchEvent(
            new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse' }),
          )
        }
      },
      [pointerX, pointerY],
    )
    expect(Math.abs(box.y + box.height / 2 - pointerY)).toBeLessThan(box.height / 2)
    await expect(peek).toBeVisible()

    const before = await scrollTop(container)
    await page.waitForTimeout(400)
    await page.mouse.wheel(0, 100)
    await expect.poll(() => scrollTop(container)).toBeGreaterThan(before)
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
