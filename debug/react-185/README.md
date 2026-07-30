# React error 185 harness

Reproduces `Maximum update depth exceeded` from a long drag on the salary range
slider, outside Storybook, against `src/` as shipped.

## Why this exists

React counts a commit that ends with sync-, continuous- or default-lane work
already queued as a *nested* update, and throws error 185 on the fifty-first in
an **unbroken** row:

```js
// react-dom 19.2, commitRootImpl
if ((committedLanes & 261930) && (root.pendingLanes & 42)) nestedUpdateCount++
else nestedUpdateCount = 0
```

One applied filter takes three commits to settle here, only the last of which
empties the queue. Whether that last commit is reached before the next pointer
event arrives is a race, so **the failure is timing dependent**: it needs a long
drag and does not reproduce every run. That is what the Replay recording is for
— capture a run that did fail, then inspect it.

Measured contributions to the run length, for reference: deferring TanStack's
render-phase store notification takes the reset rate from 33.5% to 48%;
swapping the Ant adapter for the built-in primitives takes it to 50%. Each
inserts roughly one extra non-resetting commit per update. The step from a mean
run of three to an unbroken run of 51 is **not explained**.

## Run it

```sh
pnpm exec vite --config debug/react-185/vite.config.ts     # terminal 1
node debug/react-185/record.mjs                            # terminal 2
```

Exit code 0 means it reproduced, 3 means it did not. Expect several attempts.

Knobs, as `Q='...'` for the driver or query string in a browser:

| knob | default | meaning |
|---|---|---|
| `eager` | `on` | write the filter per pointer move (pre-fix) vs. the shipped delayed commit |
| `antd` | `on` | Ant adapter vs. built-in primitives |
| `pagination` | `off` | off renders every row and reproduces most readily |
| `rows` | `60` | row count |

`Q='eager=off'` should not reproduce — that is the fix under test.

## Record it

The Replay browser is not vendored; install it per machine:

```sh
npx replayio@latest install                    # ~200 MB into ~/.replay
REPLAY=1 node debug/react-185/record.mjs       # record a run
npx replayio@latest list                       # find the recording id
REPLAY_API_KEY=… npx replayio@latest upload <id>
```

The bug does reproduce under recording overhead (observed at move 2417 of
2500), so a failing run is capturable. Uploading sends the recorded execution
to replay.io and needs an API key from your account — `replayio upload` will
otherwise try to open a browser to log in and time out in a headless container.

## What to look for in a recording

1. The throw site in `getRootForUpdatedFiber` — the `setState` that happens to
   be the fifty-first is an innocent bystander, so ignore which component it is.
2. Step back through the preceding commits and read `root.pendingLanes` at the
   end of each. The question is why no commit in that stretch ended with it
   empty, when a single update quiesces in three commits.
3. The known in-commit schedulers, to rule in or out: TanStack's
   `syncExternalStateToBaseAtoms` → `notify` (fires *during* render), Ant's
   `Trigger` ref re-attach and its two `resetReady` layout effects, and
   `table_resetExpanded`, which reallocates `{}` on every filter change.

Already refuted, so do not re-chase: `@rc-component/portal`'s
dependency-array-less `setInnerContainer` effect (patching it changes nothing),
and `useAlign` realignment as *the* cause.
