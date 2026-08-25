---
'@mvd/table': minor
---

Localize the strings the filter data types contribute, and clean up the rest of
the localization surface.

A data type does more than pick operators: it names them, spells out a
boolean's yes/no, labels its own operands, and summarises a condition for the
toolbar chip. Several of those went straight to the DOM in English no matter
what `localization` said.

- **Operator names are localizable per data type.** `filterOperators` accepts a
  `dataTypeId.operatorId` key, which wins over the bare operator id. This is
  what `enum`'s "Is" (rather than text's "Equals") and `datetime`'s "Is at"
  (rather than `date`'s "Is on") now come from — both were hard-coded on the
  data type and, because the lookup went by operator id alone, were never
  displayed at all.
- **Summary chips are assembled from the strings.** A boolean filter printed
  the raw `true`/`false`, a rolling date window printed the raw unit id
  (`3 day`), the geo bounding box printed "in box", and two conditions on one
  column were joined by a hard-coded " and " / " or ". `describe` now receives
  the table's `localization` instead of reaching for it through a cast.
- **Nested overrides merge instead of replacing.** Naming one date preset used
  to revert the other thirteen to English; the same for `dateUnits`, `bounds`
  and `filterOperators`. `weekdays` stays all-or-nothing — it is positional —
  and is ignored unless it has seven entries.
- **Operand editors take their names from the strings.** The rolling-window
  operand labelled its fields `"… amount"` / `"… unit"`, and both range-slider
  thumbs were announced as `"… minimum"` / `"… maximum"` by the built-in and
  Radix sliders. `RtcRangeSliderProps` gains optional `minLabel`/`maxLabel` so
  an adapter no longer has to invent them; adapters with a single slider label
  can ignore both. New keys: `amount`, `unit`.
- **Grouping reads from the strings too.** A boolean group row showed
  "true"/"false", and nested grouping joined its column names with a comma
  rather than the existing `thenBy`.
- A load error in the toolbar rendered an icon inside a `role="alert"` with no
  text at all — it now carries `errorMessage ?? errorLoadingData`.

Removed thirteen `DataTableLocalization` keys that no code path rendered, so the
type no longer asks translators for strings that cannot appear:
`changeSearchMode`, `clickToCopy`, `copiedToClipboard`, `filterMode`,
`filterVariantEmpty`, `filterVariantNotEmpty`, `pinToBottom`, `pinToTop`,
`resetOrder`, `sortedByColumnAsc`, `sortedByColumnDesc`, `toggleVisibility`,
`unpinAll`. Passing them was already a no-op; it is now a type error.

Also exports `mergeLocalization` and `filterOperatorLabel`, the two functions
that resolve a partial `localization` and an operator's displayed name.
