/**
 * Regenerates the README's screenshots from the real stories.
 *
 * Run Storybook first (`pnpm run storybook`), then `node scripts/screenshots.mjs`.
 * Images are written to `docs/media/`; the intermediate crops that make up the
 * theme and adapter grids go to a temporary directory and are not kept.
 *
 * `CHROMIUM_PATH` points at a browser binary, same as the Playwright suite.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const OUT = process.env.OUT_DIR ?? 'docs/media'
const BASE = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const PARTS = mkdtempSync(join(tmpdir(), 'rtc-shots-'))
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

/** Open one story in a viewport of its own, with the Storybook prose hidden. */
const open = async ({ id, width, height = 1500, dark = false }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/iframe.html?id=${id}&viewMode=story${dark ? '&globals=theme:dark' : ''}`, {
    waitUntil: 'load',
  })
  await page.locator('.rtc-root').first().waitFor({ state: 'visible', timeout: 45_000 })
  // The note above each story is Storybook page chrome, not part of the shot.
  await page.addStyleTag({ content: '.rtc-sb-note { display: none !important }' })
  await page.waitForTimeout(1500)
  return { context, page }
}

/** The whole table, with a little of the page around it. */
const shootTable = async (page, path, pad = 24) => {
  const box = await page.locator('.rtc-root').first().boundingBox()
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  })
}

/**
 * A slice of one table that ends on a row boundary — a crop through the middle
 * of a row reads as a rendering glitch rather than a deliberate excerpt.
 */
const shootSlice = async (page, path, { index = 0, rows = 4, fromHeader = false } = {}) => {
  const root = page.locator('.rtc-root').nth(index)
  const box = await root.boundingBox()
  const head = await root.locator('thead').first().boundingBox()
  const lastRow = await root.locator('tbody tr').nth(rows - 1).boundingBox()
  const top = fromHeader ? head.y : box.y
  await page.screenshot({
    path,
    clip: { x: box.x, y: top, width: box.width, height: lastRow.y + lastRow.height - top },
  })
}

// ---------------------------------------------------------------- the table ---

{
  const { context, page } = await open({ id: 'datatable-01-basics--basic', width: 1760 })
  const salary = page.locator('.rtc-th-sort').nth(6)
  await salary.click()
  await salary.click()
  await page.waitForTimeout(400)
  await shootTable(page, `${OUT}/table.png`)
  await context.close()
  console.log('✓ table')
}

// ------------------------------------------------------------------ filters ---

{
  const { context, page } = await open({
    id: 'datatable-16-filter-data-types--all-built-in-types',
    width: 1320,
    height: 1200,
  })
  await page.locator('.rtc-filter-trigger').nth(4).click()
  await page.waitForTimeout(600)
  await page.locator('.rtc-filter-operator').first().click()
  await page.waitForTimeout(600)
  await shootTable(page, `${OUT}/filters.png`, 22)
  await context.close()
  console.log('✓ filters')
}

// ------------------------------------------------------------------- mobile ---

{
  // The drawer is a top-layer dialog anchored to the viewport, so this one is
  // the whole phone-sized viewport rather than a crop of the table.
  const { context, page } = await open({
    id: 'datatable-03-filtering--mobile-filter-drawer',
    width: 390,
    height: 780,
  })
  await page.locator('.rtc-toolbar-actions button').nth(1).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/mobile.png` })
  await context.close()
  console.log('✓ mobile')
}

// ------------------------------------------------------- grids: the pieces ---

const THEMES = ['material', 'linear', 'shadcn', 'spreadsheet', 'ant', 'soft']

{
  const { context, page } = await open({ id: 'datatable-12-theming--presets', width: 1400, height: 3200 })
  // The story renders one table per preset, in the order `dataTableThemes`
  // declares them.
  const order = ['material', 'shadcn', 'ant', 'linear', 'spreadsheet', 'soft', 'highContrast']
  for (const [index, name] of order.entries()) {
    if (!THEMES.includes(name)) continue
    await shootSlice(page, `${PARTS}/theme-${name}.png`, { index, rows: 4, fromHeader: true })
  }
  await context.close()
  console.log('✓ theme presets')
}

const ADAPTERS = [
  ['MUI', 'mui', 'datatable-15-ui-libraries--material-ui'],
  ['Radix', 'radix', 'datatable-15-ui-libraries--radix-shadcn'],
  ['Mantine', 'mantine', 'datatable-15-ui-libraries--mantine'],
  ['@lolmath/ui', 'lolmath', 'datatable-15-ui-libraries--lolmath-ui'],
]

for (const [, name, id] of ADAPTERS) {
  const { context, page } = await open({ id, width: 1150, height: 1600 })
  await shootSlice(page, `${PARTS}/adapter-${name}.png`, { rows: 5, fromHeader: true })
  await context.close()
  console.log(`✓ adapter ${name}`)
}

// ---------------------------------------------------- grids: the composite ---

/** Intrinsic size of a PNG, in the CSS pixels it was captured at (2× scale). */
const cssHeight = (file) => readFileSync(file).subarray(16, 24).readUInt32BE(4) / 2

const sheet = (cells, { cols, cellWidth }) => `
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #fff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  #sheet { column-count: ${cols}; column-gap: 16px; width: ${cols * cellWidth + (cols - 1) * 16}px; }
  figure { break-inside: avoid; margin-bottom: 16px; background: #fff;
           border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  figcaption { padding: 6px 12px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
               text-transform: uppercase; color: #475569; background: #f8fafc;
               border-bottom: 1px solid #e2e8f0; }
  .crop { overflow: hidden; position: relative; }
  .crop img { position: absolute; top: 0; left: 0; transform: scale(0.5); transform-origin: top left; }
</style>
<div id="sheet">
  ${cells
    .map(
      ({ label, file }) => `
  <figure>
    <figcaption>${label}</figcaption>
    <div class="crop" style="height: ${cssHeight(file)}px"><img src="file://${file}"></div>
  </figure>`,
    )
    .join('')}
</div>`

const composite = async (html, path, width) => {
  const file = `${PARTS}/sheet.html`
  writeFileSync(file, html)
  const context = await browser.newContext({ viewport: { width, height: 2600 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.goto(`file://${file}`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await page.screenshot({ path, clip: await page.locator('#sheet').boundingBox() })
  await context.close()
  console.log(`✓ ${path}`)
}

await composite(
  sheet(
    THEMES.map((name) => ({ label: name, file: `${PARTS}/theme-${name}.png` })),
    { cols: 2, cellWidth: 620 },
  ),
  `${OUT}/themes.png`,
  1320,
)

await composite(
  sheet(
    ADAPTERS.map(([label, name]) => ({ label, file: `${PARTS}/adapter-${name}.png` })),
    { cols: 2, cellWidth: 560 },
  ),
  `${OUT}/adapters.png`,
  1220,
)

await browser.close()
