---
'@mvd/table': minor
---

Lay the toolbar out yourself with `toolbarLayout`.

Each bar now has a `start`, a `center` and an `end`, and `toolbarLayout` says
what goes in each of them, in order:

```tsx
<DataTable
  toolbarLayout={{
    top: { start: ['search'] },
    bottom: { end: ['pagination', 'export'] },
  }}
  toolbarItems={{ export: ({ table }) => <ExportButton table={table} /> }}
/>
```

Name an occupant to place it; everything you leave unnamed keeps its default
place, so a layout only has to describe what it moves. An id named twice is
drawn twice — which is all `paginationPosition="both"` ever meant — a bar takes
an array of rows, so the chips can have a line of their own, and
`{ group: [...] }` keeps a set of icons clustered wherever you put them.
`toolbarItems` registers content of your own under an id the layout can place,
which the `render*ToolbarActions` slots could not do: they append to one fixed
point. Below `mobileBreakpoint`, `toolbarLayout.narrow` replaces whichever bars
it names.

Nothing is rearranged by default and every existing option still means what it
did. Two structural changes come with it, for anyone styling the bar directly
rather than through `classNames` and `cssVars`: each bar's occupants now sit in
`.rtc-toolbar-row` and `.rtc-toolbar-region` elements, and `.rtc-toolbar-spacer`
and `.rtc-toolbar-actions` are gone — the regions do the spacing, and a cluster
is `.rtc-toolbar-group`, whose gap is the new `--rtc-toolbar-group-gap`.
