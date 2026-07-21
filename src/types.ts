export type BuildingStyle = 'office' | 'industrial' | 'residential'

export interface BuildingConfig {
  name: string
  style: BuildingStyle
  width: number
  depth: number
  floors: number
  floorHeight: number
}

export type DeviceType = 'gateway' | 'sensor' | 'camera' | 'repeater'

export type MountType = 'roof' | 'interior' | 'ground'

/** Pseudo floor selectors used by the UI in addition to real floor indices. */
export type FloorSelector = number | 'roof' | 'ground' | 'all'

export interface DeviceItem {
  id: string
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

export interface Project {
  version: 1
  id: string
  building: BuildingConfig
  devices: DeviceItem[]
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
