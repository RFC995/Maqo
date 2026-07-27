import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { computePlotSize } from '../buildingGenerator'
import { roomClimateFromSensors, statusColors, type LiveReadings, type Room, type SensorSource } from '../rooms'
import { coverageRings, defaultPropagation, type Propagation } from '../rf'
import { resolveModel } from '../catalog'
import { calcularMapaCalor, mapaCalorParaDataUrl } from '../heatmap'
import { deviceColors, type BuildingConfig, type DeviceItem, type FloorSelector } from '../types'

interface FloorPlan2DProps {
  building: BuildingConfig
  devices: DeviceItem[]
  activeFloor: Exclude<FloorSelector, 'all'>
  rooms: Room[]
  sensorsByRoom: Map<string, SensorSource[]>
  telemetryTick: number
  liveReadings?: LiveReadings
  selectedId: string | null
  placementMode: boolean
  coverageVisible: boolean
  mapaCalorVisivel?: boolean
  propagation?: Propagation
  selectedRoomId?: string | null
  onSelectRoom?: (id: string | null) => void
  onMoveRoom?: (id: string, x: number, z: number) => void
  onPlace: (x: number, z: number) => void
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, z: number) => void
}

function floorLabel(activeFloor: Exclude<FloorSelector, 'all'>) {
  if (activeFloor === 'roof') return 'Cobertura'
  if (activeFloor === 'ground') return 'Exterior / terreno'
  return activeFloor === 0 ? 'Res-do-chao' : `Piso ${activeFloor}`
}

