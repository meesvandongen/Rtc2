---
'@mvd/table': patch
---

A toolbar with nothing in it is no longer drawn.

Pagination is the bottom toolbar's only built-in occupant, so
`enablePagination={false}` used to leave a 17px band of surface under a
full-width border — most visible under a column footer or a sticky footer,
where it read as a second, empty footer row. The bar now goes with the
pagination, and the top toolbar does the same once the search box, the internal
actions and every chip are gone.

Either bar still returns the moment it has something to say — a selection
count, an active filter chip — so pass `enableTopToolbar={false}` when a table
must keep its height whatever the rows are doing. Content from
`renderTopToolbarActions` and `renderBottomToolbarActions` always keeps its bar.
