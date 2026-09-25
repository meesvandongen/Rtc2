import { useEffect, useRef } from 'react'

import { cellValueElement, isCellValueTruncated } from '../cellOverflow'

/** How long the pointer rests on a cut-short cell before it opens out. */
const PEEK_DELAY_MS = 400
/**
 * How recently a peek must have closed for the next one to open at once. The
 * pointer leaves one cell before it enters the next, so without it moving
 * along a row would meet the full delay at every cell.
 */
const PEEK_GRACE_MS = 300
/** Widest a peek grows, before the viewport has its say. */
const PEEK_MAX_WIDTH = 480
/** Room kept between a peek and the edge of the viewport. */
const VIEWPORT_MARGIN = 8

/** Marks a `title` this component set, so it never removes one the cell came with. */
const AUTO_TITLE = 'data-rtc-auto-title'

function revealMode(cell: HTMLElement): string | undefined {
  return cell.dataset.rtcReveal
}

function peeks(cell: HTMLElement): boolean {
  const mode = revealMode(cell)
  return mode === 'peek' || mode === 'peek-scroll'
}

/** What a reader could otherwise reach inside the copy: it is a picture, not a second set of controls. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

/** The first colour that is not fully transparent, walking from the cell up to its row. */
function rowBackground(cell: HTMLElement): string | null {
  for (const element of [cell, cell.parentElement]) {
    if (!element) continue
    const color = getComputedStyle(element).backgroundColor
    if (color && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color)) return color
  }
  return null
}

/**
 * Shows the whole of a value a body cell had to cut short.
 *
 * One element per table, not one per cell: a cell that fits — which is nearly
 * all of them — pays nothing, not a hook and not a wrapper, and a table of ten
 * thousand cells is the same table it was. Everything hangs off delegated
 * listeners on the root, and each cell says how it wants to be revealed
 * through `data-rtc-reveal`, which `BodyCell` resolves from the column and the
 * table.
 *
 * `peek` opens the cell out in place: a copy of its content, laid over the
 * cell at the same padding, so the text appears to continue past the edge it
 * was cut at rather than to jump somewhere else. The copy is a clone of the
 * rendered DOM, not a second render of the cell — a custom `cell` renderer
 * looks exactly like itself without being asked to render twice, and without
 * its effects running twice. The clone is inert and `aria-hidden`: the cell's
 * own text is already the whole value to assistive technology, which never
 * sees an ellipsis. And it takes no pointer events, so it can never sit
 * between the reader and the cell they were reaching for.
 *
 * It lives in the top layer (`popover="manual"`) so a sticky header, a pinned
 * column or an ancestor's `overflow` cannot cover or clip it, while staying a
 * DOM descendant of the root so it still inherits the theme.
 *
 * `peek-scroll` is the same copy made reachable: it takes the pointer, so it
 * scrolls and its text can be selected, and it is no longer inert. The pointer
 * crossing from the cell onto it is therefore not leaving, and a press or a
 * scroll inside it is the reader using it rather than moving on. A plain click
 * — one that selected nothing — closes it and is passed to whatever the copy
 * was covering, so click-to-copy and click-to-select still answer the click
 * the reader aimed at them.
 *
 * `title` is the lightweight alternative: the browser's own tooltip, set on the
 * value just before the browser would look for it, and only when the value is
 * actually cut.
 */
