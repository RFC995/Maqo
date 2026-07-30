import type { Building, BuildingConfig, DeviceItem, Project, Room, RoomKind } from './types'
import { roomKindLabels } from './types'
import { createRng } from './buildingGenerator'
import { resolveModel, type Measurement } from './catalog'
import { primaryMeasurements, readingStatus, sensorReading, type ReadingStatus } from './telemetry'

export type { Room, RoomKind }
export { roomKindLabels }

const groundFloorPool: RoomKind[] = ['rececao', 'refeitorio', 'openspace', 'armazem', 'reuniao', 'copa']
const upperFloorPool: RoomKind[] = ['openspace', 'escritorio', 'reuniao', 'direcao', 'escritorio', 'arquivo']

function splitBand(total: number, count: number, rng: () => number) {
  const weights = Array.from({ length: count }, () => 0.75 + rng() * 0.5)
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => (w / sum) * total)
}

export function generateRooms(building: BuildingConfig, floorIndex: number, seed: number): Room[] {
  const rng = createRng(seed * 5077 + floorIndex * 733 + Math.round(building.width * 17 + building.depth * 41))

  const wallInset = 0.45
  const innerW = building.width - wallInset * 2
  const innerD = building.depth - wallInset * 2
  const corridorDepth = Math.min(2.2, innerD * 0.16)

  const bandDepth = (innerD - corridorDepth) / 2
  const northZ = -corridorDepth / 2 - bandDepth / 2
  const southZ = corridorDepth / 2 + bandDepth / 2

  const roomCount = Math.max(2, Math.min(4, Math.round(innerW / 8)))
  const pool = floorIndex === 0 ? [...groundFloorPool] : [...upperFloorPool]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const rooms: Room[] = []
  const kindCounts = new Map<RoomKind, number>()
  let poolIdx = 0

  function nextKind(): RoomKind {
    const kind = pool[poolIdx % pool.length]
    poolIdx += 1
    return kind
  }

  function pushRoom(x: number, z: number, width: number, depth: number, doorSide: 1 | -1) {
    const kind = nextKind()
    const count = (kindCounts.get(kind) ?? 0) + 1
    kindCounts.set(kind, count)
    const suffix = count > 1 ? ` ${count}` : ''
    rooms.push({
      id: `f${floorIndex}-r${rooms.length}`,
      kind,
      name: `${roomKindLabels[kind]}${suffix}`,
      x,
      z,
      width,
      depth,
      doorSide,
    })
  }

  for (const [bandZ, doorSide] of [
    [northZ, 1],
    [southZ, -1],
  ] as [number, 1 | -1][]) {
    const widths = splitBand(innerW, roomCount, rng)
    let cursor = -innerW / 2
    for (const w of widths) {
      pushRoom(cursor + w / 2, bandZ, w, bandDepth, doorSide)
      cursor += w
    }
  }

  return rooms
}

function roomsKey(buildingId: string, floorIndex: number) {
  return `${buildingId}:${floorIndex}`
}

/**
 * The rooms in force for a floor: the user's saved layout when there is one,
 * otherwise the procedural layout for the current seed.
 */
export function resolveRooms(project: Project, building: Building, floorIndex: number): Room[] {
  const saved = project.rooms?.[roomsKey(building.id, floorIndex)]
  if (saved) return saved
  return generateRooms(building.config, floorIndex, project.seed)
}

export function isFloorCustomised(project: Project, building: Building, floorIndex: number): boolean {
  return project.rooms?.[roomsKey(building.id, floorIndex)] !== undefined
}

/** A new room dropped in the middle of the floor, ready to be dragged. */
export function createRoom(building: BuildingConfig, existing: Room[]): Room {
  const width = Math.min(6, building.width * 0.3)
  const depth = Math.min(5, building.depth * 0.3)
  return {
    id: `room-${crypto.randomUUID().slice(0, 8)}`,
    kind: 'escritorio',
    name: `${roomKindLabels.escritorio} ${existing.length + 1}`,
    x: 0,
    z: 0,
    width,
    depth,
    doorSide: 1,
  }
}

export interface SeatAnchor {
  x: number
  z: number
  /** which way the chair faces, so furniture and any future device marker agree */
  rotY: number
}

