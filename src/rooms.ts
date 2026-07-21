import type { BuildingConfig } from './types'
import { createRng } from './buildingGenerator'

export type RoomKind =
  | 'rececao'
  | 'refeitorio'
  | 'openspace'
  | 'reuniao'
  | 'escritorio'
  | 'direcao'
  | 'armazem'
  | 'arquivo'
  | 'copa'

export interface Room {
  id: string
  kind: RoomKind
  name: string
  /** center, local building coords */
  x: number
  z: number
  width: number
  depth: number
  /** which side the door faces: +1 door on -z wall (towards corridor at z>room), -1 door on +z wall */
  doorSide: 1 | -1
}

export const roomKindLabels: Record<RoomKind, string> = {
  rececao: 'Rececao',
  refeitorio: 'Refeitorio',
  openspace: 'Open Space',
  reuniao: 'Sala de Reuniao',
  escritorio: 'Escritorio',
  direcao: 'Direcao',
  armazem: 'Armazem',
  arquivo: 'Arquivo',
  copa: 'Copa',
}

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

export type RoomStatus = 'cool' | 'normal' | 'warm' | 'hot' | 'nodata'

export interface SensorSource {
  sensorId: string
  measuresTemp: boolean
  measuresHumidity: boolean
  measuresCo2: boolean
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
}

function hash01(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
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
}

/** Simulated live reading for one sensor, deterministic per id + tick. */
function sensorTemperature(sensorId: string, tick: number) {
  const h = hash01(sensorId)
  const base = 21.2 + h * 3.4
  const wave = Math.sin(tick * 0.35 + h * 12.6) * 0.7 + Math.sin(tick * 0.11 + h * 5.1) * 0.4
  return base + wave
}

/**
 * A room's environment comes ONLY from the sensors placed inside it. With no
 * temperature-capable sensor the room reports "sem dados".
 */
export function roomClimateFromSensors(sources: SensorSource[], tick: number): RoomClimate {
  const tempSources = sources.filter((s) => s.measuresTemp)
  if (tempSources.length === 0) {
    return { ...NO_DATA, sensorCount: sources.length }
  }

  let tempSum = 0
  let minSum = 0
  let maxSum = 0
  for (const source of tempSources) {
    const h = hash01(source.sensorId)
    const t = sensorTemperature(source.sensorId, tick)
    tempSum += t
    minSum += 21.2 + h * 3.4 - 1.1 - h * 0.9
    maxSum += 21.2 + h * 3.4 + 1.2 + h * 0.8
  }
  const temperature = tempSum / tempSources.length
  const min24 = minSum / tempSources.length
  const max24 = maxSum / tempSources.length

  const humSources = sources.filter((s) => s.measuresHumidity)
  let humidity: number | null = null
  if (humSources.length > 0) {
    let humSum = 0
    for (const source of humSources) {
      const h = hash01(source.sensorId + 'h')
      humSum += 40 + h * 18 + Math.sin(tick * 0.22 + h * 8.2) * 4
    }
    humidity = humSum / humSources.length
  }

  const co2Sources = sources.filter((s) => s.measuresCo2)
  let co2: number | null = null
  if (co2Sources.length > 0) {
    let co2Sum = 0
    for (const source of co2Sources) {
      const h = hash01(source.sensorId + 'c')
      co2Sum += 480 + h * 320 + Math.sin(tick * 0.18 + h * 3.3) * 60
    }
    co2 = co2Sum / co2Sources.length
  }

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
  }
}

export const statusColors: Record<RoomStatus, string> = {
  cool: '#38bdf8',
  normal: '#4ade80',
  warm: '#f59e0b',
  hot: '#ef4444',
  nodata: '#5b6472',
}

export function pointInRoom(room: Room, x: number, z: number) {
  return (
    x >= room.x - room.width / 2 &&
    x <= room.x + room.width / 2 &&
    z >= room.z - room.depth / 2 &&
    z <= room.z + room.depth / 2
  )
}
