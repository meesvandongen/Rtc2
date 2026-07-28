import { expect, test, type Locator, type Page } from '@playwright/test'

import { bodyRows, header, openStory, panelField, toolbarAction } from './helpers'

/**
 * Cross-adapter guards.
 *
 * Each of these covers a *class* of failure rather than one bug, because every
 * one of them shipped at least once:
 *
 * - An adapter that drops the props an overlay library injects onto the
 *   trigger renders a button that opens nothing. It looks correct in every
 *   screenshot and in every unit test of the adapter itself.
 * - A control from a design system with an intrinsic minimum width, or with a
 *   handle that overhangs its track, spills out of the filter panel. Only
 *   geometry catches it.
 * - A header narrow enough to truncate its own label is unreadable, and no
 *   assertion about text content notices, because the text is still there.
 * - A cell formatter that assumes a value throws on a grouped or aggregated
 *   row and takes the whole table down.
 *
 * They run against every registry adapter, so a new one has to satisfy them
 * before it can be added.
 */

const ADAPTERS = {
  'built-in': 'datatable-15-ui-libraries--built-in-primitives',
  mui: 'datatable-15-ui-libraries--material-ui',
  radix: 'datatable-15-ui-libraries--radix-shadcn',
  antd: 'datatable-15-ui-libraries--ant-design',
} as const

/**
 * Any overlay surface, whichever library rendered it.
 *
 * These are the *content* elements, not the wrappers: MUI mounts its popover
 * inside a full-viewport root, so measuring the root would report a box the
 * size of the window and quietly pass a positioning assertion.
 */
function anyOverlay(page: Page): Locator {
  return page.locator(
    [
      '.rtc-surface:popover-open',
      '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu',
      '.ant-popover:not(.ant-popover-hidden) .ant-popover-content',
      '[data-radix-popper-content-wrapper] > *',
      '.MuiPopover-paper',
    ].join(', '),
  )
}

/**
 * Elements that visually escape `box`.
 *
 * Bounding boxes alone over-report: a design system may position a decoration
 * outside its parent and clip it with `overflow: hidden` — Ant's number
 * stepper does exactly that. Only an overflow that no ancestor clips is a real
 * one.
 */
async function visualOverflow(scope: Locator): Promise<Array<{ el: string; by: number }>> {
  return scope.evaluate((root) => {
    const bounds = root.getBoundingClientRect()
    const found: Array<{ el: string; by: number }> = []

    const isClipped = (node: Element) => {
      let parent = node.parentElement
      while (parent && parent !== root) {
        const style = getComputedStyle(parent)
        if (style.overflowX !== 'visible' || style.overflowY !== 'visible') return true
        parent = parent.parentElement
      }
      return false
    }

    for (const node of root.querySelectorAll('*')) {
      const box = node.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const over = Math.max(box.right - bounds.right, bounds.left - box.left)
      if (over <= 1 || isClipped(node)) continue
      found.push({
        el: `${node.tagName.toLowerCase()}.${(node as HTMLElement).className}`.slice(0, 80),
        by: Math.round(over),
      })
    }
    return found
  })
}

for (const [adapter, storyId] of Object.entries(ADAPTERS)) {
  test.describe(`overlays: ${adapter}`, () => {
    /**
     * The trigger-props rule, from every site that relies on it. Radix's
     * `asChild`, MUI's `anchorEl` clone and Ant's child clone all deliver
     * their handlers and ref through props the adapter has to pass on; an
     * adapter that swallows them fails here and nowhere else.
     */
    test('every overlay trigger opens its surface', async ({ page }) => {
      const root = await openStory(page, storyId)

      const triggers: Array<[string, Locator]> = [
        ['header filter popover', header(root, 'department').locator('.rtc-filter-trigger')],
        ['header column menu', header(root, 'age').locator('.rtc-column-actions-trigger')],
        [
          // The one that was broken: the operator picker inside the panel is
          // a `Button`, not an `IconButton`, and only `IconButton` happened to
          // forward its props.
          'panel filter operator menu',
          panelField(root, 'department')
            .locator('.rtc-filter-condition-header button')
            .first(),
        ],
        ['toolbar column visibility', toolbarAction(root, 'toggle-columns')],
      ]

      for (const [name, trigger] of triggers) {
        await expect(trigger, name).toBeVisible()
        await trigger.click()
        await expect(anyOverlay(page).first(), name).toBeVisible()
        // Escape, not an outside click: dismissal is part of the contract, and
        // a library that only closes on click-away is a keyboard trap.
        await page.keyboard.press('Escape')
        await expect(anyOverlay(page), `${name} closes on Escape`).toHaveCount(0, {
          timeout: 5_000,
        })
      }
    })

    /** An overlay that opens at the viewport origin is the "no ref" symptom. */
    test('an opened overlay is positioned near its trigger', async ({ page }) => {
      const root = await openStory(page, storyId)

      const trigger = header(root, 'department').locator('.rtc-filter-trigger')
      await trigger.click()
      const surface = anyOverlay(page).first()
      await expect(surface).toBeVisible()

      const anchor = (await trigger.boundingBox())!
      const box = (await surface.boundingBox())!
      expect(box.width).toBeGreaterThan(0)
      // Generous: libraries flip and clamp against the viewport. This only
      // has to reject "rendered at 0,0 because there was nothing to measure".
      expect(Math.abs(box.x - anchor.x)).toBeLessThan(400)
      expect(Math.abs(box.y - anchor.y)).toBeLessThan(400)
    })

    test('no filter control overflows its field', async ({ page }) => {
      const root = await openStory(page, storyId)
      const panel = root.locator('[data-rtc-filter-panel]')
      await expect(panel).toBeVisible()

      const fields = panel.locator('[data-rtc-filter-field]')
      const count = await fields.count()
      expect(count).toBeGreaterThan(0)

      for (let index = 0; index < count; index += 1) {
        const field = fields.nth(index)
        const id = await field.getAttribute('data-rtc-filter-field')
        expect(await visualOverflow(field), `${adapter} / ${id}`).toEqual([])
      }

      // And the panel itself must not scroll sideways.
      const metrics = await panel.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }))
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
    })

    test('no header label is truncated', async ({ page }) => {
      const root = await openStory(page, storyId)
      // Let the header-fit pass settle before measuring.
      await expect
        .poll(async () =>
          root.locator('thead th[data-rtc-column-id]').evaluateAll((cells) =>
            cells
              .map((cell) => {
                const label = cell.querySelector('.rtc-th-label')
                return {
                  id: (cell as HTMLElement).dataset.rtcColumnId,
                  clipped: label ? label.scrollWidth - label.clientWidth : 0,
                }
              })
              .filter((entry) => entry.clipped > 1),
          ),
        )
        .toEqual([])
    })
  })
}

