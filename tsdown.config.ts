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
  entry: ['src/index.ts'],
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
  // Keep React and TanStack out of the bundle so consumers resolve one copy.
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
    ],
  },
})
