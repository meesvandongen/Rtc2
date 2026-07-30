/**
 * Drives a long range-slider drag against the harness and reports whether React
 * threw error 185.
 *
 * Runs in the Replay browser when `@replayio/playwright` is installed and
 * `REPLAY=1` is set, so a failing run can be inspected after the fact — the
 * failure needs an unbroken run of 51 nested commits and does not reproduce on
 * demand, which is exactly the case a recording is for. Otherwise it uses
 * whatever Chromium Playwright resolves, honouring `CHROMIUM_PATH`.
 *
 * Usage:
 *   pnpm exec vite --config debug/react-185/vite.config.ts   # in one terminal
 *   node debug/react-185/record.mjs                          # in another
 *   REPLAY=1 node debug/react-185/record.mjs                 # record it
 *   Q='eager=off' node debug/react-185/record.mjs            # A/B the fix
 *
 * Exit code 0 means it reproduced, 3 means it did not.
 */
import { chromium } from '@playwright/test'

const MOVES = Number(process.env.MOVES ?? 2500)
const GAP = Number(process.env.GAP ?? 8)
const Q = process.env.Q ?? ''
const PORT = Number(process.env.PORT ?? 5255)

async function launchOptions() {
  if (process.env.REPLAY !== '1') {
    return process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  }
  const replay = await import('@replayio/playwright').catch(() => {
    throw new Error(
      'REPLAY=1 needs the Replay integration, which is not a dependency of this repo:\n' +
        '  npm i -D @replayio/playwright && npx replayio@latest install',
    )
  })
  return { ...replay.devices['Replay Chromium'].launchOptions, headless: true }
}

const browser = await chromium.launch(await launchOptions())
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message.split('\n')[0]))

await page.goto(`http://127.0.0.1:${PORT}/debug/react-185/index.html?${Q}`)
await page.locator('.rtc-root').first().waitFor({ timeout: 60_000 })
await page.waitForTimeout(2500)

const handles = page.locator(
  '[data-rtc-filter-field="salary"] [role="slider"], [data-rtc-filter-field="salary"] input.rtc-slider',
)
const handle = handles.nth(Math.min(1, (await handles.count()) - 1))
await handle.scrollIntoViewIfNeeded()
const box = await handle.boundingBox()
if (!box) throw new Error('the salary slider is not visible')
const x = box.x + box.width / 2
const y = box.y + box.height / 2

// Fire-and-forget through CDP: awaiting each move lets React drain between
// them, and a drained queue is precisely what does not reproduce.
const cdp = await page.context().newCDPSession(page)
const send = (params) => cdp.send('Input.dispatchMouseEvent', params).catch(() => {})

await send({ type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
let threwAt = -1
for (let move = 0; move < MOVES; move += 1) {
  send({ type: 'mouseMoved', x: x + 90 * Math.sin(move / 14), y, button: 'left', buttons: 1 })
  await new Promise((resolve) => setTimeout(resolve, GAP))
  if (errors.length) {
    threwAt = move
    break
  }
}
await send({ type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
await page.waitForTimeout(500)

const label = `[${Q || 'default'}] moves=${MOVES} gap=${GAP}`
console.log(threwAt === -1 ? `${label} → no error` : `${label} → THREW at move ${threwAt}\n  ${errors[0]}`)
await browser.close()
process.exit(threwAt === -1 ? 3 : 0)
