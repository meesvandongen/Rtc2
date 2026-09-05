/**
 * Shared Storybook `argTypes` for props that show up as controls across many
 * story files. Spreading these into a file's `meta.argTypes` keeps the
 * widget, description and category consistent everywhere `isLoading` et al.
 * are exposed, instead of re-describing them per file.
 */

/** The table's four loading/error presentations, and their knobs. */
export const loadingArgTypes = {
  isLoading: {
    control: 'boolean',
    description:
      'Cold-load state. With an empty body this renders skeleton rows; combined with `showProgressBars` (or over existing rows) it renders a slim progress bar instead.',
    table: { category: 'Loading' },
  },
  showProgressBars: {
    control: 'boolean',
    description: 'Show the slim progress bar instead of skeleton rows while `isLoading`.',
    table: { category: 'Loading' },
  },
  isSaving: {
    control: 'boolean',
    description: 'Shows the same progress bar as `isLoading`, without touching the row body.',
    table: { category: 'Loading' },
  },
  isLoadingError: {
    control: 'boolean',
    description: 'Replaces the body with the built-in error state.',
    table: { category: 'Loading' },
  },
  errorMessage: {
    control: 'text',
    description: 'Message shown by the built-in error state.',
    table: { category: 'Loading' },
  },
  skeletonRowCount: {
    control: { type: 'number', min: 1, max: 20, step: 1 },
    description: 'Number of skeleton rows rendered on a cold load with an empty body.',
    table: { category: 'Loading' },
  },
} as const

/** Row/column presentation knobs that apply regardless of which feature a story demonstrates. */
export const appearanceArgTypes = {
  density: {
    control: 'select',
    options: ['compact', 'comfortable', 'spacious'],
    description:
      'Pins the density, the same way it does for consumers — the toolbar density toggle stops changing anything once this is set. Leave the arg unset to keep the toggle live.',
    table: { category: 'Appearance' },
  },
  layoutMode: {
    control: 'select',
    options: ['semantic', 'grid', 'grid-no-grow'],
    table: { category: 'Appearance' },
  },
  transposed: {
    control: 'boolean',
    description:
      'Flips the axes: one row per column, one column per record. Leave the arg unset to keep the toolbar toggle live, the same way `density` works.',
    table: { category: 'Appearance' },
  },
  enableStripes: { control: 'boolean', table: { category: 'Appearance' } },
  enableRowHover: { control: 'boolean', table: { category: 'Appearance' } },
  enableBorders: {
    control: 'select',
    options: ['horizontal', 'vertical', 'all', 'none'],
    table: { category: 'Appearance' },
  },
  enableStickyHeader: { control: 'boolean', table: { category: 'Appearance' } },
  enableStickyFooter: { control: 'boolean', table: { category: 'Appearance' } },
  direction: {
    control: 'radio',
    options: ['ltr', 'rtl'],
    table: { category: 'Appearance' },
  },
} as const

/**
 * The bands of chrome around the rows, each of which can be switched off.
 *
 * A band that is off leaves nothing behind, and the two toolbars go further
 * than that: either one removes itself once nothing is left to put in it, so
 * `enablePagination: false` alone is enough to clear the bottom bar.
 */
export const chromeArgTypes = {
  enableTopToolbar: { control: 'boolean', table: { category: 'Chrome' } },
  enableBottomToolbar: { control: 'boolean', table: { category: 'Chrome' } },
  enableToolbarInternalActions: {
    control: 'boolean',
    description: 'The search, filter, columns, density and full-screen buttons at the end of the top bar.',
    table: { category: 'Chrome' },
  },
  enableTableHead: {
    control: 'boolean',
    description: 'The `<thead>` row of column headers.',
    table: { category: 'Chrome' },
  },
  enableTableFooter: {
    control: 'boolean',
    description: 'The `<tfoot>` row. Only ever rendered when a column declares a `footer`.',
    table: { category: 'Chrome' },
  },
  enablePagination: {
    control: 'boolean',
    description: 'Also decides whether the bottom bar exists, since pagination is all it holds by default.',
    table: { category: 'Chrome' },
  },
  enableGlobalFilter: { control: 'boolean', table: { category: 'Chrome' } },
} as const
