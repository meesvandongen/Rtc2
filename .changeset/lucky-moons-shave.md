---
'@mvd/table': minor
---

Add a `Label` slot to the component registry, so the text over a field in the
modal editor and the filter panel comes from the host's design system like every
control around it. The built-in implementation renders the same span as before,
so nothing changes for a table that does not override it.

The slot is presentational: the table keeps ownership of the association — the
modal editor still wraps each field in a `<label>`, and every control still
carries its own `aria-label`. An adapter whose library labels with a `<label>`
element should render it as a span; React Aria's `Label` takes an `elementType`
for exactly that, and nesting one inside the table's own `<label>` is invalid.