/** Table footprint for a meeting room, clamped so it never crowds a small room. */
export function meetingTableSpan(room: Room): { w: number; d: number } {
  return { w: Math.min(room.width - 1.8, 3.2), d: Math.min(room.depth - 1.8, 1.3) }
}

/**
 * One seat per chair around the meeting table, in world coordinates — the
 * same anchors the meeting-room furniture is drawn from (see MeetingTable in
 * Interior.tsx), so "one sensor per seat" always lines up with a real chair.
 */
export function meetingSeats(room: Room): SeatAnchor[] {
  const { w, d } = meetingTableSpan(room)
  const perSide = Math.max(2, Math.floor(w / 0.9))
  const seats: SeatAnchor[] = []
  for (let i = 0; i < perSide; i += 1) {
    const cx = room.x - w / 2 + ((i + 0.5) / perSide) * w
    seats.push({ x: cx, z: room.z + d / 2 + 0.35, rotY: 0 })
    seats.push({ x: cx, z: room.z - d / 2 - 0.35, rotY: Math.PI })
  }
  return seats
}

const DESK_SPACING_X = 2.1
const DESK_SPACING_Z = 2.4

/**
 * One seat per desk in an open-space grid, in world coordinates — a desk IS
 * the seat here, since a desk-occupancy sensor (e.g. Milesight VS341) mounts
 * under the desk itself rather than the chair.
 */
export function openspaceSeats(room: Room): SeatAnchor[] {
  const cols = Math.max(1, Math.floor((room.width - 1.6) / DESK_SPACING_X))
  const rows = Math.max(1, Math.floor((room.depth - 1.6) / DESK_SPACING_Z))
  const seats: SeatAnchor[] = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      seats.push({
        x: room.x - ((cols - 1) * DESK_SPACING_X) / 2 + c * DESK_SPACING_X,
        z: room.z - ((rows - 1) * DESK_SPACING_Z) / 2 + r * DESK_SPACING_Z,
        rotY: r % 2 === 0 ? 0 : Math.PI,
      })
    }
  }
  return seats
}

/**
 * Every seat a sensor could be bulk-placed at, for room kinds with repeated
 * per-seat furniture. Empty for kinds without individual seats (storage,
 * corridors, reception...).
 */
export function seatsForRoom(room: Room): SeatAnchor[] {
  if (room.kind === 'reuniao') return meetingSeats(room)
  if (room.kind === 'openspace') return openspaceSeats(room)
  return []
}

/** Keeps a room inside the building footprint after a move or a resize. */
export function clampRoom(room: Room, building: BuildingConfig): Room {
  const inset = 0.45
  const maxW = building.width - inset * 2
  const maxD = building.depth - inset * 2
  const width = Math.max(1.5, Math.min(room.width, maxW))
  const depth = Math.max(1.5, Math.min(room.depth, maxD))
  const limitX = (maxW - width) / 2
  const limitZ = (maxD - depth) / 2
  return {
    ...room,
    width,
    depth,
    x: Math.max(-limitX, Math.min(limitX, room.x)),
    z: Math.max(-limitZ, Math.min(limitZ, room.z)),
  }
}

export type RoomStatus = 'cool' | 'normal' | 'warm' | 'hot' | 'nodata'

export interface SensorSource {
  sensorId: string
  /** what the model placed in this room can actually measure */
  measures: Measurement[]
  /** DevEUI in a connected LNS, when this sensor is bound to a real device */
  devEui?: string
}

/** Live values received from an LNS for one device, keyed by Measurement. */
export type LiveReadings = Map<string, Partial<Record<Measurement, number>>>

export interface RoomReading {
  measurement: Measurement
  value: number
  status: ReadingStatus
  /** how many sensors in the room contribute to this reading */
  sources: number
}

export interface RoomClimate {
  hasData: boolean
  sensorCount: number
  temperature: number | null
  humidity: number | null
  co2: number | null
  min24: number | null
  max24: number | null
  status: RoomStatus
  /** every measurement the room's sensors report, in display order */
  readings: RoomReading[]
}

