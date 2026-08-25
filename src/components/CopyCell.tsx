import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useComponents } from './registry'
import type { DataTableLocalization } from '../locale'

/** How long the "copied" confirmation stays up, in milliseconds. */
const CONFIRMATION_MS = 1500

/**
 * A cell that copies its own value.
 *
 * The state lives here rather than in `BodyCell` so that only the cells which
 * opted in pay for a hook and a timer; a table of ten thousand plain cells is
 * unchanged.
 *
 * The button keeps the cell's text as its accessible name — replacing it with
 * "Click to copy" would announce the affordance and hide the value, which is
 * the wrong trade for the one piece of information the row is carrying. The
 * affordance is the tooltip's job, and the outcome is announced separately
 * through a live region.
 */
export function CopyCell({
  value,
  localization,
  children,
}: {
  /** The text placed on the clipboard. */
  value: string
  localization: DataTableLocalization
  children: ReactNode
}) {
  const ui = useComponents()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(
    async (event: React.MouseEvent) => {
      // The row's own click handlers must not fire: `enableClickToSelect`
      // would toggle selection under a click the reader meant as "copy this".
      event.stopPropagation()
      try {
        // Absent outside a secure context, and it can reject when the
        // document is not focused or permission is denied. A copy that did
        // not happen must not claim it did, so the confirmation is only shown
        // once the write resolves.
        await navigator.clipboard?.writeText(value)
      } catch {
        return
      }
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), CONFIRMATION_MS)
    },
    [value],
  )

  return (
    <ui.Tooltip
      label={copied ? localization.copiedToClipboard : localization.clickToCopy}
      className="rtc-copy-cell-tip"
    >
      <button
        type="button"
        className="rtc-copy-cell"
        data-rtc-copy-cell=""
        data-rtc-copied={copied ? 'true' : undefined}
        onClick={copy}
      >
        {children}
        {/* Assertive rather than polite: the confirmation is short-lived, and
            a reader who has moved on before a polite queue drains never hears
            whether the copy landed. */}
        <span className="rtc-visually-hidden" role="status" aria-live="assertive">
          {copied ? localization.copiedToClipboard : ''}
        </span>
      </button>
    </ui.Tooltip>
  )
}

/** Whether a column's cells copy on click. */
export function clickToCopyEnabled(
  columnMeta: { enableClickToCopy?: boolean } | undefined,
  tableOption: boolean | undefined,
): boolean {
  return columnMeta?.enableClickToCopy ?? tableOption ?? false
}
