/**
 * Drives the minimal reproduction and reports whether React threw error 185.
 *
 * Usage:
 *   pnpm exec vite --config debug/react-185-antd/vite.config.ts   # terminal 1
 *   node debug/react-185-antd/drive.mjs                           # terminal 2
 *
 * Exit code 0 means it reproduced, 3 means it did not. See the README for the
 * knobs and the control matrix.
 */
import { chromium } from '@playwright/test'

const Q = process.env.Q ?? 'antd=on&cost=20'
const MOVES = Number(process.env.MOVES ?? 600)
const GAP = Number(process.env.GAP ?? 8)
const PORT = Number(process.env.PORT ?? 5288)

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const page = await browser.newPage({ viewport: { width: 900, height: 500 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message.split('\n')[0]))

await page.goto(`http://127.0.0.1:${PORT}/debug/react-185-antd/index.html?${Q}`)
await page.locator('#pad').waitFor()
await page.waitForTimeout(600)

// `__RTCLOG` only exists if react-dom has been hand-instrumented to log lanes.
// Reported either way, so a stale dependency bundle can never be mistaken for a
// pristine one — that mistake invalidated two earlier A/B runs.
await page.evaluate(() => {
  globalThis.__RTCLOG = []
})

const box = await page.locator('#pad').boundingBox()
if (!box) throw new Error('#pad is not visible')
const y = box.y + box.height / 2

// Fire-and-forget: awaiting each move lets React drain, and a drained queue is
// exactly what does not reproduce.
const cdp = await page.context().newCDPSession(page)
const send = (params) => cdp.send('Input.dispatchMouseEvent', params).catch(() => {})

await send({ type: 'mousePressed', x: box.x + 20, y, button: 'left', buttons: 1, clickCount: 1 })
let threwAt = -1
for (let move = 0; move < MOVES; move += 1) {
  send({ type: 'mouseMoved', x: box.x + 40 + (move % 200), y, button: 'left', buttons: 1 })
  await new Promise((resolve) => setTimeout(resolve, GAP))
  if (errors.length) {
    threwAt = move
    break
  }
}
await send({ type: 'mouseReleased', x: box.x + 20, y, button: 'left', buttons: 0, clickCount: 1 })
await page.waitForTimeout(300)

const lanes = await page.evaluate(() => globalThis.__RTCLOG ?? [])
const commits = lanes.filter((entry) => entry.startsWith('C '))
const maxNest = commits.reduce((max, entry) => Math.max(max, Number(entry.split(':')[1]) || 0), 0)
console.log(
  `[${Q}] react=${lanes.length ? 'instrumented' : 'pristine'} ` +
    `maxNest=${maxNest} ${threwAt === -1 ? 'no error' : `THREW at move ${threwAt}`}`,
)
if (lanes.length) {
  const commits = lanes.filter((l) => l.startsWith('C'))
  console.log('  commits:', commits.length, '| last 6:', commits.slice(-6).join('  '))
  const inCommit = {}
  for (const l of lanes) if (l.startsWith('U ') && l.includes('ec=4')) inCommit[l] = (inCommit[l] ?? 0) + 1
  const outside = {}
  for (const l of lanes) if (l.startsWith('U ') && !l.includes('ec=4')) outside[l] = (outside[l] ?? 0) + 1
  console.log('  in-commit producers:', JSON.stringify(inCommit))
  console.log('  other producers:', JSON.stringify(Object.fromEntries(Object.entries(outside).slice(0, 6))))
}
await browser.close()
process.exit(threwAt === -1 ? 3 : 0)
