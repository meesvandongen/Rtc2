import type { Preview } from '@storybook/react-vite'
import { setupWorker } from 'msw/browser'
import { mswLoader } from 'msw-storybook-addon/csf3'

import '../src/styles.css'
import './storybook.css'

/**
 * Start the MSW worker once for the whole preview.
 *
 * `bypass` is deliberate: only the handlers a story declares in
 * `parameters.msw` are intercepted, so Storybook's own asset and HMR requests
 * pass straight through instead of filling the console with warnings.
 */
const startWorker = async () => {
  const worker = setupWorker()
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: './mockServiceWorker.js' },
  })
  return worker
}

const preview: Preview = {
  // Autodocs gives every story file a Docs page listing its stories with
  // their source; `codePanel` adds the same source as a panel beside a story
  // in canvas view, so the code is one click away either way.
  tags: ['autodocs'],
  parameters: {
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
    docs: {
      // `code`, not `dynamic`: the stories are written as `render` functions,
      // and the dynamic snippet would show the *rendered* element tree rather
      // than the source anyone would copy.
      source: { type: 'code' },
      codePanel: true,
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'DataTable',
          ['Basic', 'Sorting', 'Filtering', 'Pagination'],
          'Theming',
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Table colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light'
      // The attribute is read by both the page chrome and `.rtc-root`.
      document.documentElement.setAttribute('data-sb-theme', theme)
      return (
        <div className="sb-wrapper" data-rtc-theme={theme}>
          <Story />
        </div>
      )
    },
  ],
  loaders: [mswLoader(startWorker)],
}

export default preview
