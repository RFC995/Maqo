import { Fragment } from 'react'
import { Html } from '@react-three/drei'
import {
  roomClimateFromSensors,
  statusColors,
  type LiveReadings,
  type Room,
  type RoomClimate,
  type SensorSource,
} from '../rooms'
import type { BuildingConfig } from '../types'

interface InteriorFloorProps {
  building: BuildingConfig
  floorIndex: number
  rooms: Room[]
  telemetryTick: number
  labelsVisible: boolean
  sensorsByRoom: Map<string, SensorSource[]>
  liveReadings?: LiveReadings
}

const PARTITION_H = 1.55
const PARTITION_T = 0.09
const partitionColor = '#f3efe6'
const floorColor = '#e7e1d3'

export function InteriorFloor({
  building,
  floorIndex,
  rooms,
  telemetryTick,
  labelsVisible,
  sensorsByRoom,
  liveReadings,
}: InteriorFloorProps) {
  const y0 = floorIndex * building.floorHeight

  return (
    <group position={[0, y0, 0]}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[building.width - 0.15, 0.1, building.depth - 0.15]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>

      {rooms.map((room) => {
        const climate = roomClimateFromSensors(sensorsByRoom.get(room.id) ?? [], telemetryTick, liveReadings)
        const color = statusColors[climate.status]

        return (
          <Fragment key={room.id}>
            <RoomPartitions room={room} />
            <RoomZone room={room} color={color} />
            <RoomFurniture room={room} />
            {labelsVisible && <RoomCallout room={room} color={color} climate={climate} />}
          </Fragment>
        )
      })}
    </group>
  )
}

