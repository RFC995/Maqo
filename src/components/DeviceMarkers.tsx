import { Billboard, Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { resolveModel } from '../catalog'
import { deviceWorldYFor } from '../geometry'
import { coverageRings, dataRate, defaultPropagation, type Propagation } from '../rf'
import { deviceColors, type BuildingConfig, type DeviceItem, type DeviceType } from '../types'

export const deviceWorldY = deviceWorldYFor

interface DeviceMarkersProps {
  devices: DeviceItem[]
  building: BuildingConfig
  selectedId: string | null
  visibleFloor: number | 'roof' | 'ground' | 'all'
  coverageVisible: boolean
  coverageOpacity: number
  labelsVisible: boolean
  propagation?: Propagation
  onSelect: (id: string) => void
}

export function DeviceMarkers({
  devices,
  building,
  selectedId,
  visibleFloor,
  coverageVisible,
  coverageOpacity,
  labelsVisible,
  propagation = defaultPropagation,
  onSelect,
}: DeviceMarkersProps) {
  return (
    <group>
      {devices.map((device) => {
        const dimmed =
          visibleFloor !== 'all' &&
          !(
            (visibleFloor === 'roof' && device.mount === 'roof') ||
            (visibleFloor === 'ground' && device.mount === 'ground') ||
            (typeof visibleFloor === 'number' && device.mount === 'interior' && device.floor === visibleFloor)
          )

        return (
          <DeviceMarker
            key={device.id}
            device={device}
            building={building}
            selected={device.id === selectedId}
            dimmed={dimmed}
            coverageVisible={coverageVisible}
            coverageOpacity={coverageOpacity}
            labelVisible={labelsVisible && !dimmed}
            propagation={propagation}
            onSelect={onSelect}
          />
        )
      })}
    </group>
  )
}

function locationLabel(device: DeviceItem) {
  if (device.mount === 'roof') return 'Cobertura'
  if (device.mount === 'ground') return 'Exterior'
  return device.floor === 0 ? 'R/C' : `Piso ${device.floor}`
}

function DeviceMarker({
  device,
  building,
  selected,
  dimmed,
  coverageVisible,
  coverageOpacity,
  labelVisible,
  propagation,
  onSelect,
}: {
  device: DeviceItem
  building: BuildingConfig
  selected: boolean
  dimmed: boolean
  coverageVisible: boolean
  coverageOpacity: number
  labelVisible: boolean
  propagation: Propagation
  onSelect: (id: string) => void
}) {
  const y = deviceWorldY(device, building)
  const color = deviceColors[device.type]
  const baseOpacity = dimmed ? 0.16 : 1
  const poleBottom =
    device.mount === 'interior' ? (device.floor ?? 0) * building.floorHeight : device.mount === 'ground' ? 0 : null

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    onSelect(device.id)
  }

  return (
    <group position={[device.x, y, device.z]}>
      {poleBottom !== null && y - poleBottom > 0.15 && (
        <mesh position={[0, -(y - poleBottom) / 2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, y - poleBottom, 6]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={dimmed ? 0.08 : 0.5} />
        </mesh>
      )}

      <mesh onPointerDown={handlePointerDown} castShadow>
        <DeviceShape type={device.type} />
        <meshStandardMaterial
          color={color}
          transparent={dimmed}
          opacity={baseOpacity}
          emissive={selected ? color : '#000000'}
          emissiveIntensity={selected ? 0.6 : 0}
        />
      </mesh>

      <mesh position={[0, -0.22, 0]} onPointerDown={handlePointerDown}>
        <cylinderGeometry args={[0.15, 0.15, 0.08, 12]} />
        <meshStandardMaterial color="#111827" transparent={dimmed} opacity={baseOpacity} />
      </mesh>

      {!dimmed && (
        <Billboard>
          <mesh onPointerDown={handlePointerDown} renderOrder={996}>
            <circleGeometry args={[0.34, 20]} />
            <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.92} />
          </mesh>
          <mesh renderOrder={997}>
            <ringGeometry args={[0.34, 0.42, 24]} />
            <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={selected ? 1 : 0.55} />
          </mesh>
        </Billboard>
      )}

      {labelVisible && (
        /*
         * Compact by default — a dense floor plan puts dozens of these on
         * screen at once and full names turned the building into a wall of
         * overlapping chips. The selected device gets the full detail.
         */
        <Html center distanceFactor={38} position={[0, 1.05, 0]} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className={selected ? 'device-label selected' : 'device-label compact'} style={{ borderColor: color }}>
            <span className="device-label-dot" style={{ background: color }} />
            {selected ? (
              <span className="device-label-text">
                <span className="device-label-name">{device.name}</span>
                <span className="device-label-meta">
                  {resolveModel(device.modelId)?.name ?? `${locationLabel(device)} · R ${device.radius} m`}
                </span>
              </span>
            ) : (
              <span className="device-label-code">{resolveModel(device.modelId)?.model ?? device.name}</span>
            )}
          </div>
        </Html>
      )}

      {selected && (
        <mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.42, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} side={2} />
        </mesh>
      )}

      {coverageVisible && !dimmed && (
        <CoverageShape
          device={device}
          groundOffset={-y}
          opacity={coverageOpacity}
          color={color}
          propagation={propagation}
          selected={selected}
        />
      )}
    </group>
  )
}

