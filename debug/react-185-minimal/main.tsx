import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Minimal reproduction of React error 185 — no table, no design system.
 *
 * The claim under test: a commit-phase Sync producer and a microtask-scheduled
 * Default producer ping-pong without yielding to the event loop, so the browser
 * never dispatches input between them and no commit is ever observed with an
 * empty queue. React then counts every commit as nested and throws at 51.
 *
 *   ?sync=N     components whose layout effect stores a fresh object (Sync)
 *   ?defmode=change|render|off   Default producer: per value change, or on
 *                               EVERY render (a dependency-array-less effect,
 *                               which is what rc-portal does)
 *   ?cost=ms    busy-wait per render, to lengthen commits
 */
const params = new URLSearchParams(location.search)
const SYNC = Number(params.get('sync') ?? 30)
const DEFMODE = params.get('defmode') ?? 'change'
const COST = Number(params.get('cost') ?? 0)

function burn(ms: number) {
  const until = performance.now() + ms
  while (performance.now() < until) {
    /* keep the main thread busy so commits take real time */
  }
}

/**
 * Stands in for rc-portal: an effect with NO dependency array that stores a
 * fresh object, so it schedules a Default-lane update after *every* render.
 */
function RenderDefaultProducer() {
  const [, setContainer] = useState<object>({})
  useEffect(() => {
    setContainer({})
  })
  return null
}

/** Stands in for rc-trigger: a layout effect that cannot bail out. */
function SyncProducer({ value }: { value: number }) {
  const [, setReady] = useState<object>({})
  useLayoutEffect(() => {
    setReady({ ready: false })
  }, [value])
  return null
}

function App() {
  const [value, setValue] = useState(0)
  const [, setToken] = useState<object>({})

  // Stands in for TanStack's scheduled autoReset: queued from outside React,
  // always a new object, once per change.
  const seen = useRef(value)
  if (DEFMODE === 'change' && seen.current !== value) {
    seen.current = value
    queueMicrotask(() => setToken({}))
  }

  if (COST) burn(COST)

  return (
    <>
      <div
        id="pad"
        onMouseMove={(event) => setValue(event.clientX)}
        style={{ height: 80, background: '#eef', font: '14px sans-serif', padding: 8 }}
      >
        drag across me — value {value}
      </div>
      {DEFMODE === 'render' ? <RenderDefaultProducer /> : null}
      {Array.from({ length: SYNC }, (_, i) => (
        <SyncProducer key={i} value={value} />
      ))}
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
