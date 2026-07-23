export type BuildingStyle = 'office' | 'industrial' | 'residential'

export interface BuildingConfig {
  name: string
  style: BuildingStyle
  width: number
  depth: number
  floors: number
  floorHeight: number
}

/** One building on the site. `site` is its footprint centre, in world coordinates. */
export interface Building {
  id: string
  config: BuildingConfig
  site: { x: number; z: number }
}

export type DeviceType = 'gateway' | 'sensor' | 'camera' | 'repeater'

export type MountType = 'roof' | 'interior' | 'ground'

/** Pseudo floor selectors used by the UI in addition to real floor indices. */
export type FloorSelector = number | 'roof' | 'ground' | 'all'

export interface DeviceItem {
  id: string
  /** which building this device belongs to; x/z below are local to that building */
  buildingId: string
  type: DeviceType
  /** catalog model id, e.g. "ms-am103"; optional for projects created before catalog */
  modelId?: string
  name: string
  mount: MountType
  floor: number | null
  x: number
  z: number
  radius: number
  notes: string
}

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
  | 'sanitarios'
  | 'tecnica'
  | 'corredor'

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
  sanitarios: 'Sanitarios',
  tecnica: 'Sala Tecnica',
  corredor: 'Corredor',
}

export interface Room {
  id: string
  kind: RoomKind
  name: string
  /** centre, in local building coordinates */
  x: number
  z: number
  width: number
  depth: number
  /** which wall the door sits on: 1 = towards -z, -1 = towards +z */
  doorSide: 1 | -1
}

export interface Project {
  version: 2
  id: string
  buildings: Building[]
  devices: DeviceItem[]
  /**
   * Per-floor room layout, keyed by `${buildingId}:${floorIndex}`. A floor
   * absent from here is still auto-generated from the seed; it is copied in
   * here the moment the user edits it, so hand-made layouts survive a reseed.
   */
  rooms?: Record<string, Room[]>
  seed: number
  updatedAt: string
}

export const deviceLabels: Record<DeviceType, string> = {
  gateway: 'Gateway LoRaWAN',
  sensor: 'Sensor',
  camera: 'Camara',
  repeater: 'Repetidor / Antena',
}

export const deviceColors: Record<DeviceType, string> = {
  gateway: '#f97316',
  sensor: '#14b8a6',
  camera: '#3b82f6',
  repeater: '#a855f7',
}

export const mountLabels: Record<MountType, string> = {
  roof: 'Cobertura',
  interior: 'Interior',
  ground: 'Exterior / terreno',
}

export const deviceDefaultRadius: Record<DeviceType, number> = {
  gateway: 90,
  sensor: 18,
  camera: 12,
  repeater: 45,
}

export const buildingStyleLabels: Record<BuildingStyle, string> = {
  office: 'Escritorio (vidro)',
  industrial: 'Industrial / Armazem',
  residential: 'Residencial',
}
