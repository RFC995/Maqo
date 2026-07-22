import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

interface DraggablePanelProps {
  title: string
  icon?: ReactNode
  defaultPosition: { x: number; y: number }
  width?: number
  /** localStorage key; when given, position and collapsed state are remembered */
  storageKey?: string
  children: ReactNode
}

interface PanelState {
  x: number
  y: number
  collapsed: boolean
}

function readState(key: string | undefined): PanelState | null {
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PanelState
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null
    // a window resize can leave a remembered position off screen
    return {
      x: Math.min(Math.max(8, parsed.x), Math.max(8, window.innerWidth - 120)),
      y: Math.min(Math.max(8, parsed.y), Math.max(8, window.innerHeight - 60)),
      collapsed: !!parsed.collapsed,
    }
  } catch {
    return null
  }
}

export function DraggablePanel({
  title,
  icon,
  defaultPosition,
  width = 320,
  storageKey,
  children,
}: DraggablePanelProps) {
  const [position, setPosition] = useState(() => readState(storageKey) ?? defaultPosition)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = readState(storageKey)
    if (saved) return saved.collapsed
    // on a narrow screen an expanded panel covers the whole 3D view, so start
    // out of the way and let the user open it
    return window.innerWidth < 1450
  })
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...position, collapsed }))
    } catch {
      // storage unavailable - the panel just forgets between sessions
    }
  }, [storageKey, position, collapsed])

  function handlePointerDown(evt: ReactPointerEvent<HTMLDivElement>) {
    if ((evt.target as HTMLElement).closest('button')) return
    evt.currentTarget.setPointerCapture(evt.pointerId)
    dragState.current = { startX: evt.clientX, startY: evt.clientY, originX: position.x, originY: position.y }
  }

  function handlePointerMove(evt: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current) return
    const dx = evt.clientX - dragState.current.startX
    const dy = evt.clientY - dragState.current.startY
    const panelWidth = panelRef.current?.offsetWidth ?? width
    const maxX = Math.max(8, window.innerWidth - panelWidth - 8)
    const maxY = Math.max(8, window.innerHeight - 48)
    setPosition({
      x: Math.min(Math.max(8, dragState.current.originX + dx), maxX),
      y: Math.min(Math.max(8, dragState.current.originY + dy), maxY),
    })
  }

  function handlePointerUp(evt: ReactPointerEvent<HTMLDivElement>) {
    dragState.current = null
    evt.currentTarget.releasePointerCapture?.(evt.pointerId)
  }

  return (
    <div ref={panelRef} className="floating-panel" style={{ left: position.x, top: position.y, width }}>
      <div
        className="floating-panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="floating-panel-title">
          {icon}
          {title}
        </span>
        <button
          type="button"
          className="floating-panel-toggle"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>
      {!collapsed && <div className="floating-panel-body">{children}</div>}
    </div>
  )
}
