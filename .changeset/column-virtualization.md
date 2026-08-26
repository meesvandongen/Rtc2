---
'@mvd/table': minor
---

Implement `enableColumnVirtualization`. The option has been on
`DataTableOptions` since the beginning, and nothing read it: a 252-column table
mounted 252 cells in every row it mounted, so the two virtualization axes
multiplied instead of bounding each other.

A horizontal virtualizer now windows the leaf columns, and the header, the
body, the footer and the loading skeleton all render that one window — the
same object reaches every row, so there is no way for a cell to land under the
wrong header. The columns left out are represented by padding on each row
rather than by spacer cells, so nothing is added to the DOM that keyboard
navigation, `colSpan` or a stylesheet would have to know about, and each
rendered cell states its `aria-colindex` rather than leaving a reader to count
the cells that are present.

Three things stay mounted at every scroll offset, because dropping them breaks
something a window is not entitled to break:

- **Pinned columns.** A sticky column that unmounted would leave the edge of
  the table blank. The gap is measured from just past the pinned block, so the
  pins hold their position while everything else slides underneath.
- **The column being dragged**, whose pointer handlers live on the header that
  would otherwise unmount under the pointer.
- **Measured header floors.** `enableHeaderContentFit` reads a header's
  `min-content` width, which can only be done while the header is mounted, so
  columns are measured as they arrive from off-screen and keep that floor once
  they leave. Widths that the offsets are built from now come from the same
  `max(size, minSize, header floor)` the stylesheet resolves, and a resize, a
  density change or a newly measured header re-measures the virtualizer.

The option is declined, rather than half-applied, in the two cases where a
window cannot be laid out correctly: an explicit `layoutMode="semantic"`, where
the browser's table algorithm resolves widths itself, and grouped headers,
where a range of leaf columns says nothing about the header spanning several
of them. Like row virtualization it otherwise switches `layoutMode` to `grid`
on its own. `data-rtc-column-virtual` on the root reports which way it went.
