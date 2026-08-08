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
  mantine: 'datatable-15-ui-libraries--mantine',
  lolmath: 'datatable-15-ui-libraries--lolmath-ui',
} as const

/**
 * Any overlay surface, whichever library rendered it.
 *
 * These are the *content* elements, not the wrappers: MUI mounts its popover
 * inside a full-viewport root, so measuring the root would report a box the
 * size of the window and quietly pass a positioning assertion.
 *
 * `:visible` is not decoration. Mantine builds its combobox on the same
 * `Popover` and leaves the dropdown mounted while closed, so every `Select` in
 * the docked filter panel contributes a hidden `.mantine-Popover-dropdown` to
 * the page. Without the filter, `.first()` resolves to one of those and every
 * assertion about the overlay a trigger just opened reads the wrong element.
 */
function anyOverlay(page: Page): Locator {
  return page.locator(
    [
      '.rtc-surface:popover-open',
      '.mantine-Popover-dropdown:visible',
      '.mantine-Menu-dropdown:visible',
      '[data-radix-popper-content-wrapper] > *',
      '.MuiPopover-paper',
      // React Aria unmounts a closed popover, so lolmath's surfaces need no
      // `:visible` filter — but they also replace React Aria's default class
      // with their own hashed one, so the adapter tags them itself.
      '.lol-popover',
    ].join(', '),
  )
}

/**
 * Elements that visually escape `box`.
 *
 * Bounding boxes alone over-report: a design system may position a decoration
 * outside its parent and clip it with `overflow: hidden` — a number input's
 * stepper typically does exactly that. Only an overflow that no ancestor clips
 * is a real one.
 *
 * The other over-report is an element clipped to nothing by *itself*. React
 * Aria parks a real `<select>` next to its combobox so browser autofill and
 * form submission still work, in a container the visually-hidden idiom shrinks
 * to a point — and one absolutely positioned against the viewport, so its box
 * lands wherever the page starts. It is not on screen and is not an overflow.
 */
async function visualOverflow(scope: Locator): Promise<Array<{ el: string; by: number }>> {
  return scope.evaluate((root) => {
    const bounds = root.getBoundingClientRect()
    const found: Array<{ el: string; by: number }> = []

    const isHidden = (node: Element) => {
      const style = getComputedStyle(node)
      return style.clipPath === 'inset(50%)' || style.clip === 'rect(0px, 0px, 0px, 0px)'
    }

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
      if (over <= 1 || isHidden(node) || isClipped(node)) continue
      found.push({
        el: `${node.tagName.toLowerCase()}.${(node as HTMLElement).className}`.slice(0, 80),
        by: Math.round(over),
      })
    }
    return found
  })
}

/**
 * Headers whose content does not fit the cell.
 *
 * Measures the cell, not just the label: a header also holds a sort control, a
 * filter funnel and a column menu, and the cell overflowing is the same defect
 * whichever part of it is cut off.
 */
function headerOverflow(root: Element): string[] {
  const out: string[] = []
  for (const cell of root.querySelectorAll<HTMLElement>('thead th')) {
    const label = cell.querySelector('.rtc-th-label')
    const over = Math.max(
      label ? label.scrollWidth - label.clientWidth : 0,
      cell.scrollWidth - cell.clientWidth,
    )
    if (over > 1) out.push(`${cell.dataset.rtcColumnId ?? '?'} +${Math.round(over)}px`)
  }
  return out
}

/**
 * The largest gap between a leaf header and the body cell below it.
 *
 * Any floor applied to a header has to reach the rest of its column, or the
 * fix for truncation becomes a worse bug than the truncation.
 */
function columnMisalignment(root: Element): number {
  const rows = root.querySelectorAll('thead tr')
  const headers = (rows[rows.length - 1] ?? root).querySelectorAll('th[data-rtc-column-id]')
  const cells = root.querySelectorAll('tbody tr:first-child td[data-rtc-column-id]')
  let worst = 0
  headers.forEach((header, index) => {
    const cell = cells[index]
    if (!cell) return
    worst = Math.max(
      worst,
      Math.abs(header.getBoundingClientRect().left - cell.getBoundingClientRect().left),
    )
  })
  return Math.round(worst)
}

