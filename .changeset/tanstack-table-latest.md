---
'@mvd/table': patch
---

Upgrade `@tanstack/react-table` from the `9.0.0-beta.58` prerelease to the
stable `9.1.2`, and `@tanstack/react-virtual` from `3.14.8` to `3.14.9`.

Fix row virtualization never mounting any rows on some renders. `VirtualBody`
read `containerRef.current` on its very first render, before React assigns
refs, so `useVirtualizer` observed `null` and never got a second chance to
find the real scroll container. This used to be masked by an unrelated
TanStack bug where an internal auto-reset fired an extra render on mount;
TanStack fixed that bug in `9.0.0-beta.76`, which removed the accidental
extra render this package was relying on. `VirtualBody` now forces one
render after mount itself, so the virtualizer always gets a real container
to measure.
