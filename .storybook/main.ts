import remarkGfm from 'remark-gfm'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  // `stories/docs/*.mdx` is the prose documentation; the rest is one story
  // file per feature area.
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: [
    {
      // `addon-docs` supplies the Docs tab and the source block behind each
      // story's "Show code", which is the only way to see how a story is built
      // without leaving the browser for the repository.
      name: '@storybook/addon-docs',
      options: {
        // MDX is CommonMark on its own: without this, a GitHub-flavoured table
        // renders as a paragraph full of pipes rather than a table, and the
        // docs pages are mostly tables.
        mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } },
      },
    },
  ],
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
