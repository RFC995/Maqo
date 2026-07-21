import type { DeviceType } from './types'

export type Measurement = 'temperatura' | 'humidade' | 'co2' | 'movimento' | 'porta' | 'video' | 'contagem'

export interface DeviceModel {
  id: string
  brand: string
  name: string
  type: DeviceType
  /** default coverage / sensing radius in metres */
  radius: number
  measures: Measurement[]
  description: string
}

/**
 * Device catalog. Milesight is the flagship brand for the client's LoRaWAN
 * stack; a couple of generic entries keep the picker useful for other gear.
 */
export const deviceCatalog: DeviceModel[] = [
  {
    id: 'ms-ug65',
    brand: 'Milesight',
    name: 'UG65 Gateway',
    type: 'gateway',
    radius: 95,
    measures: [],
    description: 'Gateway LoRaWAN semi-industrial 8 canais, PoE.',
  },
  {
    id: 'ms-ug67',
    brand: 'Milesight',
    name: 'UG67 Gateway',
    type: 'gateway',
    radius: 130,
    measures: [],
    description: 'Gateway exterior IP67, ideal para cobertura de campus.',
  },
  {
    id: 'ms-am103',
    brand: 'Milesight',
    name: 'AM103 Ambiente',
    type: 'sensor',
    radius: 16,
    measures: ['temperatura', 'humidade', 'co2'],
    description: 'Sensor 3-em-1: temperatura, humidade e CO2.',
  },
  {
    id: 'ms-am319',
    brand: 'Milesight',
    name: 'AM319 IAQ',
    type: 'sensor',
    radius: 18,
    measures: ['temperatura', 'humidade', 'co2', 'movimento'],
    description: 'Qualidade do ar 9-em-1 com PIR e luminosidade.',
  },
  {
    id: 'ms-em300',
    brand: 'Milesight',
    name: 'EM300-TH',
    type: 'sensor',
    radius: 14,
    measures: ['temperatura', 'humidade'],
    description: 'Sensor sem fios de temperatura e humidade.',
  },
  {
    id: 'ms-ws201',
    brand: 'Milesight',
    name: 'WS201 Ocupacao',
    type: 'sensor',
    radius: 10,
    measures: ['movimento', 'contagem'],
    description: 'Sensor de ocupacao/passagem para casas de banho e salas.',
  },
  {
    id: 'ms-em300-door',
    brand: 'Milesight',
    name: 'EM300 Porta/Janela',
    type: 'sensor',
    radius: 8,
    measures: ['porta'],
    description: 'Contacto magnetico de porta/janela.',
  },
  {
    id: 'ms-ws301',
    brand: 'Milesight',
    name: 'WS301 Porta',
    type: 'sensor',
    radius: 8,
    measures: ['porta'],
    description: 'Sensor magnetico de abertura sem fios.',
  },
  {
    id: 'ms-uc500',
    brand: 'Milesight',
    name: 'UC300 Repetidor',
    type: 'repeater',
    radius: 55,
    measures: [],
    description: 'Controlador/repetidor para estender o alcance LoRaWAN.',
  },
  {
    id: 'ms-sc541',
    brand: 'Milesight',
    name: 'SC541 Camara AI',
    type: 'camera',
    radius: 14,
    measures: ['video', 'contagem'],
    description: 'Camara LoRaWAN de contagem de pessoas.',
  },
  {
    id: 'generic-gateway',
    brand: 'Generico',
    name: 'Gateway generico',
    type: 'gateway',
    radius: 90,
    measures: [],
    description: 'Gateway LoRaWAN generico.',
  },
  {
    id: 'generic-sensor',
    brand: 'Generico',
    name: 'Sensor generico',
    type: 'sensor',
    radius: 15,
    measures: ['temperatura', 'humidade'],
    description: 'Sensor ambiente generico.',
  },
  {
    id: 'generic-camera',
    brand: 'Generico',
    name: 'Camara generica',
    type: 'camera',
    radius: 12,
    measures: ['video'],
    description: 'Camara de videovigilancia.',
  },
  {
    id: 'generic-repeater',
    brand: 'Generico',
    name: 'Repetidor generico',
    type: 'repeater',
    radius: 45,
    measures: [],
    description: 'Repetidor / antena de extensao.',
  },
]

export const catalogById: Record<string, DeviceModel> = Object.fromEntries(
  deviceCatalog.map((model) => [model.id, model]),
)

export function defaultModelFor(type: DeviceType): DeviceModel {
  const preferred: Record<DeviceType, string> = {
    gateway: 'ms-ug65',
    sensor: 'ms-am103',
    camera: 'ms-sc541',
    repeater: 'ms-uc500',
  }
  return catalogById[preferred[type]] ?? deviceCatalog.find((m) => m.type === type)!
}

export function modelsForType(type: DeviceType): DeviceModel[] {
  return deviceCatalog.filter((model) => model.type === type)
}

export function measuresTemperature(modelId: string | undefined): boolean {
  if (!modelId) return false
  const model = catalogById[modelId]
  return !!model && model.measures.includes('temperatura')
}
