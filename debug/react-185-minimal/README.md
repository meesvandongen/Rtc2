# React error 185 — minimal reproduction

Sixty lines of React. No table, no design system, no TanStack. Reproduces
`Maximum update depth exceeded` on demand, and every ingredient has a control
that switches it off.

## What React thresholds

At the end of each commit:

```js
// react-dom 19.2, commitRootImpl
if ((committedLanes & 261930) && (root.pendingLanes & 42)) nestedUpdateCount++
else nestedUpdateCount = 0
```

`42` is `SyncLane | InputContinuousLane | DefaultLane`. The counter increments on
a commit that finishes with such work **already queued**, and resets to zero
otherwise. Error 185 needs an unbroken run of 51. So the question is never "how
many renders" — it is "why did no commit in that stretch end with an empty
queue".

## The mechanism

Two producers, on two different lanes, that re-arm each other **without ever
yielding to the event loop**:

- a **layout effect** that stores a freshly allocated value when a prop changes.
  Layout effects run inside the commit at discrete priority, so this schedules a
  **Sync** update while the commit is still in progress, and the fresh value
  means React cannot bail out.
- an effect with **no dependency array** that stores a freshly allocated value.
  It therefore runs after *every* render, scheduling a **Default** update, again
  with no possible bail-out.

React cannot merge Sync and Default into one render, so it alternates. Each
commit services one lane and the other producer has already re-armed the other,
so the queue is never observed empty. Add commits slow enough that pointer
events keep arriving and the counter climbs two per input event until it throws:

```
40 -> 2   InputCont|Default -> Sync      nest … 45, 47, 49, 51
34 -> 32  Sync|Default      -> Default   nest … 46, 48, 50
```

That is the same alternation a Replay recording shows in the real table, where
the Sync producer is `@rc-component/trigger` (layout effects plus popup-ref
re-attach) and the Default producer is `@rc-component/portal`:

```js
// @rc-component/portal@2.2.1, es/Portal.js — no dependency array
React.useEffect(() => {
  const customizeContainer = getPortalContainer(getContainer);
  setInnerContainer(() => customizeContainer ?? null);
});
```

## Run it

```sh
pnpm exec vite --config debug/react-185-minimal/vite.config.ts   # terminal 1
node debug/react-185-minimal/drive.mjs                           # terminal 2
```

Exit code 0 means it reproduced. Measured on pristine react-dom 19.2.8:

| `Q=` | result |
|---|---|
| `sync=1&defmode=render&cost=20` (default) | **throws, 4/4 runs, at move 68–69** |
| `sync=0&defmode=render&cost=20` | no error — the Sync producer is required |
| `sync=1&defmode=off&cost=20` | no error — the Default producer is required |
| `sync=1&defmode=change&cost=20` | no error — Default must fire per *render*, not per change |
| `sync=1&defmode=render&cost=0` | no error — commits must be slow enough that input keeps arriving |

One Sync producer is enough; the count does not matter. The busy-wait stands in
for a genuinely expensive render — in the real table that is 60 rows of adapter
components.
