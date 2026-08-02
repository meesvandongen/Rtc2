---
"@rtc2/react-table": patch
---

Fix dark mode for browser-drawn chrome and for scrollable overlays.

`.rtc-root` and `.rtc-vars` now declare `color-scheme` alongside the palette, so
the parts the browser paints itself follow the theme: the drop-down list of a
native `<select>`, date and number spinners, and default scrollbars. A dark
table no longer opens a white select popup.

Scrollbars are also styled on every scroll container the component owns, not
just the table viewport. The filter menu, the column and row-action menus, the
filter panel, the checkbox list inside a filter and the modal editor were all
falling back to a light scrollbar sitting on a dark surface.
