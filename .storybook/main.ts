import { readFile } from 'node:fs/promises'

import type { StorybookConfig } from '@storybook/react-vite'

/**
 * `@lolmath/ui` inlines the assets its components import from JavaScript with
 * tsdown's `base64` loader, which emits the payload and nothing else:
 * `"iVBORw0KGgo…"` where an `<img src>` needs
 * `"data:image/png;base64,iVBORw0KGgo…"`. The browser resolves the payload as a
 * relative URL, so the library's checkbox renders as a broken image — and
 * because a failed image request is never cached, every re-render of every row
 * asks the server for it again. Assets the package imports through CSS are
 * unaffected: those go through postcss-url, which inlines them properly.
 *
 * The magic numbers are unambiguous — `iVBORw0KGgo` is a PNG header and
 * `PHN2Zy` is `<svg ` — so the prefix can be put back without having to guess
 * at what any given string is for.
 */
const withDataUris = (code: string) =>
  code.replace(
    /(["'])(iVBORw0KGgo[A-Za-z0-9+/]+={0,2}|PHN2Zy[A-Za-z0-9+/]+={0,2})\1/g,
    (_match, quote: string, payload: string) =>
      `${quote}data:image/${payload.startsWith('iVBOR') ? 'png' : 'svg+xml'};base64,${payload}${quote}`,
  )

const NEEDS_DATA_URIS = /["'](?:iVBORw0KGgo|PHN2Zy)/

/** Applies the rewrite when the bundler walks the package — i.e. on `build`. */
const lolmathDataUris = () => ({
  name: 'rtc:lolmath-data-uris',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.includes('@lolmath/ui') || !NEEDS_DATA_URIS.test(code)) return null
    return { code: withDataUris(code), map: null }
  },
})

/**
 * The same rewrite for `dev`, where a plugin's `transform` hook never sees the
 * package: Vite hands dependencies to esbuild to pre-bundle and serves the
 * result whole. Patching during pre-bundling reaches it without taking
 * `@lolmath/ui` out of the optimizer, which its React Aria dependency does not
 * survive.
 */
const lolmathDataUrisEsbuild = {
  name: 'rtc:lolmath-data-uris',
  setup(build: {
    onLoad: (
      options: { filter: RegExp },
      callback: (args: { path: string }) => Promise<{ contents: string; loader: 'js' }>,
    ) => void
  }) {
    build.onLoad({ filter: /@lolmath[\\/]ui[\\/]dist[\\/].*\.mjs$/ }, async ({ path }) => ({
      contents: withDataUris(await readFile(path, 'utf8')),
      loader: 'js' as const,
    }))
  },
}

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  // `addon-docs` supplies the Docs tab and the source block behind each
  // story's "Show code", which is the only way to see how a story is built
  // without leaving the browser for the repository.
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // MSW's worker script is served from here and registered in `preview.tsx`.
  staticDirs: ['../public'],
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: (config) => {
    config.plugins = [lolmathDataUris(), ...(config.plugins ?? [])]
    config.optimizeDeps = {
      ...config.optimizeDeps,
      esbuildOptions: {
        ...config.optimizeDeps?.esbuildOptions,
        plugins: [
          ...(config.optimizeDeps?.esbuildOptions?.plugins ?? []),
          lolmathDataUrisEsbuild,
        ],
      },
    }
    return config
  },
}

export default config
