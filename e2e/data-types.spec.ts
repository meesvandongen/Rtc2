import { expect, test, type Locator, type Page } from '@playwright/test'

import { columnText, openMenu, openStory, panelField } from './helpers'

/**
 * The filter data-type registry.
 *
 * These tests exercise the part of filtering that the flat `filterVariant`
 * enum could not express: operators that differ per data type, operands whose
 * shape changes with the operator, relative dates, structured operands, and
 * caller-supplied types.
 */

/** The operator picker inside a panel field. */
function operatorButton(root: Locator, columnId: string, index = 0): Locator {
  return panelField(root, columnId)
    .locator(`[data-rtc-filter-condition="${index}"]`)
    .locator('.rtc-filter-condition-header button')
    .first()
}

/** Switches a column's operator through its menu. */
async function chooseOperator(
  root: Locator,
  page: Page,
  columnId: string,
  operator: string | RegExp,
  index = 0,
): Promise<void> {
  await operatorButton(root, columnId, index).click()
  await openMenu(page).getByRole('menuitemcheckbox', { name: operator, exact: true }).click()
  await expect(openMenu(page)).toHaveCount(0)
}

/** The operator labels a column offers. */
async function operatorLabels(root: Locator, page: Page, columnId: string): Promise<string[]> {
  await operatorButton(root, columnId).click()
  const items = openMenu(page).getByRole('menuitemcheckbox')
  // `allInnerTexts` resolves against whatever matches right now, so the menu
  // has to be waited for explicitly or an empty list reads as "no operators".
  await expect(items.first()).toBeVisible()
  const labels = await items.allInnerTexts()
  await page.keyboard.press('Escape')
  await expect(openMenu(page)).toHaveCount(0)
  return labels
}

