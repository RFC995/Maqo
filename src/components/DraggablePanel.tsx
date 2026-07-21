import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

interface DraggablePanelProps {
  title: string
  icon?: ReactNode
  defaultPosition: { x: number; y: number }
  width?: number
  children: ReactNode
}

export function DraggablePanel({ title, icon, defaultPosition, width = 320, children }: DraggablePanelProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [collapsed, setCollapsed] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

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