test.describe('native popover semantics', () => {
  /**
   * The built-in overlays are `[popover]` elements rendered inline rather than
   * portalled, so a menu opened from inside a popover is a real DOM descendant
   * of it. That is what makes the platform treat the pair as nested instead of
   * light-dismissing the parent — the behaviour a hand-rolled overlay stack
   * used to have to fake.
   */
  test('a menu opened inside a popover does not dismiss it', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--filter-modes')

    await header(root, 'firstName').locator('.rtc-filter-trigger').click()
    const popover = page.locator('[data-rtc-filter-popover]')
    await expect(popover).toBeVisible()

    await popover.locator('.rtc-filter-condition-header button').first().click()
    await expect(page.locator('.rtc-menu[role="menu"]:popover-open')).toBeVisible()
    await expect(popover, 'the popover survives its own nested menu').toBeVisible()
  })

  test('Escape peels one layer at a time', async ({ page }) => {
    const root = await openStory(page, 'datatable-03-filtering--filter-modes')

    await header(root, 'firstName').locator('.rtc-filter-trigger').click()
    const popover = page.locator('[data-rtc-filter-popover]')
    await popover.locator('.rtc-filter-condition-header button').first().click()
    await expect(page.locator('.rtc-menu[role="menu"]:popover-open')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('.rtc-menu[role="menu"]:popover-open')).toHaveCount(0)
    await expect(popover).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
  })

  /**
   * The reason for the top layer: the header sits inside a scroll container
   * with `overflow: auto`, which clips anything positioned normally.
   */
  test('a popover is not clipped by the table scroll container', async ({ page }) => {
    const root = await openStory(page, 'datatable-11-virtualization--virtualized-with-features')

    await header(root, 'department').locator('.rtc-filter-trigger').click()
    const popover = page.locator('[data-rtc-filter-popover]')
    await expect(popover).toBeVisible()

    const box = (await popover.boundingBox())!
    const container = (await root.locator('.rtc-container').first().boundingBox())!
    // Fully rendered, and free to extend past the container it was opened in.
    expect(box.height).toBeGreaterThan(40)
    expect(box.y + box.height).toBeGreaterThan(container.y)
  })

  /** A closed surface must not linger in the accessibility tree. */
  test('closed overlays expose no role or name', async ({ page }) => {
    const root = await openStory(page, 'datatable-01-basics--basic')

    const phantom = await root.evaluate(
      (el) =>
        Array.from(el.querySelectorAll('.rtc-surface'))
          .filter((node) => !node.matches(':popover-open'))
          .filter((node) => node.hasAttribute('role') || node.hasAttribute('aria-label')).length,
    )
    expect(phantom).toBe(0)
  })
})

/**
 * Every story must render.
 *
 * A cell formatter is handed a different value on a grouped or aggregated row
 * — often none at all — and one that assumes otherwise throws through React
 * and blanks the table. That failure is invisible to any test that does not
 * happen to open the story it broke, so this opens all of them.
 */
test.describe('story smoke', () => {
  // Every story in the catalogue, one page load each.
  test.setTimeout(600_000)

  test('no story throws while rendering', async ({ page }) => {
    const index = await page.request.get('/index.json')
    expect(index.ok()).toBe(true)
    const entries = Object.values(
      ((await index.json()) as { entries: Record<string, { id: string; type: string }> }).entries,
    ).filter((entry) => entry.type === 'story')
    expect(entries.length).toBeGreaterThan(50)

    const broken: string[] = []
    for (const entry of entries) {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      // Not `networkidle`: the MSW-backed stories keep a worker connection
      // open, so it never settles.
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`, { waitUntil: 'load' })
      await page
        .locator('#storybook-root > *')
        .first()
        .waitFor({ state: 'attached', timeout: 15_000 })
        .catch(() => undefined)
      // Storybook keeps its error pane in the document at all times and
      // reveals it with a class on `<body>`; testing for the element itself
      // reports every story as broken.
      const crashed = await page.evaluate(
        () =>
          Number(document.body.classList.contains('sb-show-errordisplay')) +
          Number((document.querySelector('#storybook-root')?.childElementCount ?? 0) === 0),
      )
      page.removeAllListeners('pageerror')
      if (errors.length > 0 || crashed > 0) broken.push(`${entry.id}: ${errors[0] ?? 'render error'}`)
    }
    expect(broken).toEqual([])
  })
})
