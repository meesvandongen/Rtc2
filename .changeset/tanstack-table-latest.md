---
'@mvd/table': patch
---

Upgrade `@tanstack/react-table` from the `9.0.0-beta.58` prerelease to the
stable `9.1.2`, and `@tanstack/react-virtual` from `3.14.8` to `3.14.9`.

Fix row virtualization mounting no rows at all. The row virtualizer now lives
in the component that renders the scroll container instead of in the table
body below it.

`useVirtualizer` has to resolve `getScrollElement` on its first commit, and
React attaches refs bottom-up: a descendant's layout effect runs before its
ancestor's ref is assigned. Creating the virtualizer in `VirtualBody` — below
the `div` holding the container ref — meant it measured `null` on mount and,
with nothing else prompting a render, never looked again. Keeping the ref and
the virtualizer in the same component, as TanStack's own examples do, makes
the container reachable from the first measurement on.

This was previously masked by an unrelated TanStack Table bug that fired an
auto-reset on mount, which incidentally produced the extra render the
virtualizer needed; that bug was fixed upstream in `9.0.0-beta.76`. The
container is also now picked up correctly if it is ever swapped or remounted.

A table that does not virtualize now builds no virtualizer at all: the
virtualized case wraps the container in a small component that owns the hook
and hands it back, so the container markup stays in one place. The trade-off
is that toggling `enableRowVirtualization` on a live table remounts the scroll
container, resetting its scroll position; the option is treated as fixed for
the lifetime of a table.
