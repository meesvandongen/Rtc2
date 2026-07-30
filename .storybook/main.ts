import type { StorybookConfig } from '@storybook/react-vite'

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
}

export default config