const NO_DATA: RoomClimate = {
  hasData: false,
  sensorCount: 0,
  temperature: null,
  humidity: null,
  co2: null,
  min24: null,
  max24: null,
  status: 'nodata',
  readings: [],
}

/**
 * Averages one measurement across every sensor in the room that supports it.
 * A sensor bound to a live LNS device (`devEui`) uses its real last reading
 * for that measurement when one has arrived; otherwise every sensor falls
 * back to the deterministic simulation, exactly as before a connection exists.
 */
function average(sources: SensorSource[], measurement: Measurement, tick: number, liveReadings: LiveReadings) {
  const capable = sources.filter((s) => s.measures.includes(measurement))
  if (capable.length === 0) return null
  let sum = 0
  let count = 0
  for (const source of capable) {
    const live = source.devEui ? liveReadings.get(source.devEui)?.[measurement] : undefined
    const value = live ?? sensorReading(measurement, source.sensorId, tick)
    if (value !== null && value !== undefined) {
      sum += value
      count += 1
    }
  }
  return count === 0 ? null : { value: sum / count, sources: count }
}

const NO_LIVE_READINGS: LiveReadings = new Map()

/**
 * A room's environment comes ONLY from the sensors physically placed inside it.
 * With no temperature-capable model in the room, it reports "sem dados".
 */
export function roomClimateFromSensors(
  sources: SensorSource[],
  tick: number,
  liveReadings: LiveReadings = NO_LIVE_READINGS,
): RoomClimate {
  const temp = average(sources, 'temperatura', tick, liveReadings)
  if (!temp) {
    return { ...NO_DATA, sensorCount: sources.length }
  }

  const readings: RoomReading[] = []
  for (const measurement of primaryMeasurements) {
    const agg = average(sources, measurement, tick, liveReadings)
    if (!agg) continue
    const value = Math.round(agg.value * 100) / 100
    readings.push({ measurement, value, status: readingStatus(measurement, value), sources: agg.sources })
  }

  const temperature = temp.value
  const humidity = average(sources, 'humidade', tick, liveReadings)?.value ?? null
  const co2 = average(sources, 'co2', tick, liveReadings)?.value ?? null

  // 24 h band, derived from the same deterministic wave the live value rides on
  const min24 = temperature - 1.4
  const max24 = temperature + 1.6

  const status: RoomStatus =
    temperature >= 25.2 ? 'hot' : temperature >= 23.6 ? 'warm' : temperature <= 20.2 ? 'cool' : 'normal'

  return {
    hasData: true,
    sensorCount: sources.length,
    temperature: Math.round(temperature * 10) / 10,
    humidity: humidity === null ? null : Math.round(humidity * 10) / 10,
    co2: co2 === null ? null : Math.round(co2),
    min24: Math.round(min24 * 10) / 10,
    max24: Math.round(max24 * 10) / 10,
    status,
    readings,
  }
}

export const statusColors: Record<RoomStatus, string> = {
  cool: '#38bdf8',
  normal: '#4ade80',
  warm: '#f59e0b',
  hot: '#ef4444',
  nodata: '#5b6472',
}

/** Groups a floor's interior devices by which room contains them, resolving each one's catalog measures. */
export function sensorsByRoomFor(devices: DeviceItem[], rooms: Room[], activeFloor: number): Map<string, SensorSource[]> {
  const map = new Map<string, SensorSource[]>()
  for (const device of devices) {
    if (device.mount !== 'interior' || device.floor !== activeFloor) continue
    const model = resolveModel(device.modelId)
    const source: SensorSource = {
      sensorId: device.id,
      measures: model?.measures ?? (device.type === 'sensor' ? ['temperatura', 'humidade'] : []),
    }
    for (const room of rooms) {
      if (pointInRoom(room, device.x, device.z)) {
        const list = map.get(room.id) ?? []
        list.push(source)
        map.set(room.id, list)
        break
      }
    }
  }
  return map
}

export function pointInRoom(room: Room, x: number, z: number) {
  return (
    x >= room.x - room.width / 2 &&
    x <= room.x + room.width / 2 &&
    z >= room.z - room.depth / 2 &&
    z <= room.z + room.depth / 2
  )
}
