import { deviceLabels, type BuildingConfig, type DeviceItem, type DeviceType } from './types'
import { defaultModelFor, type DeviceModel } from './catalog'

export interface PlanPreset {
  id: string
  name: string
  description: string
  generate: (building: BuildingConfig) => DeviceItem[]
}

type Draft = Omit<DeviceItem, 'id' | 'name'> & { nameSuffix?: string }

function materialize(drafts: Draft[]): DeviceItem[] {
  const counters = new Map<DeviceType, number>()
  return drafts.map((draft) => {
    const count = (counters.get(draft.type) ?? 0) + 1
    counters.set(draft.type, count)
    const suffix = draft.nameSuffix ? ` (${draft.nameSuffix})` : ''
    return {
      id: crypto.randomUUID(),
      name: `${deviceLabels[draft.type]} ${count}${suffix}`,
      type: draft.type,
      modelId: draft.modelId,
      mount: draft.mount,
      floor: draft.floor,
      x: draft.x,
      z: draft.z,
      radius: draft.radius,
      notes: draft.notes,
    }
  })
}

function draft(
  type: DeviceType,
  mount: DeviceItem['mount'],
  floor: number | null,
  x: number,
  z: number,
  nameSuffix?: string,
  radius?: number,
  model?: DeviceModel,
): Draft {
  const chosen = model ?? defaultModelFor(type)
  return {
    type,
    modelId: chosen.id,
    mount,
    floor,
    x,
    z,
    radius: radius ?? chosen.radius,
    notes: '',
    nameSuffix,
  }
}

export const planPresets: PlanPreset[] = [
  {
    id: 'escritorio',
    name: 'Escritorio inteligente',
    description: 'Gateway na cobertura, 2 sensores de ambiente por piso e camara na entrada.',
    generate(b) {
      const drafts: Draft[] = [draft('gateway', 'roof', null, 0, 0, 'cobertura')]
      for (let f = 0; f < b.floors; f += 1) {
        const label = f === 0 ? 'R/C' : `piso ${f}`
        drafts.push(draft('sensor', 'interior', f, -b.width / 4, -b.depth / 4, label))
        drafts.push(draft('sensor', 'interior', f, b.width / 4, b.depth / 4, label))
      }
      drafts.push(draft('camera', 'ground', null, 0, b.depth / 2 + 3.5, 'entrada'))
      return materialize(drafts)
    },
  },
  {
    id: 'industrial',
    name: 'Armazem industrial',
    description: 'Sensores nos 4 cantos de cada piso, camaras na entrada e tardoz, repetidor na cobertura.',
    generate(b) {
      const drafts: Draft[] = [draft('gateway', 'roof', null, 0, 0, 'cobertura')]
      const dx = b.width / 2 - 2.5
      const dz = b.depth / 2 - 2.5
      for (let f = 0; f < b.floors; f += 1) {
        const label = f === 0 ? 'R/C' : `piso ${f}`
        drafts.push(draft('sensor', 'interior', f, -dx, -dz, label))
        drafts.push(draft('sensor', 'interior', f, dx, -dz, label))
        drafts.push(draft('sensor', 'interior', f, -dx, dz, label))
        drafts.push(draft('sensor', 'interior', f, dx, dz, label))
      }
      drafts.push(draft('camera', 'ground', null, 0, b.depth / 2 + 3.5, 'entrada'))
      drafts.push(draft('camera', 'ground', null, 0, -b.depth / 2 - 3.5, 'tardoz'))
      drafts.push(draft('repeater', 'roof', null, b.width / 2 - 2, -b.depth / 2 + 2, 'cobertura'))
      return materialize(drafts)
    },
  },
  {
    id: 'cobertura-maxima',
    name: 'Cobertura maxima',
    description: 'Gateway central + 4 repetidores na cobertura e grelha de sensores 2x2 por piso.',
    generate(b) {
      const drafts: Draft[] = [draft('gateway', 'roof', null, 0, 0, 'central', 120)]
      const rx = b.width / 2 - 1.8
      const rz = b.depth / 2 - 1.8
      drafts.push(draft('repeater', 'roof', null, -rx, -rz))
      drafts.push(draft('repeater', 'roof', null, rx, -rz))
      drafts.push(draft('repeater', 'roof', null, -rx, rz))
      drafts.push(draft('repeater', 'roof', null, rx, rz))
      for (let f = 0; f < b.floors; f += 1) {
        const label = f === 0 ? 'R/C' : `piso ${f}`
        drafts.push(draft('sensor', 'interior', f, -b.width / 4, -b.depth / 4, label))
        drafts.push(draft('sensor', 'interior', f, b.width / 4, -b.depth / 4, label))
        drafts.push(draft('sensor', 'interior', f, -b.width / 4, b.depth / 4, label))
        drafts.push(draft('sensor', 'interior', f, b.width / 4, b.depth / 4, label))
      }
      drafts.push(draft('camera', 'ground', null, 0, b.depth / 2 + 3.5, 'entrada'))
      return materialize(drafts)
    },
  },
  {
    id: 'ambiental',
    name: 'Monitorizacao ambiental',
    description: 'Sensor central por piso, estacao meteorologica na cobertura e gateway dedicado.',
    generate(b) {
      const drafts: Draft[] = [draft('gateway', 'roof', null, -b.width / 4, 0, 'cobertura')]
      for (let f = 0; f < b.floors; f += 1) {
        const label = f === 0 ? 'R/C' : `piso ${f}`
        drafts.push(draft('sensor', 'interior', f, 0, -b.depth / 4, label))
      }
      drafts.push(draft('sensor', 'roof', null, b.width / 4, 0, 'estacao met.', 25))
      return materialize(drafts)
    },
  },
]
