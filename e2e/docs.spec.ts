import { expect, test } from '@playwright/test'

interface IndexEntry {
  id: string
  type: string
  title: string
  tags?: string[]
}

/**
 * Every autodocs page must show its examples.
 *
 * Docs lays each story out as a block in a flowing page rather than giving it
 * the whole frame, so a story taken out of normal flow — by a decorator that is
 * positioned, or one that inherits a rule meant for something else — collapses
 * its `.docs-story` container to nothing. The canvas smoke test cannot see
 * that: the same story renders fine on its own. This measures the container.
 */
test.describe('docs pages', () => {
  // One page load per stories file, each mounting every story in it.
  test.setTimeout(600_000)

  test('every story example has height on its docs page', async ({ page }) => {
    const index = await page.request.get('/index.json')
    expect(index.ok()).toBe(true)
    const entries = Object.values(
      ((await index.json()) as { entries: Record<string, IndexEntry> }).entries,
    )
    // Only the autodocs pages generated from a stories file. The prose pages
    // under `stories/docs/` are standalone MDX with no story to lay out, which
    // Storybook marks `unattached-mdx`.
    const docs = entries.filter(
      (entry) => entry.type === 'docs' && !entry.tags?.includes('unattached-mdx'),
    )
    expect(docs.length).toBeGreaterThan(10)

    const collapsed: string[] = []
    for (const entry of docs) {
      // A docs page renders one block per story plus the Primary block that
      // repeats the first one, and it fills them in progressively.
      const expected =
        entries.filter((other) => other.type === 'story' && other.title === entry.title).length + 1

      // Not `networkidle`: the MSW-backed stories keep a worker connection
      // open, so it never settles.
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=docs`, { waitUntil: 'load' })
      const blocks = page.locator('.docs-story')
      await expect(blocks).toHaveCount(expected, { timeout: 30_000 })

      // The containers appear before their stories mount, so poll rather than
      // measure once. A rendered example is hundreds of pixels tall; the
      // threshold only has to separate "laid out" from "collapsed".
      let short: string[] = []
      await expect
        .poll(
          async () => {
            const heights = await blocks.evaluateAll((nodes) =>
              nodes.map((node) => Math.round(node.getBoundingClientRect().height)),
            )
            short = heights.flatMap((height, position) =>
              height < 40 ? [`${entry.id}[${position}]: ${height}px`] : [],
            )
            return short.length
          },
          { timeout: 30_000 },
        )
        .toBe(0)
        .catch(() => collapsed.push(...short))
    }
    expect(collapsed).toEqual([])
  })
})
