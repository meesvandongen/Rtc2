import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, dataTableThemes, type DataTableThemeName } from '../src'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(12)

const meta: Meta = {
  title: 'DataTable/12 Theming',
}

export default meta
type Story = StoryObj<typeof meta>

const THEME_NAMES = Object.keys(dataTableThemes) as DataTableThemeName[]

/**
 * Every preset applied to the same table.
 *
 * Nothing but the `cssVars` map changes between these — the markup, class
 * names and structural CSS are identical.
 */
export const Presets: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Each table below differs only by its <code>cssVars</code> map. No selectors are overridden.
      </p>
      {THEME_NAMES.map((name) => (
        <div key={name} style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.875rem', textTransform: 'capitalize' }}>
            {name}
          </h3>
          <DataTable
            columns={personColumns.slice(0, 6)}
            data={data.slice(0, 5)}
            getRowId={(row) => row.id}
            cssVars={dataTableThemes[name]}
            enableStripes={name === 'spreadsheet' || name === 'soft'}
            enableBorders={name === 'spreadsheet' || name === 'highContrast' ? 'all' : 'horizontal'}
            enableColumnActions
            enableRowSelection
            enablePagination={false}
          />
        </div>
      ))}
    </>
  ),
}

/** Switch presets at runtime. */
export const ThemeSwitcher: Story = {
  render: function ThemeSwitcher() {
    const [theme, setTheme] = useState<DataTableThemeName>('shadcn')
    return (
      <>
        <div className="rtc-sb-row">
          {THEME_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              className="rtc-button"
              data-testid={`theme-${name}`}
              onClick={() => setTheme(name)}
              style={
                theme === name
                  ? { borderColor: 'currentColor', fontWeight: 600 }
                  : undefined
              }
            >
              {name}
            </button>
          ))}
        </div>
        <DataTable
          columns={personColumns}
          data={data}
          getRowId={(row) => row.id}
          cssVars={dataTableThemes[theme]}
          enableColumnActions
          enableRowSelection
          enableColumnPinning
          enableStickyHeader
          height={460}
          enablePagination={false}
        />
      </>
    )
  },
}

/** Any individual variable can be overridden inline. */
export const InlineVariableOverrides: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data.slice(0, 6)}
      getRowId={(row) => row.id}
      cssVars={{
        '--rtc-color-accent': '#e11d48',
        '--rtc-color-accent-subtle': 'rgb(225 29 72 / 10%)',
        '--rtc-radius': '20px',
        '--rtc-row-height-comfortable': '64px',
        '--rtc-header-text-transform': 'uppercase',
        '--rtc-header-letter-spacing': '0.12em',
        '--rtc-header-font-size': '0.6875rem',
        '--rtc-border-width': '2px',
      }}
      enableRowSelection
      enableColumnActions
      enablePagination={false}
    />
  ),
}

/** Explicit dark mode, independent of the OS preference. */
export const DarkMode: Story = {
  render: () => (
    <div data-rtc-theme="dark">
      <DataTable
        columns={personColumns.slice(0, 7)}
        data={data}
        getRowId={(row) => row.id}
        enableRowSelection
        enableColumnActions
        enableStripes
        enablePagination={false}
      />
    </div>
  ),
}

/** Scoped overrides through `classNames` when a variable is not enough. */
export const CustomClassNames: Story = {
  render: () => (
    <>
      <style>{`
        .demo-head-cell { text-decoration: underline dotted; }
        .demo-row:nth-child(3n) { outline: 1px dashed var(--rtc-color-accent); outline-offset: -1px; }
      `}</style>
      <DataTable
        columns={personColumns.slice(0, 6)}
        data={data.slice(0, 9)}
        getRowId={(row) => row.id}
        classNames={{ headCell: 'demo-head-cell', bodyRow: 'demo-row' }}
        enablePagination={false}
      />
    </>
  ),
}
