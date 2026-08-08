import { defineConfig } from 'tsdown'

/**
 * Library build.
 *
 * tsdown bundles with rolldown and emits declarations through
 * rolldown-plugin-dts, so the whole pipeline is Rust-based — no esbuild or
 * rollup involved. (Storybook's own core still depends on esbuild internally;
 * that is outside this config.)
 */
export default defineConfig({
  // Object form so each UI-library adapter lands at a predictable path —
  // `dist/adapters/mui.js` for `src/adapters/mui.tsx` — matching the
  // `exports` subpaths in `package.json` exactly. Each adapter is its own
  // entry, not a re-export from `index.ts`, so importing `.` never touches
  // adapter code and importing an adapter never touches the others.
  entry: {
    index: 'src/index.ts',
    'adapters/mui': 'src/adapters/mui.tsx',
    'adapters/mantine': 'src/adapters/mantine.tsx',
    'adapters/radix': 'src/adapters/radix.tsx',
    'adapters/lolmath': 'src/adapters/lolmath.tsx',
  },
  format: ['esm'],
  platform: 'neutral',
  // Explicit browser baseline. Without it tsdown infers `node20` from
  // `engines.node`, which is wrong for a browser component library — and the
  // same target drives lightningcss, so it decides whether `color-mix()` and
  // logical properties survive. These versions are where both landed.
  target: ['es2022', 'chrome111', 'edge111', 'firefox113', 'safari16.4'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Without this, every entry's CSS side-effect import lands in one shared
  // `style.css` — so importing `@mvd/table/radix` would pull `radix.css`'s
  // rules into the stylesheet every other consumer imports too. Splitting
  // emits one CSS file per JS entry (`index.js` → `index.css`, `radix.js` →
  // `radix.css`, …), matching the `exports` subpaths one-to-one.
  css: { splitting: true },
  // Keep React, TanStack and every adapter's UI library out of the bundle so
  // consumers resolve one copy — the UI libraries are peer dependencies of
  // their adapter's entry point only (see `package.json`), never the root
  // `@mvd/table` import, and this is what actually keeps them out of it.
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@tanstack/react-table',
      '@tanstack/table-core',
      '@tanstack/react-virtual',
      '@tanstack/react-store',
      '@tanstack/store',
      '@mui/material',
      '@mantine/core',
      '@mantine/dates',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@lolmath/ui',
    ],
  },
})
