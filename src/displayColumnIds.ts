import type { DataTableLocalization } from './locale'

/**
 * Identity of the component-generated columns.
 *
 * Split out from `displayColumns.tsx`, which pulls in the cells those columns
 * render: the ids and their labels are plain data, and `utils.ts` needs them
 * without dragging the component tree along behind.
 */

/** Stable ids for the component-generated columns, exported so consumers can
 *  target them in `columnOrder`, `columnPinning`, `columnVisibility` and CSS. */
export const DISPLAY_COLUMN_IDS = {
  drag: 'rtc-row-drag',
  select: 'rtc-select',
  expand: 'rtc-expand',
  rowNumber: 'rtc-row-number',
  actions: 'rtc-row-actions',
} as const

export type DisplayColumnId = (typeof DISPLAY_COLUMN_IDS)[keyof typeof DISPLAY_COLUMN_IDS]

const DISPLAY_ID_SET = new Set<string>(Object.values(DISPLAY_COLUMN_IDS))

export function isDisplayColumnId(id: string): boolean {
  return DISPLAY_ID_SET.has(id)
}

/** The display columns that still render on a group row. */
const GROUPED_ROW_DISPLAY_IDS = new Set<string>([
  DISPLAY_COLUMN_IDS.expand,
  DISPLAY_COLUMN_IDS.select,
  DISPLAY_COLUMN_IDS.rowNumber,
])

/**
 * Whether a column renders its cell on a group row.
 *
 * A group row keeps its expand chevron, checkbox and row number; the drag grip
 * and the row actions address a single record, so they stay blank.
 */
export function rendersOnGroupedRow(columnId: string): boolean {
  return !isDisplayColumnId(columnId) || GROUPED_ROW_DISPLAY_IDS.has(columnId)
}

/** Which localized string names each display column. */
const DISPLAY_COLUMN_LABEL_KEYS = {
  [DISPLAY_COLUMN_IDS.drag]: 'move',
  [DISPLAY_COLUMN_IDS.select]: 'select',
  [DISPLAY_COLUMN_IDS.expand]: 'expand',
  [DISPLAY_COLUMN_IDS.rowNumber]: 'rowNumbers',
  [DISPLAY_COLUMN_IDS.actions]: 'actions',
} as const satisfies Record<DisplayColumnId, keyof DataTableLocalization>

/**
 * The translated name of a display column, or `undefined` for anything else.
 *
 * These columns render their header through a function — a checkbox, a toggle,
 * a localized string — so there is no static `header` string to read a name
 * from, and the column-visibility menu used to list them by their raw id
 * ("rtc-row-actions"). The id is the wrong thing to show twice over: it is
 * internal, and it is English.
 */
export function getDisplayColumnLabel(
  id: string,
  localization: DataTableLocalization,
): string | undefined {
  const key = DISPLAY_COLUMN_LABEL_KEYS[id as DisplayColumnId]
  return key === undefined ? undefined : localization[key]
}