test.describe('data type registry', () => {
  test('each column type offers its own operators', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--all-built-in-types')

    expect(await operatorLabels(root, page, 'age')).toEqual(
      expect.arrayContaining(['Between', 'Greater than', 'Is any of']),
    )
    expect(await operatorLabels(root, page, 'lastSeen')).toEqual(
      expect.arrayContaining(['Is in the last', 'Day of week is', 'Time of day between']),
    )
    expect(await operatorLabels(root, page, 'location')).toEqual(
      expect.arrayContaining(['Within radius of', 'Within bounding box']),
    )
    expect(await operatorLabels(root, page, 'skills')).toEqual(
      expect.arrayContaining(['Contains any of', 'Contains all of', 'Contains none of']),
    )
  })

  test('the operand editor changes shape with the operator', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--date-operators')
    const field = panelField(root, 'lastSeen')

    // Two datetimes by default.
    await expect(field.locator('[data-rtc-operand="date-from"]')).toBeVisible()

    await chooseOperator(root, page, 'lastSeen', 'Is in period')
    await expect(field.locator('[data-rtc-operand="preset"]')).toBeVisible()

    await chooseOperator(root, page, 'lastSeen', 'Is in the last')
    await expect(field.locator('[data-rtc-operand="rolling-n"]')).toBeVisible()

    await chooseOperator(root, page, 'lastSeen', 'Is empty')
    await expect(field.locator('[data-rtc-operand]')).toHaveCount(0)
  })

  test('a one-sided date bound compares by day, not by timestamp', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--date-operators')

    await chooseOperator(root, page, 'startDate', 'Is on or after')
    await panelField(root, 'startDate').locator('[data-rtc-operand="date"]').fill('2021-01-01')

    await expect
      .poll(async () => (await columnText(root, 'startDate')).every((date) => date >= '2021-01-01'))
      .toBe(true)
    await expect.poll(async () => (await columnText(root, 'startDate')).length).toBeGreaterThan(0)
  })

  test('a rolling window is measured from the table clock', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--date-operators')

    // The story pins `filterNow` to 2026-07-28T12:00Z, so "the last 30 days"
    // is a fixed interval rather than whatever today happens to be.
    await chooseOperator(root, page, 'lastSeen', 'Is in the last')
    await panelField(root, 'lastSeen').locator('[data-rtc-operand="rolling-n"]').fill('30')

    await expect
      .poll(async () => {
        const seen = await columnText(root, 'lastSeen')
        return seen.length > 0 && seen.every((value) => value >= '2026-06-28')
      })
      .toBe(true)
  })

  test('meta.filterOperators restricts the list', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--restricted-operators')

    expect(await operatorLabels(root, page, 'age')).toEqual(['Between', 'Greater than'])
  })

  test('a registered custom type compares by its own rules', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--custom-data-type')

    // "At least 2.0.0" must keep 2.10.0 and drop 1.4.7 — the opposite of what
    // string comparison would do.
    await panelField(root, 'version').locator('[data-rtc-operand="text"]').fill('2.0.0')

    await expect.poll(async () => new Set(await columnText(root, 'version'))).toEqual(
      new Set(['2.10.0', '2.9.4', '3.1.0', '2.0.0']),
    )
  })

  test('an inline type extends a built-in without registering it', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--inline-data-type')

    await chooseOperator(root, page, 'salary', 'Is a round number')

    await expect
      .poll(async () => {
        const salaries = await columnText(root, 'salary')
        return (
          salaries.length > 0 &&
          salaries.every((value) => Number(value.replace(/[^0-9]/g, '')) % 1000 === 0)
        )
      })
      .toBe(true)
  })

  test('coordinates filter by distance from a point', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--geo-filtering')
    const field = panelField(root, 'location')

    await field.locator('[data-rtc-operand="geo-lat"]').fill('52.37')
    await field.locator('[data-rtc-operand="geo-lng"]').fill('4.90')
    // Berlin is 577 km from Amsterdam; Prague, the next nearest, is 708 km.
    await field.locator('[data-rtc-operand="geo-radius"]').fill('600')

    await expect.poll(async () => new Set(await columnText(root, 'city'))).toEqual(
      new Set(['Amsterdam', 'Berlin']),
    )
  })

  test('types are inferred when a column declares none', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--inferred-types')

    expect(await operatorLabels(root, page, 'active')).toEqual(
      expect.arrayContaining(['Is', 'Is empty']),
    )
    expect(await operatorLabels(root, page, 'skills')).toEqual(
      expect.arrayContaining(['Contains any of']),
    )
    expect(await operatorLabels(root, page, 'startDate')).toEqual(
      expect.arrayContaining(['Is on or after']),
    )
  })

  test('two conditions on one column join with or', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--multiple-conditions')
    const field = panelField(root, 'age')

    await chooseOperator(root, page, 'age', 'Less than')
    await field.locator('[data-rtc-operand="number"]').fill('30')

    await field.getByRole('button', { name: 'Add condition' }).click()
    await chooseOperator(root, page, 'age', 'Greater than', 1)
    await field
      .locator('[data-rtc-filter-condition="1"] [data-rtc-operand="number"]')
      .fill('60')

    // Both conditions must hold until the joiner is flipped.
    await expect.poll(async () => (await columnText(root, 'age')).length).toBe(0)

    await field.getByRole('button', { name: 'Match all' }).click()
    await expect
      .poll(async () => {
        const ages = (await columnText(root, 'age')).map(Number)
        return ages.length > 0 && ages.every((age) => age < 30 || age > 60)
      })
      .toBe(true)
  })

  test('a structured filter value is summarised as a chip', async ({ page }) => {
    const root = await openStory(page, 'datatable-16-filter-data-types--date-operators')

    await chooseOperator(root, page, 'lastSeen', 'Is in the last')
    await panelField(root, 'lastSeen').locator('[data-rtc-operand="rolling-n"]').fill('3')

    await expect(root.locator('[data-rtc-filter-chip="lastSeen"]')).toContainText(
      'Last seen is in the last 3 day',
    )
  })
})

