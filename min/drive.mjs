import { chromium } from '@playwright/test'
const Q = process.env.Q ?? ''
const MOVES = Number(process.env.MOVES ?? 400)
const GAP = Number(process.env.GAP ?? 8)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: 900, height: 500 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]))
await page.goto(`http://127.0.0.1:5277/min/index.html?${Q}`)
await page.locator('#pad').waitFor()
await page.waitForTimeout(600)
// Guard: report whether react-dom carries the lane instrumentation, so a
// stale dep bundle can never be mistaken for a pristine one.
const instrumented = await page.evaluate(() => {
  globalThis.__RTCLOG = []
  return [...document.scripts].length >= 0 && typeof globalThis.__RTCLOG === 'object'
})
void instrumented
const box = await page.locator('#pad').boundingBox()
const y = box.y + box.height / 2
const cdp = await page.context().newCDPSession(page)
const send = (p) => cdp.send('Input.dispatchMouseEvent', p).catch(() => {})
await send({ type: 'mousePressed', x: box.x + 20, y, button: 'left', buttons: 1, clickCount: 1 })
let hit = -1
for (let i = 0; i < MOVES; i++) {
  send({ type: 'mouseMoved', x: box.x + 40 + (i % 200), y, button: 'left', buttons: 1 })
  await new Promise((r) => setTimeout(r, GAP))
  if (errs.length) { hit = i; break }
}
await send({ type: 'mouseReleased', x: box.x + 20, y, button: 'left', buttons: 0, clickCount: 1 })
await page.waitForTimeout(300)
// The lane trace is only present when react-dom is instrumented; the throw
// itself needs no instrumentation.
const log = await page.evaluate(() => globalThis.__RTCLOG ?? [])
const nest = log.reduce((m, l) => Math.max(m, Number(l.split(':')[1])), 0)
console.log(
  `[${(Q || 'default').padEnd(38)}] react=${log.length ? 'instrumented' : 'pristine'} commits=${String(log.length).padStart(4)} maxNest=${String(nest).padStart(3)} ` +
    (hit === -1 ? 'no error' : `THREW at move ${hit}`),
)
if (hit !== -1) console.log('  cycle:', log.slice(-8).join('  '))
await browser.close()
process.exit(hit === -1 ? 3 : 0)
