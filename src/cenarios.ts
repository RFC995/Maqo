import type { Cenario, DeviceItem, FloorSelector, Project, BuildingConfig } from './types'
import { createDefaultProject } from './storage'
import { defaultModelFor, resolveModel } from './catalog'
import { gerarParque } from './parkingGenerator'

/**
 * Everything a scenario needs beyond its 3D world: the card copy shown at
 * startup, the vocabulary the UI speaks in that mode, sensible defaults, and a
 * seeded starter project. Kept free of three.js (like `qualidade.ts`) so it can
 * be imported by the dashboard chrome without dragging the 3D bundle in.
 */

type HoraDoDia = 'day' | 'dusk' | 'night'

export interface CenarioMeta {
  label: string
  tagline: string
  blurb: string
  /** three or four "o que inclui" bullets for the onboarding card */
  includes: string[]
  /** hex accent used on the card and (later) chips */
  accent: string
  /** propagation preset key (see rf.ts) */
  propagacao: string
  hora: HoraDoDia
  /** which floor tab to open on after choosing */
  aberturaFloor: FloorSelector
  /** false when the scenario has no multi-floor navigation (e.g. a flat car park) */
  pisos: boolean
  /** words that replace the building vocabulary in the UI */
  vocabulario: { estrutura: string; nivel: string; terreno: string }
}

export const ordemCenarios: Cenario[] = ['parking', 'edificios', 'agricultura', 'cidade', 'livre']

export const cenarioMeta: Record<Cenario, CenarioMeta> = {
  parking: {
    label: 'Smart Parking',
    tagline: 'Parque de estacionamento sensorizado',
    blurb:
      'Um parque à superfície com lugares marcados, deteção de ocupação por lugar e gateway em mastro. Vê os lugares livres e ocupados em tempo real.',
    includes: ['Lugares com sensor de ocupação', 'Gateway exterior IP67 em mastro', 'Mapa de lugares livres/ocupados'],
    accent: '#38bdf8',
    propagacao: 'industrial',
    hora: 'day',
    aberturaFloor: 'ground',
    pisos: false,
    vocabulario: { estrutura: 'Parque', nivel: 'Nível', terreno: 'Parque' },
  },
  edificios: {
    label: 'Edifícios',
    tagline: 'Edifício de serviços, pisos e salas',
    blurb:
      'O modo completo: edifício 3D com pisos, salas editáveis, qualidade do ar por divisão e planeamento de rede LoRaWAN. Ideal para escritórios, indústria e residencial.',
    includes: ['Pisos e salas editáveis', 'Qualidade do ar por divisão', 'Planos de instalação prontos'],
    accent: '#6d8bff',
    propagacao: 'office',
    hora: 'day',
    aberturaFloor: 'all',
    pisos: true,
    vocabulario: { estrutura: 'Edifício', nivel: 'Piso', terreno: 'Terreno' },
  },
  agricultura: {
    label: 'Smart Agriculture',
    tagline: 'Campo, estação meteo e sensores de solo',
    blurb:
      'Monitorização de uma exploração agrícola: estação meteorológica, sensores espalhados pelo terreno e gateway solar autónomo, sem alimentação de rede.',
    includes: ['Estação meteorológica', 'Sensores de campo em rede', 'Gateway solar autónomo'],
    accent: '#4ade80',
    propagacao: 'industrial',
    hora: 'day',
    aberturaFloor: 'ground',
    pisos: false,
    vocabulario: { estrutura: 'Exploração', nivel: 'Zona', terreno: 'Terreno' },
  },
  cidade: {
    label: 'Cidade / espaço público',
    tagline: 'Rua e mobiliário urbano inteligente',
    blurb:
      'Espaço público sensorizado: contagem de pessoas, qualidade do ar exterior, ruído e nível de enchimento de contentores, tudo sobre uma rede pública.',
    includes: ['Contagem de pessoas', 'Qualidade do ar e ruído', 'Nível de contentores de resíduos'],
    accent: '#f59e0b',
    propagacao: 'office',
    hora: 'dusk',
    aberturaFloor: 'all',
    pisos: true,
    vocabulario: { estrutura: 'Zona', nivel: 'Piso', terreno: 'Espaço público' },
  },
  livre: {
    label: 'Modo Livre',
    tagline: 'Tela em branco — monta tu',
    blurb:
      'Uma estrutura vazia, sem dispositivos. Ferramenta livre: acrescenta o que quiseres, do zero, sem template a condicionar-te.',
    includes: ['Sem dispositivos pré-colocados', 'Todo o catálogo disponível', 'Total liberdade de planeamento'],
    accent: '#a78bfa',
    propagacao: 'office',
    hora: 'day',
    aberturaFloor: 'all',
    pisos: true,
    vocabulario: { estrutura: 'Estrutura', nivel: 'Piso', terreno: 'Terreno' },
  },
}

type Rascunho = Omit<DeviceItem, 'buildingId'>

