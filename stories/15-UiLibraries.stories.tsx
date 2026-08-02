import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { MantineProvider } from '@mantine/core'

import { DataTable, defaultComponents, type DataTableComponents } from '../src'
import { createMantineComponents } from './adapters/mantine'
import { createMuiComponents } from './adapters/mui'
import { createRadixComponents } from './adapters/radix'
import { makePeople, personColumns, type Person } from './fixtures'

const data = makePeople(60)

const meta: Meta = {
  title: 'DataTable/15 UI Libraries',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Everything the table renders that is interactive comes from the component
 * registry, so a whole design system can be swapped in with one prop. These
 * stories exist to prove the contract against three libraries with genuinely
 * different API shapes — if it holds for all three, it is at the right level.
 */

/**
 * The Storybook toolbar's theme, as the value each library wants.
 *
 * The table itself needs nothing here — it is themed by `data-rtc-theme` on an
 * ancestor, which the preview sets. An adapted table is a different matter:
 * MUI and Mantine each own their palette, and neither reads a CSS attribute of
 * ours, so a dark table with a light `ThemeProvider` renders dark rows behind
 * white menus. Both providers are told the mode explicitly.
 */
type StoryContext = { globals: Record<string, unknown> }
const colorSchemeOf = (context: StoryContext): 'light' | 'dark' =>
  context.globals.theme === 'dark' ? 'dark' : 'light'

const commonOptions = {
  columns: personColumns,
  data,
  getRowId: (row: Person) => row.id,
  enableRowSelection: true,
  enableColumnActions: true,
  enableColumnPinning: true,
  enableFilterModes: true,
  enableGrouping: true,
  enableEditing: true,
  editMode: 'modal' as const,
  filterDisplayMode: 'popover-and-panel' as const,
  height: 560,
  enableStickyHeader: true,
  initialState: { showGlobalFilter: true, showFilterPanel: true },
}

/** The built-in primitives — the baseline every adapter is compared against. */
export const BuiltInPrimitives: Story = {
  render: () => (
    <>
      <p className="sb-note">
        No <code>components</code> prop: the dependency-free defaults that ship with the package.
      </p>
      <DataTable {...commonOptions} />
    </>
  ),
}

/**
 * MUI.
 *
 * Exercises the anchor-based overlay model: `Menu` and `Popover` position
 * against an `anchorEl`, so the adapter clones the trigger element the
 * registry hands it. A render-prop trigger would have left MUI nothing to
 * anchor to.
 */
export const MaterialUi: Story = {
  render: function MaterialUi(_args, context) {
    const mode = colorSchemeOf(context)
    const components = useMemo<DataTableComponents>(
      () => createMuiComponents(defaultComponents),
      [],
    )
    const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <p className="sb-note">
          Buttons, inputs, menus, popovers, the modal editor and the progress bar are all MUI
          components. Only the table markup is ours.
        </p>
        <DataTable
          {...commonOptions}
          components={components}
          // MUI's own primary, per mode — `#1976d2` is unreadable on a dark
          // surface, and it is the colour the adapter's buttons already use.
          cssVars={{
            '--rtc-color-accent': mode === 'dark' ? '#90caf9' : '#1976d2',
            '--rtc-color-accent-subtle':
              mode === 'dark' ? 'rgb(144 202 249 / 14%)' : 'rgb(25 118 210 / 8%)',
            '--rtc-row-height-comfortable': '52px',
            '--rtc-header-font-weight': '500',
          }}
        />
      </ThemeProvider>
    )
  },
}

/**
 * Radix, in a shadcn/ui flavour.
 *
 * Exercises compound components and `asChild`: Radix merges its props and ref
 * onto the trigger element, which works because the registry passes a real
 * element and the built-in buttons forward their refs.
 */
export const RadixShadcn: Story = {
  render: function RadixShadcn(_args, context) {
    const mode = colorSchemeOf(context)
    const components = useMemo<DataTableComponents>(
      () => createRadixComponents(defaultComponents),
      [],
    )
    return (
      <>
        <p className="sb-note">
          Radix primitives with a shadcn-like stylesheet. The adapter styles itself from the same{' '}
          <code>--rtc-*</code> variables, so it follows the table's theme.
        </p>
        <DataTable
          {...commonOptions}
          components={components}
          // shadcn's primary inverts between its themes — near-black on light,
          // near-white on dark — so the accent has to invert with it. Pinned to
          // the light pair, every primary button in dark mode was black text on
          // black.
          cssVars={{
            '--rtc-color-accent': mode === 'dark' ? '#fafafa' : '#18181b',
            '--rtc-color-accent-contrast': mode === 'dark' ? '#18181b' : '#fafafa',
            '--rtc-color-accent-subtle':
              mode === 'dark' ? 'rgb(250 250 250 / 12%)' : 'rgb(24 24 27 / 6%)',
            '--rtc-radius': '6px',
            '--rtc-header-bg': 'transparent',
          }}
        />
      </>
    )
  },
}