/**
 * Localization of the filter layer.
 *
 * A data type contributes strings of its own — operator names it reads
 * differently from its neighbours, the yes/no of a boolean, the units of a
 * rolling window — and each of them used to be able to leak English into an
 * otherwise translated table.
 */
test.describe('filter data types are localized', () => {
  const STORY = 'datatable-13-localization--operator-names-per-data-type'

  test('a type-scoped operator name beats the shared one', async ({ page }) => {
    const root = await openStory(page, STORY)

    // `equals` is one id read two ways: free text compares, a faceted picker
    // simply *is*.
    expect(await operatorLabels(root, page, 'firstName')).toEqual(
      expect.arrayContaining(['Bevat', 'Is gelijk aan']),
    )
    const enumLabels = await operatorLabels(root, page, 'department')
    expect(enumLabels).toEqual(expect.arrayContaining(['Is', 'Is een van']))
    expect(enumLabels).not.toContain('Is gelijk aan')

    // Only `datetime` is scoped away from `dateIs`; `date` keeps the shared one.
    expect(await operatorLabels(root, page, 'startDate')).toEqual(
      expect.arrayContaining(['Is op']),
    )
    const dateTimeLabels = await operatorLabels(root, page, 'lastSeen')
    expect(dateTimeLabels).toEqual(expect.arrayContaining(['Is op het moment']))
    expect(dateTimeLabels).not.toContain('Is op')
  })

  test('a partial nested override keeps the rest of the record', async ({ page }) => {
    const root = await openStory(page, STORY)

    await chooseOperator(root, page, 'startDate', 'Valt in periode')
    const presets = await panelField(root, 'startDate')
      .locator('[data-rtc-operand="preset"] option')
      .allInnerTexts()

    // Three presets are translated in the story; the other eleven have to
    // survive rather than being replaced along with them.
    expect(presets).toEqual(expect.arrayContaining(['Vandaag', 'Gisteren', 'Tomorrow']))
  })

  test('the operands a type supplies are named from the strings', async ({ page }) => {
    const root = await openStory(page, STORY)

    // Two slider thumbs need two names, and both come from `localization`.
    await expect(panelField(root, 'salary').getByLabel('Filter op Salary Minimaal')).toBeVisible()
    await expect(panelField(root, 'salary').getByLabel('Filter op Salary Maximaal')).toBeVisible()

    await chooseOperator(root, page, 'startDate', 'Valt in de laatste')
    const field = panelField(root, 'startDate')
    await expect(field.getByLabel('Filter op Start date aantal')).toBeVisible()
    await expect(field.getByLabel('Filter op Start date eenheid')).toBeVisible()
    // The rolling unit list is a translated record, not the raw ids.
    expect(await field.locator('[data-rtc-operand="rolling-n"] ~ select option').allInnerTexts())
      .toEqual(expect.arrayContaining(['dagen', 'weken']))
  })

  test('a summary chip is assembled from the localized strings', async ({ page }) => {
    const root = await openStory(page, STORY)

    await panelField(root, 'active')
      .locator('[data-rtc-operand="boolean"]')
      .selectOption({ label: 'Ja' })
    // The chip has to agree with the picker it was chosen from, not print the
    // underlying boolean.
    await expect(root.locator('[data-rtc-filter-chip="active"]')).toContainText('Ja')

    const age = panelField(root, 'age')
    await chooseOperator(root, page, 'age', 'Groter dan')
    await age.locator('[data-rtc-operand="number"]').fill('30')
    await age.getByRole('button', { name: 'Voorwaarde toevoegen' }).click()
    await chooseOperator(root, page, 'age', 'Kleiner dan', 1)
    await age.locator('[data-rtc-filter-condition="1"] [data-rtc-operand="number"]').fill('50')

    // Two conditions on one column are joined by the localized conjunction.
    await expect(root.locator('[data-rtc-filter-chip="age"]')).toContainText(' en ')
  })
})