function dispositivo(
  modelId: string,
  mount: DeviceItem['mount'],
  x: number,
  z: number,
  floor: number | null,
  nome?: string,
): Rascunho {
  const model = resolveModel(modelId) ?? defaultModelFor('sensor')
  return {
    id: crypto.randomUUID(),
    type: model.type,
    modelId: model.id,
    name: nome ?? model.name,
    mount,
    floor,
    x,
    z,
    radius: model.radius,
    notes: '',
  }
}

function montarProjeto(scenario: Cenario, config: BuildingConfig, seed: number, rascunhos: Rascunho[]): Project {
  const buildingId = crypto.randomUUID()
  return {
    version: 2,
    id: crypto.randomUUID(),
    scenario,
    buildings: [{ id: buildingId, config, site: { x: 0, z: 0 } }],
    devices: rascunhos.map((d) => ({ ...d, buildingId })),
    seed,
    updatedAt: new Date().toISOString(),
  }
}

function projetoParking(): Project {
  const config: BuildingConfig = {
    name: 'Parque P1',
    style: 'industrial',
    width: 46,
    depth: 34,
    floors: 1,
    floorHeight: 3,
  }
  const seed = 3
  const layout = gerarParque(config, seed)

  const rascunhos: Rascunho[] = [
    dispositivo('ms-ug67', 'ground', -config.width / 2 + 3, config.depth / 2 - 3, null, 'Gateway do parque'),
  ]

  // one occupancy sensor on a spread of bays; the rest of the lot stays seed-driven
  const passo = Math.max(1, Math.floor(layout.bays.length / 8))
  let n = 1
  for (let i = 0; i < layout.bays.length; i += passo) {
    const bay = layout.bays[i]
    rascunhos.push(dispositivo('ms-em400-tld', 'ground', bay.x, bay.z, null, `Sensor lugar ${n}`))
    n += 1
    if (n > 8) break
  }

  return montarProjeto('parking', config, seed, rascunhos)
}

function projetoAgricultura(): Project {
  const config: BuildingConfig = {
    name: 'Quinta Solar',
    style: 'industrial',
    width: 64,
    depth: 44,
    floors: 1,
    floorHeight: 3.2,
  }
  const w = config.width
  const d = config.depth
  const rascunhos: Rascunho[] = [
    dispositivo('ms-sg50', 'ground', w / 2 - 4, d / 2 - 3, null, 'Gateway solar'),
    dispositivo('ms-wts506', 'ground', 0, -d / 2 + 4, null, 'Estação meteo'),
    dispositivo('ms-em500-co2', 'ground', w / 2 - 11, d / 2 - 5, null, 'CO2 estufa'),
  ]
  // soil probes across the two field beds (left/right of the central track)
  const grelha: [number, number][] = []
  for (const gx of [-16, 16]) for (const gz of [-14, -3, 4]) grelha.push([gx, gz])
  grelha.forEach(([x, z], i) => {
    rascunhos.push(dispositivo('ms-em500-pt100', 'ground', x, z, null, `Sonda de campo ${i + 1}`))
  })
  return montarProjeto('agricultura', config, 5, rascunhos)
}

function projetoCidade(): Project {
  const config: BuildingConfig = {
    name: 'Praça Central',
    style: 'office',
    width: 24,
    depth: 16,
    floors: 4,
    floorHeight: 3.4,
  }
  const rascunhos: Rascunho[] = [
    dispositivo('ms-ug67', 'roof', 0, 0, null, 'Gateway público'),
    dispositivo('ms-vs133', 'interior', 0, config.depth / 2 - 1.2, 0, 'Contagem entrada'),
    dispositivo('ms-am319', 'ground', config.width / 2 + 4, 0, null, 'Qualidade do ar'),
    dispositivo('ms-ws302', 'ground', -config.width / 2 - 4, 2, null, 'Ruído da praça'),
    dispositivo('ms-ws201', 'ground', config.width / 2 + 6, -8, null, 'Contentor 1'),
    dispositivo('ms-ws201', 'ground', -config.width / 2 - 6, -10, null, 'Contentor 2'),
  ]
  return montarProjeto('cidade', config, 7, rascunhos)
}

function projetoLivre(): Project {
  const config: BuildingConfig = {
    name: 'Projeto livre',
    style: 'office',
    width: 20,
    depth: 14,
    floors: 2,
    floorHeight: 3.4,
  }
  return montarProjeto('livre', config, 1, [])
}

/** Seeds a fresh project appropriate for the chosen scenario. */
export function criarProjetoDeCenario(cenario: Cenario): Project {
  switch (cenario) {
    case 'parking':
      return projetoParking()
    case 'agricultura':
      return projetoAgricultura()
    case 'cidade':
      return projetoCidade()
    case 'livre':
      return projetoLivre()
    case 'edificios':
    default:
      return createDefaultProject()
  }
}
