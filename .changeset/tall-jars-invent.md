---
'@mvd/table': minor
---

Filters open in a drawer on mobile.

Below `mobileBreakpoint` (640px by default) the header funnel opens its column's
editor in a modal bottom sheet, the docked filter panel becomes a full-width
sheet, and the toolbar always offers the funnel that opens it — a popover
anchored to a 24px button and a 280px docked pane are both unusable on a phone.
Opt out with `enableMobileFilterDrawer={false}`.

The sheet never opens by itself: `initialState.showFilterPanel` and
`filterDisplayMode: 'panel'` mean "the pane starts open beside the table",
which is not the same request as "a modal covers the data on arrival". In
drawer mode the surface opens on a gesture only — including across a resize,
where a pane left open does not become an overlay.

The sheet is a new `Drawer` registry component, so it can be replaced like every
other overlay; adapters for MUI, Radix/shadcn and Mantine ship with the
Storybook examples. The built-in one is a native modal `<dialog>` — the top
layer, backdrop, focus trap and Escape come from the browser, the slide-in is
CSS, and the only script is swipe-down-to-dismiss.

Also adds `DataTableFilterDrawer`, `useMediaQuery`/`useIsMobile`,
`table.isMobile`, and the `close`/`done` localization strings.
