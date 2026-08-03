import { expect, test } from '@playwright/test'

import { columnText, header, openStory, toolbarAction } from './helpers'

/**
 * The mobile filter drawer.
 *
 * Two things are being guarded here, and only one of them is the sheet itself:
 *
 * - Below `mobileBreakpoint` the filter surfaces have to *change shape*. A
 *   popover anchored to a funnel in a sideways-scrolling header, or a 280px
 *   pane docked beside a 390px table, both render — they are just unusable,
 *   which no assertion about a visible element notices.
 * - The switch is driven by a media query, so every assertion below is also a
 *   check that the query is live: the same story at a wide viewport must still
 *   use the popover and the docked pane.
 */

const PHONE = { width: 390, height: 780 }

/** The built-in drawer is a native modal `<dialog>`, so this is its open state. */
const SHEET = 'dialog[data-rtc-drawer][open]'

test.describe('mobile filter drawer', () => {
  test.use({ viewport: PHONE })

  test('the header funnel opens the column editor in a sheet', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--column-filter-popovers')

    await header(root, 'department').locator('.rtc-filter-trigger').click()

    const sheet = page.locator(SHEET)
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('[data-rtc-filter-drawer="department"]')).toBeVisible()
    // The sheet is the surface a popover could not be: full width, anchored to
    // the bottom edge.
    const box = (await sheet.boundingBox())!
    expect(box.width).toBeGreaterThan(PHONE.width - 2)
    expect(box.y + box.height).toBeGreaterThan(PHONE.height - 2)

    // Escape is the platform's, not ours — the point of using `<dialog>`.
    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET)).toHaveCount(0)
  })

  /**
   * The toolbar funnel appears on a phone whatever the display mode: with
   * `popover` alone the per-column buttons are off-screen the moment the table
   * scrolls sideways, which on a phone is immediately.
   */
  test('the toolbar funnel opens every column in one sheet, and filters', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--column-filter-popovers')

    expect(new Set(await columnText(root, 'department')).size).toBeGreaterThan(1)

    await toolbarAction(root, 'toggle-filters').click()
    const sheet = page.locator(SHEET)
    await expect(sheet).toBeVisible()

    const field = sheet.locator('[data-rtc-filter-field="department"]')
    await expect(field).toBeVisible()
    await field.getByLabel('Filter by Department').selectOption('Engineering')

    await expect
      .poll(async () => new Set(await columnText(root, 'department')))
      .toEqual(new Set(['Engineering']))
    // The rows behind the sheet are what the reader is filtering; the sheet
    // must not cover them entirely.
    expect((await sheet.boundingBox())!.height).toBeLessThan(PHONE.height * 0.9)

    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator(SHEET)).toHaveCount(0)
    await expect(root.locator('[data-rtc-filter-chip="department"]')).toBeVisible()
  })

  /**
   * A pane that docks beside the table becomes a sheet over it, and a sheet
   * nobody opened is just the data hidden on arrival.
   */
  test('a panel that opens by default does not take the screen on a phone', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--docked-filter-panel')

    await expect(page.locator(SHEET)).toHaveCount(0)
    await expect(root.locator('[data-rtc-filter-panel]')).toHaveCount(0)

    await toolbarAction(root, 'toggle-filters').click()
    await expect(page.locator(SHEET)).toBeVisible()
  })

  /**
   * The same rule for an *explicit* request. `initialState.showFilterPanel`
   * says "the pane starts open beside the table"; a modal over the data is a
   * different thing, and nobody asked for that one.
   */
  test('an explicitly-open panel still does not open the sheet', async ({ page }) => {
    const root = await openStory(page, 'datatable-15-ui-libraries--built-in-primitives')

    await expect(root.locator('tbody tr').first()).toBeVisible()
    await expect(page.locator(SHEET)).toHaveCount(0)
    // And the toolbar toggle is in step with it: one press opens the sheet.
    await toolbarAction(root, 'toggle-filters').click()
    await expect(page.locator(SHEET)).toBeVisible()
  })
})

test.describe('wide viewport', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  /** The other half of the switch: nothing changes above the breakpoint. */
  test('filters stay in a popover and a docked pane', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--docked-filter-panel')
    await expect(root.locator('[data-rtc-filter-panel]')).toBeVisible()

    const popovers = await openStory(page, 'datatable-03-filtering--column-filter-popovers')
    await header(popovers, 'department').locator('.rtc-filter-trigger').click()
    await expect(page.locator('[data-rtc-filter-popover]')).toBeVisible()
    await expect(page.locator(SHEET)).toHaveCount(0)
  })
})

/**
 * Crossing the breakpoint at runtime.
 *
 * The pane and the sheet share one state flag, and the conversion in one
 * direction is the dangerous one: a pane the reader left open must not turn
 * into an overlay over what they were reading. The correction happens during
 * the render that notices the switch rather than in an effect, because an
 * overlay library handed open-then-closed-in-one-tick can be left with a
 * full-screen invisible layer that eats every click — which is exactly what
 * the MUI case below caught the first time.
 */
test.describe('crossing the breakpoint', () => {
  test('an open pane does not become an open sheet', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const root = await openStory(page, 'datatable-03-filtering--docked-filter-panel')
    await expect(root.locator('[data-rtc-filter-panel]')).toBeVisible()

    await page.setViewportSize(PHONE)
    await expect(root.locator('[data-rtc-filter-panel]')).toHaveCount(0)
    await expect(page.locator(SHEET)).toHaveCount(0)

    // And the toggle is in step with that: one press, and the sheet is up.
    await toolbarAction(root, 'toggle-filters').click()
    await expect(page.locator(SHEET)).toBeVisible()
  })

  test('an adapter sheet leaves no invisible overlay behind', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const root = await openStory(page, 'datatable-15-ui-libraries--material-ui')
    await expect(root.locator('[data-rtc-filter-panel]')).toBeVisible()

    await page.setViewportSize(PHONE)
    await page.waitForTimeout(500)

    const blocking = await page.evaluate(() => {
      const node = document.elementFromPoint(195, 400)
      return node ? `${node.tagName}.${(node as HTMLElement).className}`.slice(0, 80) : 'none'
    })
    expect(blocking, 'the table is clickable, not covered').not.toMatch(/Drawer|Modal|backdrop/i)

    await toolbarAction(root, 'toggle-filters').click()
    await expect(page.locator('[data-rtc-filter-field="department"]')).toBeVisible()
  })
})
