import type { Building, BuildingConfig, DeviceItem, Project, Room } from './types'
import { resolveModel, type DeviceModel } from './catalog'
import { resolveRooms, pointInRoom } from './rooms'
import { analyseLink, summariseNetwork, type LinkAnalysis, type Propagation } from './rf'

/**
 * Turns a project into the tables a proposal needs. Pure data — the report
 * component only formats what comes out of here.
 */

export interface LinhaMaterial {
  model: DeviceModel
  quantidade: number
  /** where the units of this model ended up, for the notes column */
  locais: string[]
}

/** Bill of materials, grouped by model and ordered gateways first. */
export function listaDeMaterial(devices: DeviceItem[]): LinhaMaterial[] {
  const porModelo = new Map<string, LinhaMaterial>()

  for (const device of devices) {
    const model = resolveModel(device.modelId)
    if (!model) continue
    const linha = porModelo.get(model.id) ?? { model, quantidade: 0, locais: [] }
    linha.quantidade += 1
    linha.locais.push(localDoDispositivo(device))
    porModelo.set(model.id, linha)
  }

  const ordem: Record<string, number> = { gateway: 0, repeater: 1, sensor: 2, camera: 3 }
  return [...porModelo.values()].sort(
    (a, b) => ordem[a.model.type] - ordem[b.model.type] || b.quantidade - a.quantidade,
  )
}

export function localDoDispositivo(device: DeviceItem): string {
  if (device.mount === 'roof') return 'Cobertura'
  if (device.mount === 'ground') return 'Exterior'
  return device.floor === 0 ? 'R/C' : `Piso ${device.floor}`
}

export interface LinhaPiso {
  piso: string
  devices: { device: DeviceItem; model: DeviceModel | undefined; sala: string }[]
}

/** Devices grouped by floor, each tagged with the room it falls inside. Scoped to one building. */
export function dispositivosPorPiso(project: Project, building: Building): LinhaPiso[] {
  const devices = project.devices.filter((d) => d.buildingId === building.id)
  const grupos: LinhaPiso[] = []

  for (let piso = 0; piso < building.config.floors; piso += 1) {
    const rooms = resolveRooms(project, building, piso)
    const doPiso = devices.filter((d) => d.mount === 'interior' && d.floor === piso)
    if (doPiso.length === 0) continue
    grupos.push({
      piso: piso === 0 ? 'Res-do-chao' : `Piso ${piso}`,
      devices: doPiso.map((device) => ({
        device,
        model: resolveModel(device.modelId),
        sala: salaDoDispositivo(device, rooms),
      })),
    })
  }

  for (const [mount, rotulo] of [
    ['roof', 'Cobertura'],
    ['ground', 'Exterior'],
  ] as const) {
    const lista = devices.filter((d) => d.mount === mount)
    if (lista.length === 0) continue
    grupos.push({
      piso: rotulo,
      devices: lista.map((device) => ({ device, model: resolveModel(device.modelId), sala: '—' })),
    })
  }

  return grupos
}

function salaDoDispositivo(device: DeviceItem, rooms: Room[]): string {
  const sala = rooms.find((r) => pointInRoom(r, device.x, device.z))
  return sala?.name ?? 'Corredor / circulacao'
}

export interface LinhaLigacao {
  device: DeviceItem
  model: DeviceModel | undefined
  local: string
  link: LinkAnalysis
}

/** Link budget per end device, worst links first — that is what gets reviewed. Scoped to one building: a gateway never covers a device in another building. */
export function orcamentoDeLigacoes(
  project: Project,
  building: Building,
  propagation: Propagation,
): LinhaLigacao[] {
  const devices = project.devices.filter((d) => d.buildingId === building.id)
  const gateways = devices.filter((d) => d.type === 'gateway')
  return devices
    .filter((d) => d.type !== 'gateway')
    .map((device) => ({
      device,
      model: resolveModel(device.modelId),
      local: localDoDispositivo(device),
      link: analyseLink(device, gateways, building.config, propagation),
    }))
    .sort((a, b) => a.link.marginDb - b.link.marginDb)
}

export interface ResumoRelatorio {
  gateways: number
  nos: number
  semCobertura: number
  marginais: number
  cargaCanal: number
  foraDoCicloDeServico: number
  capacidade: number
}

export function resumoDaRede(
  project: Project,
  building: Building,
  propagation: Propagation,
  uplinkMinutes: number,
): ResumoRelatorio {
  const devices = project.devices.filter((d) => d.buildingId === building.id)
  const s = summariseNetwork(devices, building.config, propagation, uplinkMinutes)
  return {
    gateways: s.gateways,
    nos: s.endDevices,
    semCobertura: s.uncovered,
    marginais: s.marginal,
    cargaCanal: s.channelLoad,
    foraDoCicloDeServico: s.overDutyCycle,
    capacidade: s.capacity,
  }
}

export function areaConstruida(building: BuildingConfig): number {
  return building.width * building.depth * building.floors
}

export function dataPortuguesa(iso = new Date().toISOString()): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}