/**
 * Classes only the built-in primitives put on themselves.
 *
 * Structural hooks the table passes through `className` — `rtc-th-sort`,
 * `rtc-page-button`, `rtc-filter-operator` — are deliberately absent: those
 * land on whatever the host rendered and are legitimate everywhere. These are
 * the ones that mean "this control is ours", and in an adapted table there
 * should be none, whether because a control was rendered raw instead of
 * through the registry or because an override was missed.
 */
const BUILT_IN_PRIMITIVES = [
  '.rtc-button',
  '.rtc-icon-button',
  '.rtc-input',
  '.rtc-select',
  '.rtc-checkbox',
  '.rtc-switch',
  '.rtc-slider',
  '.rtc-chip',
  '.rtc-skeleton',
  '.rtc-progress',
]

for (const [adapter, storyId] of Object.entries(ADAPTERS)) {
  test.describe(`overlays: ${adapter}`, () => {
    /**
     * The trigger-props rule, from every site that relies on it. Radix's
     * `asChild`, MUI's `anchorEl` clone and Mantine's `Popover.Target` clone
     * all deliver their handlers and ref through props the adapter has to pass
     * on; an adapter that swallows them fails here and nowhere else.
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

    test('no header is truncated, at any width', async ({ page }) => {
      const root = await openStory(page, storyId)

      // Narrow viewports are where a column gets squeezed, so the assertion is
      // worthless at one comfortable width.
      for (const width of [1280, 1000, 800]) {
        await page.setViewportSize({ width, height: 700 })
        await expect
          .poll(async () => root.evaluate(headerOverflow), { timeout: 8_000 })
          .toEqual([])
      }
    })

    /**
     * Half-and-half chrome is the failure this catches: a header whose sort
     * control is ours and whose filter and menu buttons are the host's, or a
     * design-system checkbox wrapped in a pill we drew. Every interactive
     * control has to come from the registry, including the ones that are
     * easy to write as a plain `<button>`.
     */
    test('renders no built-in primitives', async ({ page }) => {
      test.skip(adapter === 'built-in', 'the built-in story is the primitives')
      const root = await openStory(page, storyId)

      // Open one of each overlay first: their contents mount lazily, and a
      // stray primitive inside a menu counts just as much.
      await header(root, 'department').locator('.rtc-filter-trigger').click()
      await expect(anyOverlay(page).first()).toBeVisible()

      const found = await page.evaluate(
        (selectors) =>
          selectors.filter((selector) => document.querySelector(selector) !== null),
        BUILT_IN_PRIMITIVES,
      )
      expect(found).toEqual([])
    })

    /**
     * Icons travel into surfaces the library portals to `document.body`,
     * outside the element that declares `--rtc-icon-size`. An unresolved
     * `var()` makes `width` invalid, and an SVG with no width falls back to
     * its intrinsic size — a 16px glyph rendering at 300px inside a dropdown.
     */
    test('icons keep their size inside portalled surfaces', async ({ page }) => {
      const root = await openStory(page, storyId)
      await header(root, 'age').locator('.rtc-column-actions-trigger').click()
      await expect(anyOverlay(page).first()).toBeVisible()

      const oversized = await page.evaluate(() =>
        Array.from(document.querySelectorAll('svg.rtc-icon'))
          .map((icon) => icon.getBoundingClientRect())
          .filter((box) => box.width > 32 || box.height > 32)
          .map((box) => `${Math.round(box.width)}x${Math.round(box.height)}`),
      )
      expect(oversized).toEqual([])
    })

    test('header and body columns stay aligned', async ({ page }) => {
      const root = await openStory(page, storyId)
      for (const width of [1280, 900]) {
        await page.setViewportSize({ width, height: 700 })
        await expect.poll(async () => root.evaluate(columnMisalignment)).toBeLessThanOrEqual(1)
      }
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
