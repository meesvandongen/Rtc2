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

A region you write is exactly what that region holds, so the same sentence both
places and removes — `top: { end: ['search'] }` puts the search box at the top
right and leaves the icon cluster out, and `top: { end: [] }` empties the corner
altogether. A region you do not write keeps its default, so a layout still only
describes the parts of the bar it cares about, and `rest` gives a region back
what it would have held: `['search', 'rest']` puts the search box at the front
without dropping what was beside it. `rest` is scoped to the region it is
written in, so it means the same thing everywhere and two of them compose
rather than compete.

An id named twice is drawn twice, a bar takes an array of rows, so the chips can
have a line of their own, and `{ group: [...] }` keeps a set of icons clustered
wherever you put them. Below `mobileBreakpoint`, `toolbarLayout.narrow` replaces
whichever bars it names.

`toolbarItems` registers content of your own under an id the layout can place —
in either bar, in any region, in any order, and twice if you name it twice.

**Breaking: `paginationPosition` is removed.** Where the pagination control
sits is the layout's to say, and the three values it offered are three things a
layout already spells: name `pagination` in a region of the top bar to move it
there, in both bars to draw it in both, and leave it alone for the bottom bar it
has always defaulted to.

```tsx
paginationPosition="top"   →  toolbarLayout={{ top: { end: ['rest', 'pagination'] } }}
paginationPosition="both"  →  toolbarLayout={{ top: { end: ['rest', 'pagination'] },
                                              bottom: { end: ['pagination'] } }}
```

**Breaking: `renderTopToolbarActions`, `renderBottomToolbarActions` and
`renderToolbarInternalActions` are removed.** Each appended to one fixed point,
which is the one thing `toolbarItems` does better, so keeping both would have
been two ways to do it with only one of them able to say where. The ids of the
same name are a direct swap and carry the place the slot had, so nothing has to
move with them:

```tsx
// before
renderTopToolbarActions={({ table }) => <Bulk table={table} />}
renderBottomToolbarActions={() => <Updated />}
renderToolbarInternalActions={({ table }) => <Sync table={table} />}

// after — same places, and now movable
toolbarItems={{
  'top-actions': ({ table }) => <Bulk table={table} />,
  'bottom-actions': <Updated />,
  'internal-actions': ({ table }) => <Sync table={table} />,
}}
```

Nothing is rearranged by default and every other option still means what it did.
Two structural changes come with it, for anyone styling the bar directly rather
than through `classNames` and `cssVars`: each bar's occupants now sit in
`.rtc-toolbar-row` and `.rtc-toolbar-region` elements, and `.rtc-toolbar-spacer`
and `.rtc-toolbar-actions` are gone — the regions do the spacing, and a cluster
is `.rtc-toolbar-group`, whose gap is the new `--rtc-toolbar-group-gap`.
