---
'@mvd/table': patch
---

Stop forwarding TanStack's no-op state resets to React.

`expanded` and `cellSelection` are reset by TanStack in a microtask queued off
the first row-model computation, and a reset rebuilds its slice whether or not
the value moved. Forwarding those clones as changes re-rendered the table for
nothing, reported a change through `onExpandedChange` and
`onCellSelectionChange` before the user had touched anything — and, when the
microtask landed between a mount render and its commit, drew React's *"Can't
perform a React state update on a component that hasn't mounted yet"* warning.
A slice that resolves to the value it already holds is now dropped, however
new the object.

Two fixes fall out of the same change:

- `on*Change` callbacks receive the resolved value instead of `undefined`.
  They previously read a variable the state updater had not filled in yet.
- Virtualized bodies mount their rows again. The virtualizer looks for the
  scroll container in a layout effect, which React runs before it attaches an
  ancestor's ref, so it needs a second render to find one — a render it had
  been getting by accident from the spurious reset above.
