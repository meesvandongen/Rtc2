import { expect, test } from '@playwright/test'

import { bodyRows, columnText, header, openStory } from './helpers'

/**
 * Server-side pagination against the MSW-mocked `/api/people` endpoint.
 *
 * These assertions are the reason the story's dataset uses a seeded generator:
 * the mock returns a stable slice for a given page, so exact row content can be
 * compared instead of only counting rows.
 */
test.describe('remote pagination (MSW)', () => {
  const STORY = 'datatable-04-pagination--remote-pagination'

  test('loads the first page from the mocked endpoint', async ({ page }) => {
    const root = await openStory(page, STORY)

    await expect(bodyRows(root)).toHaveCount(10)
    // 137 rows in the mock dataset, 10 per page.
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('1–10 of 137')
    await expect(page.getByTestId('remote-status')).toContainText('"total":137')
  })

  test('requests the next page and swaps the rows', async ({ page }) => {
    const root = await openStory(page, STORY)
    await expect(bodyRows(root)).toHaveCount(10)

    const firstPage = await columnText(root, 'email')

    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/people')) requests.push(request.url())
    })

    await root.getByLabel('Go to next page').click()

    await expect(root.locator('[data-rtc-page-range]')).toHaveText('11–20 of 137')
    await expect
      .poll(() => requests.filter((url) => url.includes('page=1')).length)
      .toBeGreaterThan(0)

    // The page range comes from client state and updates before the response
    // lands, so wait on the rows themselves rather than reading them straight
    // after the click.
    await expect.poll(() => columnText(root, 'email')).not.toEqual(firstPage)
    expect(await columnText(root, 'email')).toHaveLength(10)
  })

  test('changing page size re-requests with the new size', async ({ page }) => {
    const root = await openStory(page, STORY)
    await expect(bodyRows(root)).toHaveCount(10)

    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/people')) requests.push(request.url())
    })

    await root.locator('#rtc-page-size').selectOption('25')

    await expect(bodyRows(root)).toHaveCount(25)
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('1–25 of 137')
    await expect
      .poll(() => requests.some((url) => url.includes('pageSize=25')))
      .toBe(true)
  })

  test('the last page returns the remainder and disables paging forward', async ({ page }) => {
    const root = await openStory(page, STORY)
    await expect(bodyRows(root)).toHaveCount(10)

    await root.getByLabel('Go to last page').click()

    // 137 = 13 full pages of 10, plus a remainder of 7.
    await expect(bodyRows(root)).toHaveCount(7)
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('131–137 of 137')
    await expect(root.getByLabel('Go to next page')).toBeDisabled()
    await expect(root.getByLabel('Go to previous page')).toBeEnabled()

    await root.getByLabel('Go to first page').click()
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('1–10 of 137')
    await expect(root.getByLabel('Go to previous page')).toBeDisabled()
  })

  test('server-side sorting is requested and reflected', async ({ page }) => {
    const root = await openStory(page, STORY)
    await expect(bodyRows(root)).toHaveCount(10)

    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/people')) requests.push(request.url())
    })

    await header(root, 'age').getByRole('button').first().click()

    await expect
      .poll(() => requests.some((url) => url.includes('sortBy=age')))
      .toBe(true)

    // Wait for the sorted page to arrive before comparing order.
    await expect
      .poll(async () => {
        const ages = (await columnText(root, 'age')).map(Number)
        return ages.every((age, index) => index === 0 || ages[index - 1]! <= age)
      })
      .toBe(true)
  })

  test('searching resets to the first page and narrows the total', async ({ page }) => {
    const root = await openStory(page, STORY)
    await expect(bodyRows(root)).toHaveCount(10)

    await root.getByLabel('Go to next page').click()
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('11–20 of 137')

    await root.locator('[data-rtc-global-filter]').fill('Engineering')

    // The search is debounced, so the total settles a moment after typing.
    await expect(page.getByTestId('remote-status')).not.toContainText('"total":137')
    await expect(page.getByTestId('remote-status')).toContainText('"page":0')

    const rangeText = await root.locator('[data-rtc-page-range]').innerText()
    expect(rangeText.startsWith('1–')).toBe(true)

    const departments = await columnText(root, 'department')
    expect(departments.length).toBeGreaterThan(0)
    expect(new Set(departments)).toEqual(new Set(['Engineering']))
  })

  test('shows a progress bar while a page is in flight', async ({ page }) => {
    const root = await openStory(page, STORY)
    await expect(bodyRows(root)).toHaveCount(10)

    // Hold the next response open so the loading state is observable.
    await page.route('**/api/people**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      await route.continue()
    })

    await root.getByLabel('Go to next page').click()
    await expect(root.locator('.rtc-progress')).toBeVisible()
    await expect(root.locator('[data-rtc-page-range]')).toHaveText('11–20 of 137')
  })

  test('surfaces the error state when the endpoint fails', async ({ page }) => {
    const root = await openStory(page, 'datatable-04-pagination--remote-error')

    await expect(root.locator('.rtc-error')).toBeVisible()
    await expect(page.getByTestId('remote-status')).toContainText('"isError":true')
    await expect(bodyRows(root)).toHaveCount(0)
  })
})
