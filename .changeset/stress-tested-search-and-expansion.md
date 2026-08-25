---
'@mvd/table': patch
---

Fix two bugs a stress test found: a search box that never commits while the
data churns, and grouped rows that refuse to open while a search is active.

- **The debounced search survives a table that re-renders faster than the
  debounce.** `useTable` returns a fresh instance object on every render, and
  the effect that commits the search depended on it — so every render cleared
  the pending timer. A table whose `data` is replaced more often than every
  200ms (a live feed, a polling query) kept the typed term in the box and never
  filtered a row. The instance is read through a ref now, so only the term
  itself restarts the debounce.

- **`enableGlobalFilterModes` no longer resets expansion on every state
  change.** With a mode menu in the search field the global filter value is an
  object (`{ query, mode }`), and it was rebuilt whenever any state slice
  changed. TanStack reads a new object as a changed filter and its auto-resets
  fire on that, so with a term in the box, expanding a grouped row wiped the
  expansion in the same commit and the group could not be opened at all — nor
  could a detail panel, and the page index reset with it. The wrapper is now
  memoized on the query and the mode alone.
