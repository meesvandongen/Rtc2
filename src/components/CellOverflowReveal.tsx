import { useEffect } from 'react'

import { cellValueElement, isCellValueTruncated } from '../cellOverflow'

/** How long the pointer rests on a cut-short cell before it opens out. */
const PEEK_DELAY_MS = 400
/**
 * How recently a peek must have closed for the next one to open at once. The
 * pointer leaves one cell before it enters the next, so without it moving
 * along a row would meet the full delay at every cell.
 */
const PEEK_GRACE_MS = 300
/** Room below a cell a peek will settle for, and scroll, rather than move up. */
const PEEK_MIN_ROOM = 120
/** Widest a peek grows, before the viewport has its say. */
const PEEK_MAX_WIDTH = 480
/** Room kept between a peek and the edge of the viewport. */
const VIEWPORT_MARGIN = 8

/** Marks a `title` this component set, so it never removes one the cell came with. */
const AUTO_TITLE = 'data-rtc-auto-title'

/** Longest a double-click can take, for following one through the peek. */
const DOUBLE_CLICK_MS = 600

/** Controls inside the copy: reachable by the pointer, but not stops for the Tab key. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

function revealMode(cell: HTMLElement): string | undefined {
  return cell.dataset.rtcReveal
}

/**
 * Whether a table's scroll container scrolls the rows itself, rather than
 * leaving that to the page: a `height`, a virtualized body.
 */
function scrollsItself(container: Element): boolean {
  const overflow = getComputedStyle(container).overflowY
  return (overflow === 'auto' || overflow === 'scroll') && container.scrollHeight > container.clientHeight
}

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
 * its effects running twice. It is `aria-hidden`: the cell's own text is
 * already the whole value to assistive technology, which never sees an
 * ellipsis.
 *
 * Once open, the peek is one area, not the cell plus some overflow: the
 * pointer can move anywhere on it without closing it, its text can be
 * selected, and a value taller than it scrolls. A plain click on it — one that selected nothing — closes it and is passed to
 * whatever it was covering, so click-to-copy and click-to-select still answer
 * the click the reader aimed at them. A double-click follows it there too: its
 * second click lands on the cell itself, but the first landed on the peek, and
 * a browser may send the double-click to what the two have in common — which
 * is not the cell, so an editor opened on double-click would never hear it.
 *
 * Every scroll is the browser's own — momentum, latching, the hand-over at
 * the end of the note — which only works if the peek is nested in whatever its
 * cell scrolls in, because that is the box the browser chains on to. So it
 * lives in one of two places, chosen each time it opens. In a table that
 * scrolls its rows itself (a `height`, a virtualized body) it is a positioned
 * box inside that scroll container, above the cells and pinned columns and
 * below a sticky header, kept to the part of the container in view; it moves
 * with its row, and its overscroll goes to the table and then the page. In a
 * table the page scrolls, it is in the top layer (`popover="manual"`), where
 * nothing can clip it and its overscroll goes to the page — which is what
 * scrolls that table. Either way it stays a DOM descendant of the root, and
 * inherits the theme.
 *
 * A peek opens only where the pointer was put. Scrolling the table slides cells
 * under a pointer that is resting still, and opening a peek there would catch
 * the reader's next turn of the wheel; so after a scroll, nothing opens until
 * the pointer moves.
 *
 * `title` is the lightweight alternative: the browser's own tooltip, set on the
 * value just before the browser would look for it, and only when the value is
 * actually cut.
 */
