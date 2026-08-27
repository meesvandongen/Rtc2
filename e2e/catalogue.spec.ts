import { expect, test, type Page } from '@playwright/test'

import { type IndexEntry, catalogueEntries } from './helpers'

/**
 * Nothing in the catalogue may fail to render.
 *
 * The entry list comes from `index.json` rather than a hand-written array, so a
 * story or a documentation page added later is covered without anyone
 * remembering to add it here. Both kinds are checked, because both have their
 * own way of dying:
 *
 * - A story's module is evaluated and its component mounted, so a formatter
 *   handed an unexpected value — a grouped or aggregated row often carries none
 *   — throws through React and blanks the table.
 * - An MDX page is compiled to a component too, and braces in its prose are
 *   JSX expressions. A UI string quoted verbatim, `Sort by {column} ascending`,
 *   compiles to a reference to an undefined `column` and takes the whole page
 *   down. Nothing about the source looks like code, and the failure only
 *   appears in a browser.
 *
 * Neither failure is visible to a test that does not happen to open the page it
 * broke, so this opens all of them.
 */

/**
 * The failures Storybook can report for one page.
 *
 * Storybook keeps its error pane in the document at all times and reveals it
 * with a class on `<body>`; testing for the element itself reports every page
 * as broken. An error thrown inside a React render is caught and shown there
 * rather than reaching `pageerror`, and an error thrown while the module
 * evaluates reaches `pageerror` and leaves the mount point empty — so all three
 * signals are needed to catch both.
 */
async function renderFailure(page: Page, entry: IndexEntry): Promise<string | undefined> {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    const viewMode = entry.type === 'docs' ? 'docs' : 'story'
    // Not `networkidle`: the MSW-backed stories keep a worker connection open,
    // so it never settles.
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=${viewMode}`, { waitUntil: 'load' })
    // Docs pages mount into `#storybook-docs`, stories into `#storybook-root`.
    const mount = viewMode === 'docs' ? '#storybook-docs' : '#storybook-root'
    await page
      .locator(`${mount} > *`)
      .first()
      .waitFor({ state: 'attached', timeout: 15_000 })
      .catch(() => undefined)
    const failure = await page.evaluate((selector) => {
      if (document.body.classList.contains('sb-show-errordisplay'))
        return document.querySelector('#error-message')?.textContent?.trim() || 'error display shown'
      if ((document.querySelector(selector)?.childElementCount ?? 0) === 0) return 'nothing rendered'
      return undefined
    }, mount)
    return failure ?? errors[0]
  } finally {
    page.removeAllListeners('pageerror')
  }
}

test.describe('catalogue smoke', () => {
  // Every entry in the catalogue, one page load each.
  test.setTimeout(600_000)

  test('no story throws while rendering', async ({ page }) => {
    const stories = (await catalogueEntries(page)).filter((entry) => entry.type === 'story')
    expect(stories.length).toBeGreaterThan(50)

    const broken: string[] = []
    for (const entry of stories) {
      const failure = await renderFailure(page, entry)
      if (failure) broken.push(`${entry.id}: ${failure}`)
    }
    expect(broken).toEqual([])
  })

  test('no documentation page throws while rendering', async ({ page }) => {
    const docs = (await catalogueEntries(page)).filter((entry) => entry.type === 'docs')
    expect(docs.length).toBeGreaterThan(15)
    // The prose pages under `stories/docs/` are standalone MDX, which Storybook
    // marks `unattached-mdx`. They are the pages this test exists for — the
    // layout check in `docs.spec.ts` has to skip them, since they have no story
    // to lay out — so fail loudly rather than quietly if they ever stop
    // appearing in the catalogue.
    expect(docs.filter((entry) => entry.tags?.includes('unattached-mdx')).length).toBeGreaterThan(5)

    const broken: string[] = []
    for (const entry of docs) {
      const failure = await renderFailure(page, entry)
      if (failure) broken.push(`${entry.id}: ${failure}`)
    }
    expect(broken).toEqual([])
  })
})