function DeviceShape({ type }: { type: DeviceType }) {
  switch (type) {
    case 'gateway':
      return <cylinderGeometry args={[0.22, 0.26, 0.42, 16]} />
    case 'sensor':
      return <sphereGeometry args={[0.24, 18, 18]} />
    case 'camera':
      return <coneGeometry args={[0.26, 0.5, 14]} />
    case 'repeater':
      return <cylinderGeometry args={[0.06, 0.06, 0.75, 10]} />
  }
}

/**
 * RF planning footprint projected on the ground. For gateways the rings are the
 * real per-spreading-factor ranges from the EU868 link budget (SF7 fast/close
 * out to SF12 slow/far), so the picture changes with the propagation model
 * rather than being a fixed fraction of an arbitrary radius.
 */
function CoverageShape({
  device,
  groundOffset,
  opacity,
  color,
  propagation,
  selected,
}: {
  device: DeviceItem
  groundOffset: number
  opacity: number
  color: string
  propagation: Propagation
  selected: boolean
}) {
  const radius = device.radius

  if (device.type === 'camera') {
    return (
      <mesh position={[0, -radius * 0.16, 0]}>
        <coneGeometry args={[radius * 0.42, radius * 0.32, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 1.4} side={2} depthWrite={false} />
      </mesh>
    )
  }

  if (device.type === 'sensor') {
    return (
      <group position={[0, groundOffset + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[radius, 48]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.9} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[radius * 0.985, radius, 48]} />
          <meshBasicMaterial color={color} transparent opacity={Math.min(0.85, opacity * 4)} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  // repeaters and other non-gateway radios keep a single planning disc
  if (device.type !== 'gateway') {
    return (
      <group position={[0, groundOffset + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[radius, 56]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[radius * 0.99, radius, 56]} />
          <meshBasicMaterial color={color} transparent opacity={Math.min(0.85, opacity * 4)} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  const rings = coverageRings(device, propagation)

  return (
    <group position={[0, groundOffset, 0]}>
      {rings.map((ring, i) => {
        const inner = i === 0 ? 0 : rings[i - 1].drawRadius
        if (ring.drawRadius <= inner) return null
        return (
          <group key={ring.sf} position={[0, 0.05 + (rings.length - i) * 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[inner, ring.drawRadius, 96]} />
              <meshBasicMaterial color={ring.color} transparent opacity={opacity * (1.15 - i * 0.28)} depthWrite={false} />
            </mesh>
            <mesh>
              <ringGeometry args={[ring.drawRadius * 0.996, ring.drawRadius, 96]} />
              <meshBasicMaterial color={ring.color} transparent opacity={Math.min(0.9, opacity * 4.5)} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
      {/* ring read-outs only for the gateway being inspected, else every
          gateway adds three more floating chips to the scene */}
      {selected &&
        rings.map((ring, i) => (
          <Html
            key={`sf-${ring.sf}`}
            center
            distanceFactor={60}
            position={[0, 0.2 + i * 0.02, ring.drawRadius * -0.72]}
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="sf-ring-label" style={{ borderColor: ring.color, color: ring.color }}>
              SF{ring.sf} · {ring.clamped ? '>' : ''}
              {ring.radius >= 1000 ? `${(ring.radius / 1000).toFixed(1)} km` : `${Math.round(ring.radius)} m`} ·{' '}
              {(dataRate[ring.sf].bps / 1000).toFixed(2)} kbps
            </div>
          </Html>
        ))}
    </group>
  )
}