export function FloorPlan2D({
  building,
  devices,
  activeFloor,
  rooms,
  sensorsByRoom,
  telemetryTick,
  liveReadings,
  selectedId,
  placementMode,
  coverageVisible,
  mapaCalorVisivel = false,
  propagation = defaultPropagation,
  selectedRoomId = null,
  onSelectRoom,
  onMoveRoom,
  onPlace,
  onSelect,
  onMove,
}: FloorPlan2DProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragRoomId, setDragRoomId] = useState<string | null>(null)
  const roomGrabOffset = useRef({ dx: 0, dz: 0 })

  const isGround = activeFloor === 'ground'
  const { plotWidth, plotDepth } = computePlotSize(building)
  const planW = isGround ? plotWidth : building.width
  const planD = isGround ? plotDepth : building.depth
  const pad = Math.max(planW, planD) * 0.06
  const viewW = planW + pad * 2
  const viewH = planD + pad * 2
  const halfW = planW / 2
  const halfD = planD / 2

  const floorDevices = devices.filter((d) => {
    if (activeFloor === 'roof') return d.mount === 'roof'
    if (activeFloor === 'ground') return d.mount === 'ground'
    return d.mount === 'interior' && d.floor === activeFloor
  })

  function clientToLocal(evt: { clientX: number; clientY: number }) {
    const svg = svgRef.current
    if (!svg) return { x: 0, z: 0 }
    const rect = svg.getBoundingClientRect()
    const relX = (evt.clientX - rect.left) / rect.width
    const relY = (evt.clientY - rect.top) / rect.height
    const x = -viewW / 2 + relX * viewW
    const z = -viewH / 2 + relY * viewH
    const clampX = Math.max(-halfW + 0.3, Math.min(halfW - 0.3, x))
    const clampZ = Math.max(-halfD + 0.3, Math.min(halfD - 0.3, z))
    return { x: clampX, z: clampZ }
  }

  function handleBackgroundClick(evt: ReactPointerEvent<SVGSVGElement>) {
    if (dragId || dragRoomId) return
    if (!placementMode) {
      onSelect(null)
      onSelectRoom?.(null)
      return
    }
    const { x, z } = clientToLocal(evt)
    onPlace(x, z)
  }

  function handleMarkerDown(evt: ReactPointerEvent<SVGGElement>, id: string) {
    evt.stopPropagation()
    ;(evt.target as Element).setPointerCapture?.(evt.pointerId)
    setDragId(id)
    onSelect(id)
  }

  function handleRoomDown(evt: ReactPointerEvent<SVGGElement>, id: string) {
    if (placementMode || !onSelectRoom) return
    evt.stopPropagation()
    const room = rooms.find((r) => r.id === id)
    if (!room) return
    const { x, z } = clientToLocal(evt)
    // remember where inside the room the grab happened, so it does not jump
    roomGrabOffset.current = { dx: room.x - x, dz: room.z - z }
    ;(evt.target as Element).setPointerCapture?.(evt.pointerId)
    setDragRoomId(id)
    onSelectRoom(id)
    onSelect(null)
  }

  function handlePointerMove(evt: ReactPointerEvent<SVGSVGElement>) {
    if (dragId) {
      const { x, z } = clientToLocal(evt)
      onMove(dragId, x, z)
      return
    }
    if (dragRoomId && onMoveRoom) {
      const { x, z } = clientToLocal(evt)
      const { dx, dz } = roomGrabOffset.current
      onMoveRoom(dragRoomId, x + dx, z + dz)
    }
  }

  function handlePointerUp() {
    setDragId(null)
    setDragRoomId(null)
  }

  // only interior floors have a heatmap; the roof and the plot are not rooms
  const mapaCalor = useMemo(() => {
    if (!mapaCalorVisivel || typeof activeFloor !== 'number') return null
    const mapa = calcularMapaCalor(building, activeFloor, devices, propagation)
    return { url: mapaCalorParaDataUrl(mapa), mapa }
  }, [mapaCalorVisivel, activeFloor, building, devices, propagation])

  const gridStep = planW > 60 ? 10 : planW > 30 ? 5 : 2

  return (
    <div className="floorplan">
      <div className="floorplan-header">
        <span className="floorplan-title">{floorLabel(activeFloor)}</span>
        <span className="floorplan-dims">
          {planW.toFixed(0)} x {planD.toFixed(0)} m &middot; {floorDevices.length} dispositivo(s)
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${-viewW / 2} ${-viewH / 2} ${viewW} ${viewH}`}
        className={placementMode ? 'floorplan-svg placing' : 'floorplan-svg'}
        onPointerDown={handleBackgroundClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <pattern id="fp-grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
            <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="#00000012" strokeWidth={0.06} />
          </pattern>
        </defs>

        <rect x={-viewW / 2} y={-viewH / 2} width={viewW} height={viewH} fill={isGround ? '#e7efe0' : '#f4f1ea'} />
        <rect x={-viewW / 2} y={-viewH / 2} width={viewW} height={viewH} fill="url(#fp-grid)" />

        {isGround ? (
          <rect
            x={-building.width / 2}
            y={-building.depth / 2}
            width={building.width}
            height={building.depth}
            fill="#c9cdd2"
            stroke="#5b6470"
            strokeWidth={0.15}
            strokeDasharray="0.6 0.5"
          />
        ) : (
          <>
            <rect
              x={-halfW}
              y={-halfD}
              width={planW}
              height={planD}
              fill="none"
              stroke="#20242c"
              strokeWidth={0.18}
            />
            {mapaCalor && (
              <image
                href={mapaCalor.url}
                x={-building.width / 2}
                y={-building.depth / 2}
                width={building.width}
                height={building.depth}
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {rooms.map((room) => {
              const climate = roomClimateFromSensors(sensorsByRoom.get(room.id) ?? [], telemetryTick, liveReadings)
              const color = statusColors[climate.status]
              const roomSelected = room.id === selectedRoomId
              return (
                <g
                  key={room.id}
                  className="floorplan-room"
                  style={{ pointerEvents: placementMode ? 'none' : undefined, cursor: 'move' }}
                  onPointerDown={(evt) => handleRoomDown(evt, room.id)}
                >
                  <rect
                    x={room.x - room.width / 2}
                    y={room.z - room.depth / 2}
                    width={room.width}
                    height={room.depth}
                    fill={color}
                    fillOpacity={climate.hasData ? 0.11 : 0.04}
                    stroke={roomSelected ? '#4f46e5' : color}
                    strokeWidth={roomSelected ? 0.32 : 0.16}
                    strokeDasharray={climate.hasData || roomSelected ? undefined : '0.6 0.4'}
                  />
                  {roomSelected && (
                    <rect
                      x={room.x - room.width / 2 - 0.25}
                      y={room.z - room.depth / 2 - 0.25}
                      width={room.width + 0.5}
                      height={room.depth + 0.5}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth={0.1}
                      strokeDasharray="0.5 0.35"
                      opacity={0.7}
                    />
                  )}
                  <text
                    x={room.x}
                    y={room.z - room.depth / 2 + Math.max(1.0, pad * 0.32)}
                    textAnchor="middle"
                    fontSize={Math.max(0.75, pad * 0.26)}
                    fill="#374151"
                    style={{ fontWeight: 700 }}
                  >
                    {room.name}
                  </text>
                  <text
                    x={room.x}
                    y={room.z - room.depth / 2 + Math.max(1.0, pad * 0.32) + Math.max(0.9, pad * 0.3)}
                    textAnchor="middle"
                    fontSize={Math.max(0.65, pad * 0.22)}
                    fill="#6b7280"
                  >
                    {climate.hasData
                      ? `${climate.temperature!.toFixed(1)}°C${climate.humidity !== null ? ` · ${climate.humidity.toFixed(0)}%` : ''}`
                      : 'sem sensor'}
                  </text>
                </g>
              )
            })}
          </>
        )}

        <text x={0} y={halfD + pad * 0.55} textAnchor="middle" fontSize={pad * 0.4} fill="#475569">
          entrada
        </text>
        <g transform={`translate(${-halfW - pad * 0.35}, ${-halfD - pad * 0.2})`}>
          <line x1={0} y1={pad * 0.35} x2={0} y2={-pad * 0.05} stroke="#334155" strokeWidth={0.12} />
          <path d={`M ${-pad * 0.12} ${pad * 0.08} L 0 ${-pad * 0.05} L ${pad * 0.12} ${pad * 0.08}`} fill="none" stroke="#334155" strokeWidth={0.12} />
          <text x={0} y={pad * 0.5} textAnchor="middle" fontSize={pad * 0.32} fill="#334155">
            N
          </text>
        </g>

        {floorDevices.map((device) => {
          const color = deviceColors[device.type]
          const selected = device.id === selectedId
          const isRf = device.type === 'gateway' || device.type === 'repeater'
          return (
            <g
              key={device.id}
              transform={`translate(${device.x}, ${device.z})`}
              onPointerDown={(evt) => handleMarkerDown(evt, device.id)}
              className="floorplan-marker"
            >
              {coverageVisible &&
                (device.type === 'gateway' ? (
                  <>
                    {[...coverageRings(device, propagation)].reverse().map((ring) => (
                      <circle
                        key={ring.sf}
                        r={ring.drawRadius}
                        fill={ring.color}
                        opacity={0.06}
                        stroke={ring.color}
                        strokeOpacity={0.5}
                        strokeWidth={0.12}
                      />
                    ))}
                  </>
                ) : (
                  <circle
                    r={device.radius}
                    fill={color}
                    opacity={isRf ? 0.06 : 0.08}
                    stroke={color}
                    strokeOpacity={0.35}
                    strokeWidth={0.1}
                  />
                ))}
              {selected && <circle r={0.75} fill="none" stroke={color} strokeWidth={0.16} />}
              <circle r={0.42} fill={color} stroke="#111827" strokeWidth={0.08} />
              <circle r={0.12} fill="#111827" />
              <text
                y={1.35}
                textAnchor="middle"
                fontSize={Math.max(0.7, pad * 0.24)}
                fill="#1f2937"
                stroke="#f6f3ea"
                strokeWidth={0.09}
                paintOrder="stroke"
                style={{ pointerEvents: 'none', fontWeight: 600 }}
              >
                {/* the room already carries its own label, so a marker only
                    needs its model code until it is the one being inspected */}
                {selected ? device.name : (resolveModel(device.modelId)?.model ?? device.name)}
              </text>
            </g>
          )
        })}
      </svg>
      {placementMode && <div className="floorplan-hint">Clica na planta para colocar o dispositivo</div>}
    </div>
  )
}
