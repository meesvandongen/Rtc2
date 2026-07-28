/**
 * Ready-made variable sets for `<DataTable cssVars={...} />`.
 *
 * Each preset is only a map of the custom properties declared in `styles.css`,
 * which is the point: the structural CSS never changes, so a table can be
 * restyled to match a design system without overriding a single selector.
 * Copy one and adjust, or build your own from the same keys.
 */
export type DataTableTheme = Record<string, string>

/** Material 3 — filled surfaces, generous rows, uppercase headers. */
export const materialTheme: DataTableTheme = {
  '--rtc-color-surface': '#fffbfe',
  '--rtc-color-surface-sunken': '#f4eff4',
  '--rtc-color-surface-raised': '#ffffff',
  '--rtc-color-text': '#1c1b1f',
  '--rtc-color-text-muted': '#49454f',
  '--rtc-color-border': '#e7e0ec',
  '--rtc-color-border-strong': '#cac4d0',
  '--rtc-color-accent': '#6750a4',
  '--rtc-color-accent-hover': '#54408f',
  '--rtc-color-accent-subtle': 'rgb(103 80 164 / 8%)',
  '--rtc-radius': '12px',
  '--rtc-radius-sm': '8px',
  '--rtc-row-height-comfortable': '52px',
  '--rtc-cell-padding-x': '16px',
  '--rtc-header-font-size': '0.75rem',
  '--rtc-header-font-weight': '500',
  '--rtc-header-text-transform': 'uppercase',
  '--rtc-header-letter-spacing': '0.08em',
  '--rtc-header-bg': 'transparent',
  '--rtc-header-color': '#49454f',
  '--rtc-shadow-menu': '0 4px 12px rgb(0 0 0 / 15%)',
}

/** shadcn/ui — flat, low-contrast borders, tight radii. */
export const shadcnTheme: DataTableTheme = {
  '--rtc-color-surface': '#ffffff',
  '--rtc-color-surface-sunken': '#ffffff',
  '--rtc-color-surface-raised': '#ffffff',
  '--rtc-color-text': '#09090b',
  '--rtc-color-text-muted': '#71717a',
  '--rtc-color-border': '#e4e4e7',
  '--rtc-color-border-strong': '#e4e4e7',
  '--rtc-color-accent': '#18181b',
  '--rtc-color-accent-hover': '#27272a',
  '--rtc-color-accent-contrast': '#fafafa',
  '--rtc-color-accent-subtle': 'rgb(24 24 27 / 5%)',
  '--rtc-radius': '6px',
  '--rtc-radius-sm': '4px',
  '--rtc-row-height-comfortable': '48px',
  '--rtc-cell-padding-x': '16px',
  '--rtc-header-bg': 'transparent',
  '--rtc-header-color': '#71717a',
  '--rtc-header-font-weight': '500',
  '--rtc-row-bg-hover': 'rgb(9 9 11 / 4%)',
  '--rtc-font-size': '0.875rem',
}

/** Ant Design — grey header band, square corners, compact controls. */
export const antTheme: DataTableTheme = {
  '--rtc-color-surface': '#ffffff',
  '--rtc-color-surface-sunken': '#fafafa',
  '--rtc-color-text': 'rgb(0 0 0 / 88%)',
  '--rtc-color-text-muted': 'rgb(0 0 0 / 45%)',
  '--rtc-color-border': '#f0f0f0',
  '--rtc-color-border-strong': '#d9d9d9',
  '--rtc-color-accent': '#1677ff',
  '--rtc-color-accent-hover': '#4096ff',
  '--rtc-color-accent-subtle': '#e6f4ff',
  '--rtc-radius': '8px',
  '--rtc-radius-sm': '4px',
  '--rtc-row-height-comfortable': '54px',
  '--rtc-cell-padding-x': '16px',
  '--rtc-header-bg': '#fafafa',
  '--rtc-header-font-weight': '600',
  '--rtc-row-bg-hover': '#fafafa',
  '--rtc-row-bg-selected': '#e6f4ff',
}