export function CellOverflowReveal({
  rootRef,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
}) {
  const peekRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const peek = peekRef.current
    if (!root || !peek) return

    // Set here rather than as props: React 18 knows neither attribute, and
    // would warn about a boolean `inert`.
    peek.setAttribute('popover', 'manual')
    peek.inert = true

    let shown: HTMLElement | null = null
    let pending: HTMLElement | null = null
    // Put away on purpose — Escape, a press, a click through — and so not to be
    // reopened by the very pointer that is still resting on it, until it leaves.
    let dismissed: HTMLElement | null = null
    // What the peek was last drawn from, so a mutation elsewhere in the table
    // does not redraw it: a redraw is a new copy, and a new copy is back at the
    // top with the reader's selection gone.
    let drawnFrom: { cell: HTMLElement; html: string } | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let frame = 0
    let closedAt = Number.NEGATIVE_INFINITY
    const observer = new MutationObserver((records) => {
      // The peek is inside the root too, and drawing it is a mutation.
      if (frame || records.every((record) => peek.contains(record.target))) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (shown) render(shown)
      })
    })

    const inPeek = (target: EventTarget | null) => target instanceof Node && peek.contains(target)

    const ownCell = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null
      const cell = target.closest<HTMLElement>('.rtc-td')
      // A detail panel can hold a table of its own, which has its own peek.
      return cell && cell.closest('.rtc-root') === root ? cell : null
    }

    const cancel = () => {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
    }

    const dismiss = () => {
      dismissed = shown ?? pending
      hide()
    }

    const hide = () => {
      cancel()
      if (!shown) return
      shown = null
      drawnFrom = null
      observer.disconnect()
      peek.removeAttribute('data-rtc-open')
      // Asked only where popovers exist: elsewhere `:popover-open` is not a
      // selector at all, and `matches` throws on it.
      if (typeof peek.hidePopover === 'function' && peek.matches(':popover-open')) peek.hidePopover()
      peek.replaceChildren()
    }

    /** Draw the peek over `cell`, or put it away if there is nothing left to reveal. */
    const render = (cell: HTMLElement) => {
      const value = cellValueElement(cell)
      const inner = value?.parentElement
      if (!cell.isConnected || !value || !inner || !isCellValueTruncated(value)) {
        hide()
        return
      }

      if (drawnFrom?.cell === cell && drawnFrom.html === inner.innerHTML) return
      drawnFrom = { cell, html: inner.innerHTML }

      const content = inner.cloneNode(true) as HTMLElement
      // A document may hold an id once; the copy is decoration, not a second
      // instance of the cell.
      for (const element of content.querySelectorAll('[id]')) element.removeAttribute('id')
      content.querySelector(`[${AUTO_TITLE}]`)?.removeAttribute('title')
      const scrollable = revealMode(cell) === 'peek-scroll'
      if (scrollable) {
        // Reachable by the pointer, but still not a stop for the Tab key.
        for (const element of content.querySelectorAll(FOCUSABLE)) element.setAttribute('tabindex', '-1')
      }
      peek.replaceChildren(content)
      peek.inert = !scrollable
      peek.toggleAttribute('data-rtc-scrollable', scrollable)

      const style = getComputedStyle(cell)
      const rect = cell.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      const background = rowBackground(cell)

      // Grow away from the edge the text is anchored to, so the part the
      // reader could already see stays where it was: rightwards for start-
      // aligned text in a left-to-right table, leftwards for numbers. The room
      // on that side caps the width — a peek that wraps onto another line
      // still reads as the same cell, one that slides sideways does not.
      const align = cell.dataset.rtcAlign
      const rtl = style.direction === 'rtl'
      const anchor = align === 'center' ? 'center' : (align === 'right') !== rtl ? 'right' : 'left'
      const room =
        anchor === 'left'
          ? viewportWidth - VIEWPORT_MARGIN - rect.left
          : anchor === 'right'
            ? rect.right - VIEWPORT_MARGIN
            : 2 *
              Math.min(
                rect.left + rect.width / 2 - VIEWPORT_MARGIN,
                viewportWidth - VIEWPORT_MARGIN - (rect.left + rect.width / 2),
              )
      const maxWidth = Math.max(rect.width, Math.min(PEEK_MAX_WIDTH, room))

      Object.assign(peek.style, {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        lineHeight: style.lineHeight,
        color: style.color,
        letterSpacing: style.letterSpacing,
        textAlign: style.textAlign,
        direction: style.direction,
        padding: style.padding,
        minWidth: `${rect.width}px`,
        minHeight: `${rect.height}px`,
        maxWidth: `${maxWidth}px`,
        backgroundImage: background ? `linear-gradient(${background}, ${background})` : '',
        left: '0px',
        top: '0px',
      })

      peek.setAttribute('data-rtc-open', '')
      if (typeof peek.showPopover === 'function' && !peek.matches(':popover-open')) {
        peek.showPopover()
      }

      const width = peek.offsetWidth
      const height = peek.offsetHeight
      let left =
        anchor === 'center'
          ? rect.left + rect.width / 2 - width / 2
          : anchor === 'right'
            ? rect.right - width
            : rect.left
      // Only a cell already partly off screen still has to move.
      left = Math.min(Math.max(VIEWPORT_MARGIN, left), viewportWidth - VIEWPORT_MARGIN - width)
      let top = rect.top
      if (top + height > viewportHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, viewportHeight - VIEWPORT_MARGIN - height)
      }
      peek.style.left = `${left}px`
      peek.style.top = `${top}px`
    }

    const show = (cell: HTMLElement) => {
      if (shown !== cell) {
        observer.disconnect()
        shown = cell
        // The whole root, not the cell: a cell removed from the table — a new
        // page, a scrolled-out virtual row — is not a mutation *of* the cell.
        observer.observe(root, { childList: true, subtree: true, characterData: true })
      }
      render(cell)
    }

    const arm = (cell: HTMLElement) => {
      const mode = revealMode(cell)
      if (mode === 'title') {
        const value = cellValueElement(cell)
        if (!value) return
        if (isCellValueTruncated(value)) {
          if (!value.title || value.hasAttribute(AUTO_TITLE)) {
            value.title = value.textContent ?? ''
            value.setAttribute(AUTO_TITLE, '')
          }
        } else if (value.hasAttribute(AUTO_TITLE)) {
          value.removeAttribute('title')
          value.removeAttribute(AUTO_TITLE)
        }
        return
      }
      if (!peeks(cell) || cell === shown || cell === pending || cell === dismissed) return

      cancel()
      // Moving along a row of cut-short cells, each one opens at once: the
      // reader has already shown they are reading, and a fresh delay per cell
      // would make them wait at every one.
      if (shown || performance.now() - closedAt < PEEK_GRACE_MS) {
        show(cell)
        return
      }
      pending = cell
      timer = setTimeout(() => {
        timer = null
        pending = null
        show(cell)
      }, PEEK_DELAY_MS)
    }

    const leave = (from: HTMLElement | null, to: EventTarget | null) => {
      if (!from || (to instanceof Node && from.contains(to))) return
      // Onto its own peek, which only a `peek-scroll` can be pointed at.
      if (from === shown && inPeek(to)) return
      if (from === dismissed) dismissed = null
      if (from === pending) cancel()
      if (from === shown) {
        hide()
        // Only a peek the pointer walked out of: one put away with Escape, a
        // press or a scroll was dismissed, and should not spring straight back.
        closedAt = performance.now()
      }
    }

    const onPointerOver = (event: PointerEvent) => {
      // A touch has no hover; a tap is a press on the cell and belongs to it.
      if (event.pointerType === 'touch' || inPeek(event.target)) return
      const cell = ownCell(event.target)
      if (cell) arm(cell)
      else if (shown || pending) hide()
    }
    const onPointerOut = (event: PointerEvent) => {
      if (!inPeek(event.target)) {
        leave(ownCell(event.target), event.relatedTarget)
        return
      }
      // Out of the peek: back onto the cell it belongs to keeps it, anywhere
      // else is the same as walking out of that cell.
      const to = event.relatedTarget
      if (inPeek(to) || (shown && to instanceof Node && shown.contains(to))) return
      hide()
      closedAt = performance.now()
    }
    const onFocusIn = (event: FocusEvent) => {
      const cell = ownCell(event.target)
      if (cell && peeks(cell)) arm(cell)
    }
    const onFocusOut = (event: FocusEvent) => leave(ownCell(event.target), event.relatedTarget)
    // A press is the reader acting on the cell, and whatever it starts — an
    // edit, a selection, a copy — should not happen behind a copy of it.
    const onPointerDown = (event: PointerEvent) => {
      // Inside a `peek-scroll`: selecting its text, or dragging its scrollbar.
      if (!inPeek(event.target)) dismiss()
    }
    const onClick = (event: MouseEvent) => {
      if (!inPeek(event.target)) return
      // A click that selected something was the reader selecting it.
      const selection = document.getSelection()
      if (selection && !selection.isCollapsed && inPeek(selection.anchorNode)) return
      dismiss()
      const underneath = document.elementFromPoint(event.clientX, event.clientY)
      if (underneath instanceof HTMLElement && root.contains(underneath)) underneath.click()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    // Positioned against the viewport, so any scroll anywhere leaves it behind
    // — except its own, which is the reader reading it.
    const onScroll = (event: Event) => {
      if (!inPeek(event.target)) hide()
    }

    root.addEventListener('pointerover', onPointerOver)
    root.addEventListener('pointerout', onPointerOut)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('click', onClick)
    root.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', hide)

    return () => {
      hide()
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointerout', onPointerOut)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', hide)
    }
  }, [rootRef])

  return <div ref={peekRef} className="rtc-cell-peek" aria-hidden="true" />
}