export function CellOverflowReveal({
  rootRef,
  peek,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
  /** The peek's element, rendered inside the table's scroll container. */
  peek: HTMLDivElement | null
}) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || !peek) return

    // Set here rather than as a prop: React 18 does not know the attribute.
    peek.setAttribute('popover', 'manual')
    // Which of its two homes the peek is in while it is open.
    let inTopLayer = false

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
    // Whether the pointer has moved since the page last scrolled, told by
    // where it is rather than by `movementX`, which synthetic and re-hover
    // events report as nothing.
    let aimed = true
    let pointer = { x: Number.NaN, y: Number.NaN }
    let pointerAtScroll = pointer
    // Where the last click through the peek was passed, so the double-click it
    // turns out to be half of can follow it.
    let passedThrough: { element: HTMLElement; at: number } | null = null

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
      // A different cell starts at the top; the same cell redrawn keeps its place.
      const scrollTop = drawnFrom?.cell === cell ? peek.scrollTop : 0
      drawnFrom = { cell, html: inner.innerHTML }

      const content = inner.cloneNode(true) as HTMLElement
      // A document may hold an id once; the copy is decoration, not a second
      // instance of the cell.
      for (const element of content.querySelectorAll('[id]')) element.removeAttribute('id')
      for (const element of content.querySelectorAll(FOCUSABLE)) element.setAttribute('tabindex', '-1')
      content.querySelector(`[${AUTO_TITLE}]`)?.removeAttribute('title')
      peek.replaceChildren(content)

      const style = getComputedStyle(cell)
      const rect = cell.getBoundingClientRect()
      const background = rowBackground(cell)
      const container = peek.parentElement
      if (!container) return
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight

      // Where it may go, in viewport coordinates: the viewport, or — inside a
      // table that scrolls itself — the part of its scroll container in view,
      // below a sticky header and above a sticky footer. Inside the container
      // it must also never reach past what is in view, or it would add to the
      // very scroll area it sits in.
      inTopLayer = !scrollsItself(container)
      const area = {
        left: VIEWPORT_MARGIN,
        right: viewportWidth - VIEWPORT_MARGIN,
        top: VIEWPORT_MARGIN,
        bottom: viewportHeight - VIEWPORT_MARGIN,
      }
      if (!inTopLayer) {
        const box = container.getBoundingClientRect()
        const inner = {
          left: box.left + container.clientLeft,
          top: box.top + container.clientTop,
        }
        area.left = Math.max(area.left, inner.left)
        area.right = Math.min(area.right, inner.left + container.clientWidth)
        area.top = Math.max(area.top, inner.top)
        area.bottom = Math.min(area.bottom, inner.top + container.clientHeight)
        const head = container.querySelector(':scope > table > thead')
        const foot = container.querySelector(':scope > table > tfoot')
        if (head && getComputedStyle(head).position === 'sticky') {
          area.top = Math.max(area.top, head.getBoundingClientRect().bottom)
        }
        if (foot && getComputedStyle(foot).position === 'sticky') {
          area.bottom = Math.min(area.bottom, foot.getBoundingClientRect().top)
        }
      }
      const areaWidth = Math.max(0, area.right - area.left)
      const areaHeight = Math.max(0, area.bottom - area.top)

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
          ? area.right - rect.left
          : anchor === 'right'
            ? rect.right - area.left
            : 2 * Math.min(rect.left + rect.width / 2 - area.left, area.right - (rect.left + rect.width / 2))
      const minWidth = Math.min(rect.width, areaWidth)
      const maxWidth = Math.min(areaWidth, Math.max(rect.width, Math.min(PEEK_MAX_WIDTH, room)))

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
        minWidth: `${minWidth}px`,
        minHeight: `${Math.min(rect.height, areaHeight)}px`,
        maxWidth: `${maxWidth}px`,
        // Back to the stylesheet's cap; the room below the cell may lower it.
        maxHeight: '',
        left: '0px',
        top: '0px',
      })
      // The row's colour, painted over the table surface by the stylesheet.
      peek.style.setProperty('--rtc-peek-row-bg', background ?? 'transparent')
      peek.toggleAttribute('data-rtc-top-layer', inTopLayer)

      peek.setAttribute('data-rtc-open', '')
      const popoverOpen = typeof peek.showPopover === 'function' && peek.matches(':popover-open')
      if (inTopLayer && !popoverOpen && typeof peek.showPopover === 'function') peek.showPopover()
      if (!inTopLayer && popoverOpen) peek.hidePopover()

      const width = peek.offsetWidth
      let height = peek.offsetHeight
      let left =
        anchor === 'center'
          ? rect.left + rect.width / 2 - width / 2
          : anchor === 'right'
            ? rect.right - width
            : rect.left
      // Only a cell already partly out of view still has to move.
      left = Math.min(Math.max(area.left, left), area.right - width)
      let top = Math.max(rect.top, area.top)
      const below = area.bottom - top
      if (height > below) {
        // Keep the text starting where the cell's does and scroll to the
        // rest, as long as the room below is worth having; otherwise slide up.
        if (below >= Math.min(height, PEEK_MIN_ROOM)) {
          peek.style.maxHeight = `${below}px`
        } else {
          if (height > areaHeight) {
            peek.style.maxHeight = `${areaHeight}px`
            height = areaHeight
          }
          top = Math.max(area.top, area.bottom - height)
        }
      }
      if (inTopLayer) {
        peek.style.left = `${left}px`
        peek.style.top = `${top}px`
      } else {
        // Positioned in the scroll container's content, so it moves with its row.
        const box = container.getBoundingClientRect()
        peek.style.left = `${left - box.left - container.clientLeft + container.scrollLeft}px`
        peek.style.top = `${top - box.top - container.clientTop + container.scrollTop}px`
      }
      peek.scrollTop = scrollTop
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
      if (mode !== 'peek' || cell === shown || cell === pending || cell === dismissed) return

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
      // Onto its own peek: still reading it.
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
      // And a cell the table slid under a still pointer was not pointed at.
      if (event.pointerType === 'touch' || inPeek(event.target) || !aimed) return
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
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY }
      // Real movement only: a browser re-hovering whatever a scroll slid under
      // a still pointer reports a move to where the pointer already was.
      if (aimed || (pointer.x === pointerAtScroll.x && pointer.y === pointerAtScroll.y)) return
      aimed = true
      if (event.pointerType === 'touch' || inPeek(event.target)) return
      const cell = ownCell(event.target)
      if (cell) arm(cell)
    }
    const onFocusIn = (event: FocusEvent) => {
      const cell = ownCell(event.target)
      if (cell) arm(cell)
    }
    const onFocusOut = (event: FocusEvent) => leave(ownCell(event.target), event.relatedTarget)
    // A press on the table is the reader acting on a cell, and whatever it
    // starts — an edit, a selection, a copy — should not happen behind a copy
    // of it. A press on the peek is selecting its text, or its scrollbar.
    const onPointerDown = (event: PointerEvent) => {
      if (!inPeek(event.target)) dismiss()
    }
    const onClick = (event: MouseEvent) => {
      if (!inPeek(event.target)) return
      // A click that selected something was the reader selecting it.
      const selection = document.getSelection()
      if (selection && !selection.isCollapsed && inPeek(selection.anchorNode)) return
      dismiss()
      const underneath = document.elementFromPoint(event.clientX, event.clientY)
      if (underneath instanceof HTMLElement && root.contains(underneath)) {
        passedThrough = { element: underneath, at: performance.now() }
        underneath.click()
      }
    }
    const onDoubleClick = (event: MouseEvent) => {
      const previous = passedThrough
      passedThrough = null
      if (!previous || performance.now() - previous.at > DOUBLE_CLICK_MS) return
      if (!previous.element.isConnected) return
      // Delivered into the cell already, where the cell's own handlers hear it.
      const cell = previous.element.closest('.rtc-td') ?? previous.element
      if (event.target instanceof Node && cell.contains(event.target)) return
      previous.element.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          detail: 2,
          clientX: event.clientX,
          clientY: event.clientY,
        }),
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    // In the top layer it is placed against the viewport, so any scroll
    // leaves it behind — except its own, which is the reader reading it.
    // Inside the scroll container it moves with its row, as the content
    // around it does, and goes when the pointer leaves it.
    const onScroll = (event: Event) => {
      if (inPeek(event.target)) return
      aimed = false
      pointerAtScroll = pointer
      if (inTopLayer) hide()
    }

    root.addEventListener('pointerover', onPointerOver)
    root.addEventListener('pointerout', onPointerOut)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('click', onClick)
    root.addEventListener('dblclick', onDoubleClick)
    root.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', hide)

    return () => {
      hide()
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointerout', onPointerOut)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('click', onClick)
      root.removeEventListener('dblclick', onDoubleClick)
      root.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', hide)
    }
  }, [rootRef, peek])

  return null
}