/**
 * Mantine.
 *
 * The adapter that justifies the data-driven parts of the contract. Mantine's
 * `Select` and `MultiSelect` take a `data` array and render a combobox rather
 * than a native `<select>` — a children-based option API could not be backed by
 * them at all. It also swaps in a real `DateInput`, showing the seam allows
 * richer controls, not just restyled ones.
 */
export const Mantine: Story = {
  render: function Mantine(_args, context) {
    const mode = colorSchemeOf(context)
    const components = useMemo<DataTableComponents>(
      () => createMantineComponents(defaultComponents),
      [],
    )
    return (
      // `forceColorScheme`, not `defaultColorScheme`: the scheme is driven by
      // the Storybook toolbar, and Mantine's default would let a stored
      // preference or the OS win over it.
      <MantineProvider forceColorScheme={mode}>
        <p className="sb-note">
          Menus and selects are built from data arrays, and date filters use Mantine's{' '}
          <code>DateInput</code> instead of a native date input.
        </p>
        <DataTable
          {...commonOptions}
          components={components}
          // Mantine's own tokens rather than the hex values they resolve to.
          //
          // Picking colours by hand meant picking some of them: the header was
          // pinned to a Mantine grey while the surface under it stayed on the
          // table's default slate, so the head of a dark table read grey
          // against a blue body. Mapping the palette wholesale keeps every
          // surface on one scale, and — since Mantine re-declares these per
          // scheme — it follows the light/dark switch without a branch here.
          cssVars={{
            '--rtc-color-surface': 'var(--mantine-color-body)',
            // Mantine has no single token for "one step off the body", so the
            // two shades it uses for that — `gray.0` and `dark.6` — are picked
            // per scheme. `light-dark()` reads the `color-scheme` the table
            // already declares, which is the same signal Mantine itself uses.
            '--rtc-color-surface-sunken':
              'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
            '--rtc-color-surface-raised': 'var(--mantine-color-default)',
            '--rtc-color-text': 'var(--mantine-color-text)',
            '--rtc-color-text-muted': 'var(--mantine-color-dimmed)',
            // `Table`'s own divider colour, so rows are separated the way a
            // Mantine table separates them.
            '--rtc-color-border':
              'light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
            '--rtc-color-border-strong': 'var(--mantine-color-default-border)',
            '--rtc-color-accent': 'var(--mantine-primary-color-filled)',
            '--rtc-color-accent-hover': 'var(--mantine-primary-color-filled-hover)',
            '--rtc-color-accent-contrast': 'var(--mantine-primary-color-contrast)',
            '--rtc-color-accent-subtle': 'var(--mantine-primary-color-light)',
            '--rtc-color-danger': 'var(--mantine-color-error)',
            '--rtc-font-family': 'var(--mantine-font-family)',
            '--rtc-radius': 'var(--mantine-radius-default)',
            '--rtc-radius-sm': 'var(--mantine-radius-sm)',
            '--rtc-row-height-comfortable': '54px',
          }}
        />
      </MantineProvider>
    )
  },
}

/** Switch libraries at runtime against one identical table. */
export const SideBySideSwitcher: Story = {
  render: function SideBySideSwitcher(_args, context) {
    const mode = colorSchemeOf(context)
    const [library, setLibrary] = useState<'built-in' | 'mui' | 'radix' | 'mantine'>('built-in')

    const components = useMemo<DataTableComponents | undefined>(() => {
      if (library === 'mui') return createMuiComponents(defaultComponents)
      if (library === 'radix') return createRadixComponents(defaultComponents)
      if (library === 'mantine') return createMantineComponents(defaultComponents)
      return undefined
    }, [library])

    const table = (
      <DataTable
        {...commonOptions}
        height={480}
        components={components}
        initialState={{ showGlobalFilter: true, showFilterPanel: false }}
      />
    )

    return (
      <>
        <div className="sb-row">
          {(['built-in', 'mui', 'radix', 'mantine'] as const).map((name) => (
            <button
              key={name}
              type="button"
              className="rtc-button"
              data-testid={`ui-${name}`}
              onClick={() => setLibrary(name)}
              style={library === name ? { fontWeight: 600, borderColor: 'currentColor' } : undefined}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="sb-note">
          Same columns, same data, same options — only <code>components</code> changes.
        </p>
        {library === 'mui' ? (
          <ThemeProvider theme={createTheme({ palette: { mode } })}>{table}</ThemeProvider>
        ) : library === 'mantine' ? (
          <MantineProvider forceColorScheme={mode}>{table}</MantineProvider>
        ) : (
          table
        )}
      </>
    )
  },
}

/**
 * A registry override does not have to be a whole design system — supply one
 * component and the rest keep their defaults.
 */
export const PartialOverride: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Only <code>Badge</code> is overridden here; every other control is the built-in one.
      </p>
      <DataTable
        {...commonOptions}
        components={{
          Badge: ({ children, onRemove, removeLabel }) => (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 10px',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #f472b6, #a78bfa)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {children}
              {onRemove ? (
                <button
                  type="button"
                  aria-label={removeLabel}
                  onClick={onRemove}
                  style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}
                >
                  ×
                </button>
              ) : null}
            </span>
          ),
        }}
        initialState={{ showGlobalFilter: true, showFilterPanel: false }}
      />
    </>
  ),
}
