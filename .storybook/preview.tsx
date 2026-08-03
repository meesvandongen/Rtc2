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

/**
 * Makes `HTMLElement.prototype.focus` readable again.
 *
 * In a secure context Storybook installs a loader that sets up `userEvent`,
 * and part of that redefines `focus` on `HTMLElement.prototype` as an
 * *accessor* whose getter starts with `this.ownerDocument?.defaultView`. That
 * is fine for an element and fatal for the prototype: `ownerDocument` is a
 * native accessor, so reading it with `HTMLElement.prototype` as the receiver
 * throws `TypeError: Illegal invocation` before the `?.` can help.
 *
 * React Aria reads exactly that property. `setupGlobalFocusEvents` keeps the
 * original `focus` so it can restore it later, and does it with a plain
 * `window.HTMLElement.prototype.focus` — on the prototype. The loader runs on
 * the first story render, so any story chunk imported *after* that which pulls
 * React Aria in throws while it is still evaluating, and takes every story in
 * the chunk down with it. Deep-linking to such a story hides the bug
 * completely: the chunk is imported before any loader has run.
 *
 * The repair is to put the property back the way React Aria expects to find
 * it — a plain value — while still routing the call through Storybook's getter
 * so its behaviour is untouched. The getter is simply given a real element as
 * its receiver, which is what it was written for. Idempotent, because it only
 * acts when an accessor is actually installed.
 */
const repairFocusDescriptor = () => {
  if (typeof HTMLElement === 'undefined') return
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'focus')
  const get = descriptor?.get
  if (!get) return
  Reflect.defineProperty(HTMLElement.prototype, 'focus', {
    configurable: true,
    writable: true,
    value: function focus(this: HTMLElement, ...args: unknown[]) {
      // `get` resolves per element: Storybook returns a no-op for one that is
      // detached, and the real `focus` otherwise. Both are called the same way.
      const resolved = get.call(this) as (...rest: unknown[]) => void
      return resolved.apply(this, args)
    },
  })
}

// Once at preview boot, for anything that patched `focus` before the stories
// load, and again per story below — the loader that installs the accessor does
// not run until the first render.
repairFocusDescriptor()

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
      // Decorators run after loaders, which is the only point at which the
      // accessor above exists to be repaired.
      repairFocusDescriptor()

      const theme = context.globals.theme === 'dark' ? 'dark' : 'light'
      // Both attributes go on `<html>`, and there is no wrapper element around
      // the story. `data-sb-theme` drives the page chrome in `storybook.css`.
      //
      // `data-rtc-theme` is the library's own ancestor opt-in, and `<html>` is
      // the only ancestor every themed surface shares. Overlays would escape a
      // wrapper: the modal editor portals to `document.body`, and every adapter
      // renders its menus and popovers there too. Those surfaces carry
      // `rtc-vars`, so they pick up the palette — but only from an ancestor
      // they have in common with the table.
      //
      // Padding is Storybook's `layout` parameter, which already knows how Docs
      // differs from Canvas — something a hand-rolled wrapper has to be taught.
      document.documentElement.setAttribute('data-sb-theme', theme)
      document.documentElement.setAttribute('data-rtc-theme', theme)
      return <Story />
    },
  ],
  loaders: [mswLoader(startWorker)],
}

export default preview