/** Linear — dense, dark-first, hairline borders, muted accent. */
export const linearTheme: DataTableTheme = {
  '--rtc-color-surface': '#08090a',
  '--rtc-color-surface-sunken': '#0f1011',
  '--rtc-color-surface-raised': '#141516',
  '--rtc-color-text': '#f7f8f8',
  '--rtc-color-text-muted': '#8a8f98',
  '--rtc-color-border': '#1c1d1f',
  '--rtc-color-border-strong': '#26282b',
  '--rtc-color-accent': '#5e6ad2',
  '--rtc-color-accent-hover': '#828fff',
  '--rtc-color-accent-contrast': '#ffffff',
  '--rtc-color-accent-subtle': 'rgb(94 106 210 / 18%)',
  '--rtc-radius': '8px',
  '--rtc-radius-sm': '4px',
  '--rtc-row-height-comfortable': '36px',
  '--rtc-cell-padding-x': '12px',
  '--rtc-font-size': '0.8125rem',
  '--rtc-header-bg': 'transparent',
  '--rtc-header-font-weight': '500',
  '--rtc-header-color': '#8a8f98',
  '--rtc-row-bg-hover': 'rgb(255 255 255 / 4%)',
  '--rtc-row-bg-even': 'transparent',
}

/** Spreadsheet — full grid lines, monospace numerals, minimal chrome. */
export const spreadsheetTheme: DataTableTheme = {
  '--rtc-color-surface': '#ffffff',
  '--rtc-color-surface-sunken': '#f8f9fa',
  '--rtc-color-text': '#202124',
  '--rtc-color-border': '#d4d7dc',
  '--rtc-color-border-strong': '#b3b6bb',
  '--rtc-color-accent': '#137333',
  '--rtc-color-accent-subtle': 'rgb(19 115 51 / 10%)',
  '--rtc-radius': '0px',
  '--rtc-radius-sm': '0px',
  '--rtc-row-height-comfortable': '30px',
  '--rtc-row-height-compact': '24px',
  '--rtc-cell-padding-x': '8px',
  '--rtc-cell-padding-y-comfortable': '2px',
  '--rtc-font-family': 'ui-monospace, "SF Mono", "Roboto Mono", menlo, monospace',
  '--rtc-font-size': '0.8125rem',
  '--rtc-header-bg': '#f8f9fa',
  '--rtc-header-font-weight': '500',
  '--rtc-header-align': 'center',
  '--rtc-transition': '0ms',
}

/** Soft — rounded, airy, pastel accent; suits marketing dashboards. */
export const softTheme: DataTableTheme = {
  '--rtc-color-surface': '#ffffff',
  '--rtc-color-surface-sunken': '#f7f5ff',
  '--rtc-color-text': '#312e44',
  '--rtc-color-text-muted': '#7b7891',
  '--rtc-color-border': '#ece9f7',
  '--rtc-color-border-strong': '#ddd8f0',
  '--rtc-color-accent': '#7c5cff',
  '--rtc-color-accent-hover': '#6a48f5',
  '--rtc-color-accent-subtle': 'rgb(124 92 255 / 10%)',
  '--rtc-radius': '16px',
  '--rtc-radius-sm': '10px',
  '--rtc-row-height-comfortable': '56px',
  '--rtc-cell-padding-x': '20px',
  '--rtc-header-bg': 'transparent',
  '--rtc-header-color': '#7b7891',
  '--rtc-header-font-weight': '600',
  '--rtc-row-bg-even': 'rgb(124 92 255 / 3%)',
  '--rtc-shadow-menu': '0 12px 32px -12px rgb(49 46 68 / 30%)',
}

/** High contrast — thick borders, no subtle greys, accessibility-first. */
export const highContrastTheme: DataTableTheme = {
  '--rtc-color-surface': '#ffffff',
  '--rtc-color-surface-sunken': '#ffffff',
  '--rtc-color-text': '#000000',
  '--rtc-color-text-muted': '#000000',
  '--rtc-color-border': '#000000',
  '--rtc-color-border-strong': '#000000',
  '--rtc-color-accent': '#0000ee',
  '--rtc-color-accent-contrast': '#ffffff',
  '--rtc-color-accent-subtle': '#ffff00',
  '--rtc-border-width': '2px',
  '--rtc-radius': '0px',
  '--rtc-radius-sm': '0px',
  '--rtc-header-font-weight': '700',
  '--rtc-row-bg-hover': '#ffff00',
  '--rtc-row-bg-selected': '#ffff00',
  '--rtc-focus-ring': '0 0 0 3px #ffffff, 0 0 0 6px #0000ee',
}

export const dataTableThemes = {
  material: materialTheme,
  shadcn: shadcnTheme,
  ant: antTheme,
  linear: linearTheme,
  spreadsheet: spreadsheetTheme,
  soft: softTheme,
  highContrast: highContrastTheme,
} as const

export type DataTableThemeName = keyof typeof dataTableThemes
