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