function RoomPartitions({ room }: { room: Room }) {
  const inset = 0.05
  const w = room.width - inset * 2
  const d = room.depth - inset * 2
  const doorW = Math.min(1.1, w * 0.3)

  const doorZ = room.doorSide === 1 ? room.z + d / 2 : room.z - d / 2
  const solidZ = room.doorSide === 1 ? room.z - d / 2 : room.z + d / 2

  const segW = (w - doorW) / 2

  return (
    <group>
      <mesh position={[room.x, PARTITION_H / 2 + 0.1, solidZ]} castShadow>
        <boxGeometry args={[w, PARTITION_H, PARTITION_T]} />
        <meshStandardMaterial color={partitionColor} roughness={0.85} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[room.x + side * (doorW / 2 + segW / 2), PARTITION_H / 2 + 0.1, doorZ]}
          castShadow
        >
          <boxGeometry args={[segW, PARTITION_H, PARTITION_T]} />
          <meshStandardMaterial color={partitionColor} roughness={0.85} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[room.x + side * (w / 2), PARTITION_H / 2 + 0.1, room.z]} castShadow>
          <boxGeometry args={[PARTITION_T, PARTITION_H, d + PARTITION_T]} />
          <meshStandardMaterial color={partitionColor} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function RoomZone({ room, color }: { room: Room; color: string }) {
  const t = 0.14
  const w = room.width - 0.2
  const d = room.depth - 0.2
  return (
    <group position={[room.x, 0.115, room.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      {[
        { pos: [0, 0, d / 2 - t / 2] as const, size: [w, t] as const },
        { pos: [0, 0, -d / 2 + t / 2] as const, size: [w, t] as const },
        { pos: [w / 2 - t / 2, 0, 0] as const, size: [t, d - t * 2] as const },
        { pos: [-w / 2 + t / 2, 0, 0] as const, size: [t, d - t * 2] as const },
      ].map((edge, i) => (
        <mesh key={i} position={[edge.pos[0], 0.004, edge.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={edge.size} />
          <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function RoomCallout({ room, color, climate }: { room: Room; color: string; climate: RoomClimate }) {
  const lineTop = PARTITION_H + 1.15
  return (
    <group position={[room.x, 0, room.z]}>
      <mesh position={[0, lineTop / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.014, 0.014, lineTop, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.2, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={30} position={[0, lineTop + 0.45, 0]} zIndexRange={[14, 0]} style={{ pointerEvents: 'none' }}>
        <div className={climate.hasData ? 'room-callout' : 'room-callout nodata'} style={{ borderColor: color }}>
          <span className="room-callout-name">{room.name}</span>
          {climate.hasData ? (
            <span className="room-callout-metrics">
              <span className="room-metric">{climate.temperature!.toFixed(1)} &deg;C</span>
              {climate.humidity !== null && <span className="room-metric dim">{climate.humidity.toFixed(0)} %</span>}
              {climate.co2 !== null && <span className="room-metric dim">{climate.co2} ppm</span>}
            </span>
          ) : (
            <span className="room-callout-metrics">
              <span className="room-metric muted">sem sensor</span>
            </span>
          )}
        </div>
      </Html>
    </group>
  )
}

const woodColor = '#c8a06a'
const darkColor = '#3c4148'
const seatColor = '#5b6570'

function Desk({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0.1, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.4, 0.05, 0.7]} />
        <meshStandardMaterial color={woodColor} roughness={0.6} />
      </mesh>
      {[-0.62, 0.62].map((sx) => (
        <mesh key={sx} position={[sx, 0.36, 0]} castShadow>
          <boxGeometry args={[0.05, 0.72, 0.6]} />
          <meshStandardMaterial color={darkColor} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.25, 0.87, -0.1]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.03]} />
        <meshStandardMaterial color="#1c2026" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.45, 0.62]} castShadow>
        <boxGeometry args={[0.46, 0.1, 0.46]} />
        <meshStandardMaterial color={seatColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.72, 0.83]} castShadow>
        <boxGeometry args={[0.46, 0.5, 0.08]} />
        <meshStandardMaterial color={seatColor} roughness={0.8} />
      </mesh>
    </group>
  )
}

function MeetingTable({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const chairs: [number, number][] = []
  const perSide = Math.max(2, Math.floor(w / 0.9))
  for (let i = 0; i < perSide; i += 1) {
    const cx = -w / 2 + ((i + 0.5) / perSide) * w
    chairs.push([cx, d / 2 + 0.35], [cx, -d / 2 - 0.35])
  }
  return (
    <group position={[x, 0.1, z]}>
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color={woodColor} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <boxGeometry args={[w * 0.5, 0.74, d * 0.4]} />
        <meshStandardMaterial color={darkColor} roughness={0.6} />
      </mesh>
      {chairs.map(([cx, cz], i) => (
        <mesh key={i} position={[cx, 0.45, cz]} castShadow>
          <boxGeometry args={[0.44, 0.1, 0.44]} />
          <meshStandardMaterial color={seatColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function RoundTable({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.1, z]}>
      <mesh position={[0, 0.73, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.05, 20]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.16, 0.72, 10]} />
        <meshStandardMaterial color={darkColor} roughness={0.5} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.85, 0.44, Math.sin(a) * 0.85]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
          <meshStandardMaterial color={seatColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.1, z]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.4, 10]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color="#4c8a48" roughness={0.9} flatShading />
      </mesh>
    </group>
  )
}

function Cabinet({ x, z, w = 1.0 }: { x: number; z: number; w?: number }) {
  return (
    <mesh position={[x, 0.65, z]} castShadow>
      <boxGeometry args={[w, 1.1, 0.45]} />
      <meshStandardMaterial color="#9aa2ac" roughness={0.6} metalness={0.2} />
    </mesh>
  )
}

function Sofa({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0.1, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.7, 0.4, 0.75]} />
        <meshStandardMaterial color="#7a4f3d" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, -0.3]} castShadow>
        <boxGeometry args={[1.7, 0.55, 0.16]} />
        <meshStandardMaterial color="#7a4f3d" roughness={0.85} />
      </mesh>
    </group>
  )
}

function RoomFurniture({ room }: { room: Room }) {
  const w = room.width
  const d = room.depth
  const cx = room.x
  const cz = room.z
  const px = cx - w / 2 + 0.6
  const pz = cz - d / 2 + 0.6

  switch (room.kind) {
    case 'openspace': {
      const cols = Math.max(1, Math.floor((w - 1.6) / 2.1))
      const rows = Math.max(1, Math.floor((d - 1.6) / 2.4))
      const desks = []
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          desks.push(
            <Desk
              key={`${r}-${c}`}
              x={cx - ((cols - 1) * 2.1) / 2 + c * 2.1}
              z={cz - ((rows - 1) * 2.4) / 2 + r * 2.4}
              rotY={r % 2 === 0 ? 0 : Math.PI}
            />,
          )
        }
      }
      return (
        <group>
          {desks}
          <Plant x={px} z={pz} />
        </group>
      )
    }
    case 'reuniao':
      return (
        <group>
          <MeetingTable x={cx} z={cz} w={Math.min(w - 1.8, 3.2)} d={Math.min(d - 1.8, 1.3)} />
          <Plant x={cx + w / 2 - 0.6} z={cz + d / 2 - 0.6} />
        </group>
      )
    case 'refeitorio': {
      const tables = []
      const cols = Math.max(1, Math.floor((w - 1.4) / 2.4))
      for (let c = 0; c < cols; c += 1) {
        tables.push(<RoundTable key={c} x={cx - ((cols - 1) * 2.4) / 2 + c * 2.4} z={cz} />)
      }
      return (
        <group>
          {tables}
          <Cabinet x={cx - w / 2 + 0.65} z={cz - d / 2 + 0.4} w={Math.min(2.2, w * 0.4)} />
        </group>
      )
    }
    case 'direcao':
      return (
        <group>
          <Desk x={cx + w * 0.15} z={cz - d * 0.15} rotY={Math.PI / 8} />
          <Sofa x={cx - w * 0.2} z={cz + d * 0.25} rotY={Math.PI} />
          <Plant x={cx + w / 2 - 0.6} z={cz + d / 2 - 0.6} />
        </group>
      )
    case 'escritorio':
      return (
        <group>
          <Desk x={cx - w * 0.18} z={cz} />
          {w > 4.6 && <Desk x={cx + w * 0.22} z={cz} rotY={Math.PI} />}
          <Cabinet x={cx + w / 2 - 0.65} z={cz - d / 2 + 0.4} />
        </group>
      )
    case 'rececao':
      return (
        <group>
          <mesh position={[cx, 0.55, cz + d * 0.1]} castShadow>
            <boxGeometry args={[Math.min(2.6, w * 0.5), 0.9, 0.6]} />
            <meshStandardMaterial color={woodColor} roughness={0.55} />
          </mesh>
          <Sofa x={cx - w * 0.24} z={cz - d * 0.25} />
          <Plant x={cx + w / 2 - 0.6} z={cz - d / 2 + 0.6} />
        </group>
      )
    case 'armazem':
    case 'arquivo':
      return (
        <group>
          <Cabinet x={cx - w * 0.25} z={cz - d / 2 + 0.4} w={Math.min(2.4, w * 0.42)} />
          <Cabinet x={cx + w * 0.25} z={cz - d / 2 + 0.4} w={Math.min(2.4, w * 0.42)} />
          <Cabinet x={cx - w * 0.25} z={cz + d / 2 - 0.4} w={Math.min(2.4, w * 0.42)} />
        </group>
      )
    case 'copa':
      return (
        <group>
          <RoundTable x={cx} z={cz + d * 0.12} />
          <Cabinet x={cx} z={cz - d / 2 + 0.4} w={Math.min(2.4, w * 0.5)} />
        </group>
      )
    case 'sanitarios': {
      // a row of cubicle dividers along the back wall
      const stalls = Math.max(1, Math.floor(w / 1.3))
      return (
        <group>
          {Array.from({ length: stalls }, (_, i) => (
            <Cabinet
              key={i}
              x={cx - ((stalls - 1) * 1.3) / 2 + i * 1.3}
              z={cz - d / 2 + 0.7}
              w={1}
            />
          ))}
        </group>
      )
    }
    case 'tecnica':
      return (
        <group>
          <Cabinet x={cx - w / 2 + 0.5} z={cz} w={Math.min(2.2, d * 0.6)} />
          <Cabinet x={cx + w / 2 - 0.5} z={cz} w={Math.min(2.2, d * 0.6)} />
        </group>
      )
    case 'corredor':
      return null
    default:
      return (
        <group>
          <Cabinet x={px} z={pz} w={Math.min(2, w * 0.4)} />
        </group>
      )
  }
}
