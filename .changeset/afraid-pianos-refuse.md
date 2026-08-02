---
'@mvd/table': patch
---

Restore the minimum width of a filter popover's contents. `.rtc-filter-popover`
was listed among the containers that are allowed to shrink inside the docked
filter panel, which silently zeroed the 220px floor set on it a few rules
earlier. The built-in overlay was unaffected — its surface carries a wider
minimum of its own — but an adapter whose popover sizes to its contents
collapsed onto its own controls.
