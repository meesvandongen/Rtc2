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
      <p className="rtc-sb-note">
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
  render: function MaterialUi() {
    const components = useMemo<DataTableComponents>(
      () => createMuiComponents(defaultComponents),
      [],
    )
    const theme = useMemo(() => createTheme({ palette: { mode: 'light' } }), [])
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <p className="rtc-sb-note">
          Buttons, inputs, menus, popovers, the modal editor and the progress bar are all MUI
          components. Only the table markup is ours.
        </p>
        <DataTable
          {...commonOptions}
          components={components}
          cssVars={{
            '--rtc-color-accent': '#1976d2',
            '--rtc-color-accent-subtle': 'rgb(25 118 210 / 8%)',
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
  render: function RadixShadcn() {
    const components = useMemo<DataTableComponents>(
      () => createRadixComponents(defaultComponents),
      [],
    )
    return (
      <>
        <p className="rtc-sb-note">
          Radix primitives with a shadcn-like stylesheet. The adapter styles itself from the same{' '}
          <code>--rtc-*</code> variables, so it follows the table's theme.
        </p>
        <DataTable
          {...commonOptions}
          components={components}
          cssVars={{
            '--rtc-color-accent': '#18181b',
            '--rtc-color-accent-contrast': '#fafafa',
            '--rtc-color-accent-subtle': 'rgb(24 24 27 / 6%)',
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
  render: function Mantine() {
    const components = useMemo<DataTableComponents>(
      () => createMantineComponents(defaultComponents),
      [],
    )
    return (
      <MantineProvider>
        <p className="rtc-sb-note">
          Menus and selects are built from data arrays, and date filters use Mantine's{' '}
          <code>DateInput</code> instead of a native date input.
        </p>
        <DataTable
          {...commonOptions}
          components={components}
          cssVars={{
            '--rtc-color-accent': '#228be6',
            '--rtc-color-accent-subtle': '#e7f5ff',
            '--rtc-header-bg': '#f8f9fa',
            '--rtc-row-height-comfortable': '54px',
          }}
        />
      </MantineProvider>
    )
  },
}

/** Switch libraries at runtime against one identical table. */
export const SideBySideSwitcher: Story = {
  render: function SideBySideSwitcher() {
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
        <div className="rtc-sb-row">
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
        <p className="rtc-sb-note">
          Same columns, same data, same options — only <code>components</code> changes.
        </p>
        {library === 'mui' ? (
          <ThemeProvider theme={createTheme()}>{table}</ThemeProvider>
        ) : library === 'mantine' ? (
          <MantineProvider>{table}</MantineProvider>
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
      <p className="rtc-sb-note">
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
