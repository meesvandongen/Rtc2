import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Popover, Tooltip } from 'antd'

/**
 * React error 185 with real Ant Design and nothing else — no table, no
 * TanStack, no component registry.
 *
 * One mounted Ant overlay is the whole ingredient list on Ant's side.
 * `Tooltip` renders `@rc-component/trigger`, which schedules Sync-lane state
 * from layout effects and from re-attaching its popup ref, around
 * `@rc-component/portal`, whose container effect has no dependency array and so
 * schedules a Default-lane update after every render.
 *
 *   ?antd=on|off   mount the Ant overlay
 *   ?open=on|off   keep its popup mounted
 *   ?cost=ms       busy-wait per render, standing in for an expensive app
 *   ?kind=tooltip|popover
 *   ?childref=on   give the overlay's child an inline callback ref
 *   ?remount=on    key the overlay by the value so it remounts on every change.
 *                  Mounting runs Trigger's layout effects inside the commit,
 *                  which is the Sync-lane producer. A Replay recording of the
 *                  real table shows exactly this: its in-commit Trigger updates
 *                  arrive with the mount flag still unset.
 */
const params = new URLSearchParams(location.search)
const ANTD = params.get('antd') !== 'off'
const OPEN = params.get('open') !== 'off'
const COST = Number(params.get('cost') ?? 20)
const KIND = params.get('kind') ?? 'tooltip'
const CHILDREF = params.get('childref') === 'on'
const REMOUNT = params.get('remount') === 'on'

function burn(ms: number) {
  const until = performance.now() + ms
  while (performance.now() < until) {
    /* keep the main thread busy so commits take real time */
  }
}

function App() {
  const [value, setValue] = useState(0)
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
      <div style={{ padding: 60 }}>
        {ANTD ? (
          KIND === 'popover' ? (
            <Popover key={REMOUNT ? value : 'fixed'} open={OPEN || undefined} content={<div>value {value}</div>}>
              <span id="anchor" ref={CHILDREF ? () => {} : undefined}>
                anchor
              </span>
            </Popover>
          ) : (
            <Tooltip key={REMOUNT ? value : 'fixed'} open={OPEN || undefined} title={`value ${value}`}>
              <span id="anchor" ref={CHILDREF ? () => {} : undefined}>
                anchor
              </span>
            </Tooltip>
          )
        ) : (
          <span id="anchor">anchor</span>
        )}
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
