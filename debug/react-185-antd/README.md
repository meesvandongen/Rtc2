# React error 185 with real Ant Design

Reproduces `Maximum update depth exceeded` using **antd itself** — one overlay,
a pointer drag, and nothing else. No table, no TanStack, no component registry.
Then proves which line in Ant's dependency tree is responsible.

## Ingredients

One mounted Ant overlay supplies both halves of the cycle:

- **Default-lane producer** — `@rc-component/portal@2.2.1`, `es/Portal.js`. Its
  container effect has **no dependency array**, so it runs after every render
  and stores a freshly built value, which React cannot bail out of:

  ```js
  React.useEffect(() => {
    const customizeContainer = getPortalContainer(getContainer);
    setInnerContainer(() => customizeContainer ?? null);
  });
  ```

- **Sync-lane producer** — `@rc-component/trigger`. Mounting a `Trigger` runs its
  layout effects and attaches its popup ref *inside the commit*, at discrete
  priority. `?remount=on` keys the overlay by the dragged value so it remounts
  per change, which is what a Replay recording of the real table shows: its
  in-commit `Trigger` updates arrive with the mount flag still unset.

React cannot merge Sync with Default, so it alternates; each commit services one
lane while the other producer has already re-armed the other; the queue is never
observed empty. Given commits slow enough that pointer events keep arriving, the
counter climbs to 51 and throws.

Without the Sync producer the Default update simply merges into the next input
render (`committed 40 -> pending 0`) and the counter resets every time — which is
why a *static* Ant overlay does not reproduce this.

## Run it

```sh
pnpm exec vite --config debug/react-185-antd/vite.config.ts   # terminal 1
node debug/react-185-antd/drive.mjs                           # terminal 2
```

Exit code 0 means it reproduced. `PORT` and `VITE_CACHE` are honoured so two
arms of an A/B get their own server and their own dependency cache — sharing
either silently serves a stale bundle, which invalidated three earlier
comparisons.

| `Q=` | result |
|---|---|
| `antd=on&cost=20&remount=on` | **throws, 5/5 runs, at move 56–63** |
| `antd=off&cost=20&remount=on` | no error — the Ant overlay is required |
| `antd=on&cost=20` (no remount) | no error — the Sync producer is required |
| `antd=on&open=off&cost=20&remount=on` | no error — the popup must be mounted |
| `antd=on&cost=0&remount=on` | no error — commits must be slow enough |

## The proof it is rc-portal

Patching only that one effect — adding a dependency array and an identity
bail-out — with the served bundle verified to contain the patched code and not
the original:

| rc-portal | result |
|---|---|
| upstream | **5 / 5 threw** |
| patched | **0 / 5**, clean |

Nothing else changed between the two arms.
