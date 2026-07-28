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

export interface DragState {
  kind: DragKind
  /** Id of the item being dragged (column id or row id). */
  activeId: string | null
  /** Id currently hovered as a drop target. */
  overId: string | null
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
  overGroupingZone: false,
  start: () => {},
})

export const useDrag = () => useContext(DragContext)

export interface DragProviderProps {
  children: ReactNode
  onDropColumn?: (activeId: string, overId: string) => void
  onDropRow?: (activeId: string, overId: string) => void
  onDropColumnOnGrouping?: (columnId: string) => void
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
    overGroupingZone: false,
  })
  const stateRef = useRef(state)
  stateRef.current = state

  const handlersRef = useRef({ onDropColumn, onDropRow, onDropColumnOnGrouping })
  handlersRef.current = { onDropColumn, onDropRow, onDropColumnOnGrouping }

  const start = useCallback((kind: Exclude<DragKind, null>, id: string, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setState({ kind, activeId: id, overId: null, overGroupingZone: false })

    const attribute = kind === 'column' ? 'data-rtc-column-id' : 'data-rtc-row-id'

    const onPointerMove = (moveEvent: PointerEvent) => {
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
      const zone = element?.closest('[data-rtc-grouping-zone="true"]')
      const target = element?.closest(`[${attribute}]`)
      const overId = target?.getAttribute(attribute) ?? null
      setState((prev) =>
        prev.overId === overId && prev.overGroupingZone === !!zone
          ? prev
          : { ...prev, overId, overGroupingZone: !!zone },
      )
    }

    const onPointerUp = () => {
      const { activeId, overId, overGroupingZone } = stateRef.current
      const handlers = handlersRef.current
      if (activeId) {
        if (kind === 'column' && overGroupingZone) handlers.onDropColumnOnGrouping?.(activeId)
        else if (overId && overId !== activeId) {
          if (kind === 'column') handlers.onDropColumn?.(activeId, overId)
          else handlers.onDropRow?.(activeId, overId)
        }
      }
      setState({ kind: null, activeId: null, overId: null, overGroupingZone: false })
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
