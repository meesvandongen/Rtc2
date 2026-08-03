import { expect, test } from '@playwright/test'

import { openStory } from './helpers'

/**
 * Guards on the preview environment rather than on the table.
 *
 * Every other spec opens stories through `iframe.html`, which is deliberate —
 * it keeps the manager's chrome from stealing clicks and focus. It also hides a
 * whole class of failure: Storybook installs part of its instrumentation from a
 * *loader*, so that instrumentation is not in place until a story has rendered.
 * A story chunk imported after that point therefore evaluates against a
 * different global environment from the same chunk deep-linked to, and only the
 * first order is ever exercised above. These tests cover the difference.
 */

test('reading HTMLElement.prototype.focus stays legal once a story has rendered', async ({
  page,
}) => {
  await openStory(page, 'datatable-01-basics--basic')

  /**
   * In a secure context Storybook redefines `focus` on `HTMLElement.prototype`
   * as an accessor, and its getter starts by dereferencing
   * `this.ownerDocument` — fine for an element, illegal when the receiver is
   * the prototype itself, because `ownerDocument` is a native accessor.
   *
   * React Aria reads exactly that property: `setupGlobalFocusEvents` saves the
   * original `focus` off the prototype before installing its own. So once the
   * loader has run, a story chunk that pulls React Aria in throws
   * `Illegal invocation` while it is still evaluating and takes every story in
   * the chunk down with it — adapters and built-in primitives alike.
   * `preview.tsx` repairs the descriptor back to a plain value.
   */
  const read = await page.evaluate(() => {
    try {
      return typeof HTMLElement.prototype.focus
    } catch (error) {
      return `threw: ${(error as Error).message}`
    }
  })

  expect(read).toBe('function')
})

/** The repair routes through Storybook's getter, so focus still has to work. */
test('focus() still focuses after the descriptor is repaired', async ({ page }) => {
  const root = await openStory(page, 'datatable-01-basics--basic')

  const button = root.locator('button:not([disabled])').first()
  await expect(button).toBeVisible()

  const focused = await button.evaluate((element) => {
    element.focus()
    return document.activeElement === element
  })
  expect(focused).toBe(true)
})

/**
 * The symptom, end to end, through the manager.
 *
 * This is the only test that navigates between stories in one document, which
 * is the order a person browsing Storybook actually produces — and the order
 * that broke. The built-in story is the one asserted on purpose: it uses no
 * adapter at all, and it still died, because a chunk that fails to evaluate
 * takes every story in the file with it.
 */
test('a UI-libraries story survives being opened from another story', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/?path=/story/datatable-01-basics--basic')
  const preview = page.frameLocator('#storybook-preview-iframe')
  await expect(preview.locator('.rtc-root').first()).toBeVisible({ timeout: 30_000 })

  await page.locator('#storybook-explorer-tree').getByText('15 UI Libraries').first().click()
  await expect(preview.locator('.rtc-root').first()).toBeVisible({ timeout: 30_000 })
  await expect(preview.locator('thead th[data-rtc-column-id="firstName"]').first()).toContainText(
    'First name',
  )

  expect(errors).toEqual([])
})
