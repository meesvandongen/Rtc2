import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type DragKind = 'column' | 'row' | null

/**
 * Which side of the hovered item the dragged item lands on.
 *
 * A drop target alone cannot express an order: hovering row 4 has to mean
 * either "above row 4" or "below row 4", and picking one direction silently
 * makes the other unreachable — the last position could never be reached by
 * dropping on the last row. The edge is derived from the pointer, so the
 * insertion the drop performs is the one the indicator draws.
 */
export type DropEdge = 'before' | 'after'

export interface DragState {
  kind: DragKind
  /** Id of the item being dragged (column id or row id). */
  activeId: string | null
  /** Id currently hovered as a drop target. */
  overId: string | null
  /** Side of `overId` the pointer is on. Meaningless while `overId` is null. */
  overEdge: DropEdge
  /** Set when a column is dragged over the grouping drop zone. */
  overGroupingZone: boolean
}

export interface DragApi extends DragState {
  start: (kind: Exclude<DragKind, null>, id: string, event: React.PointerEvent) => void
}

const DragContext = createContext<DragApi>({
  kind: null,
  activeId: null,
  overId: null,
  overEdge: 'before',
  overGroupingZone: false,
  start: () => {},
})

export const useDrag = () => useContext(DragContext)

export interface DragProviderProps {
  children: ReactNode
  onDropColumn?: (activeId: string, overId: string, edge: DropEdge) => void
  onDropRow?: (activeId: string, overId: string, edge: DropEdge) => void
  onDropColumnOnGrouping?: (columnId: string) => void
}

/**
 * Which half of `element` the pointer sits in, along the axis the items are
 * laid out on. Columns follow the writing direction, so in RTL the visually
 * earlier half is the right one.
 */
function resolveEdge(
  kind: Exclude<DragKind, null>,
  element: Element,
  clientX: number,
  clientY: number,
): DropEdge {
  const rect = element.getBoundingClientRect()
  if (kind === 'row') return clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  const rtl = getComputedStyle(element).direction === 'rtl'
  const pastMiddle = clientX > rect.left + rect.width / 2
  return pastMiddle === rtl ? 'before' : 'after'
}

/**
 * Pointer-event based drag reordering.
 *
 * Deliberately not HTML5 drag-and-drop: pointer events work identically under
 * touch, keep the drop target derivable from `elementFromPoint`, and are
 * driveable by Playwright's mouse API, which HTML5 DnD is not.
 */
export function DragProvider({
  children,
  onDropColumn,
  onDropRow,
  onDropColumnOnGrouping,
}: DragProviderProps) {
  const [state, setState] = useState<DragState>({
    kind: null,
    activeId: null,
    overId: null,
    overEdge: 'before',
    overGroupingZone: false,
  })
  const stateRef = useRef(state)
  stateRef.current = state

  const handlersRef = useRef({ onDropColumn, onDropRow, onDropColumnOnGrouping })
  handlersRef.current = { onDropColumn, onDropRow, onDropColumnOnGrouping }

  const start = useCallback((kind: Exclude<DragKind, null>, id: string, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setState({ kind, activeId: id, overId: null, overEdge: 'before', overGroupingZone: false })

    const attribute = kind === 'column' ? 'data-rtc-column-id' : 'data-rtc-row-id'

    const onPointerMove = (moveEvent: PointerEvent) => {
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
      const zone = element?.closest('[data-rtc-grouping-zone="true"]')
      const target = element?.closest(`[${attribute}]`)
      const overId = target?.getAttribute(attribute) ?? null
      const overEdge = target
        ? resolveEdge(kind, target, moveEvent.clientX, moveEvent.clientY)
        : 'before'
      setState((prev) =>
        prev.overId === overId && prev.overEdge === overEdge && prev.overGroupingZone === !!zone
          ? prev
          : { ...prev, overId, overEdge, overGroupingZone: !!zone },
      )
    }

    const onPointerUp = () => {
      const { activeId, overId, overEdge, overGroupingZone } = stateRef.current
      const handlers = handlersRef.current
      if (activeId) {
        if (kind === 'column' && overGroupingZone) handlers.onDropColumnOnGrouping?.(activeId)
        else if (overId && overId !== activeId) {
          if (kind === 'column') handlers.onDropColumn?.(activeId, overId, overEdge)
          else handlers.onDropRow?.(activeId, overId, overEdge)
        }
      }
      setState({
        kind: null,
        activeId: null,
        overId: null,
        overEdge: 'before',
        overGroupingZone: false,
      })
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }, [])

  const value = useMemo<DragApi>(() => ({ ...state, start }), [state, start])

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>
}
