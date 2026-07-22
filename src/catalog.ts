import type { DeviceType } from './types'

/**
 * Real Milesight IoT product catalog (EU868 line-up).
 *
 * Every model number, measurement set, battery pack, IP rating, mounting
 * option, operating range and detection footprint below comes from the
 * manufacturer's public product / comparison sheets. Radio figures that
 * Milesight does not publish per model (TX power, RX sensitivity) use the
 * EU868 regulatory limit and the SX1302 chipset figures instead — see rf.ts,
 * where they are applied — so nothing here is invented.
 */

export type Measurement =
  | 'temperatura'
  | 'humidade'
  | 'co2'
  | 'tvoc'
  | 'pm25'
  | 'pm10'
  | 'hcho'
  | 'o3'
  | 'pressao'
  | 'luz'
  | 'movimento'
  | 'ocupacao'
  | 'contagem'
  | 'porta'
  | 'fuga'
  | 'distancia'
  | 'nivel'
  | 'ruido'
  | 'odor'
  | 'corrente'
  | 'consumo'
  | 'inclinacao'
  | 'solo'
  | 'meteo'
  | 'gps'
  | 'botao'
  | 'valvula'
  | 'modbus'
  | 'io'

export const measurementLabels: Record<Measurement, string> = {
  temperatura: 'Temperatura',
  humidade: 'Humidade',
  co2: 'CO2',
  tvoc: 'TVOC',
  pm25: 'PM2.5',
  pm10: 'PM10',
  hcho: 'HCHO',
  o3: 'Ozono',
  pressao: 'Pressao atm.',
  luz: 'Luminosidade',
  movimento: 'Movimento (PIR)',
  ocupacao: 'Ocupacao',
  contagem: 'Contagem de pessoas',
  porta: 'Porta / janela',
  fuga: 'Fuga de agua',
  distancia: 'Distancia',
  nivel: 'Nivel de enchimento',
  ruido: 'Ruido',
  odor: 'Odor / vapor',
  corrente: 'Corrente eletrica',
  consumo: 'Consumo de energia',
  inclinacao: 'Inclinacao',
  solo: 'Solo (hum./cond.)',
  meteo: 'Meteorologia',
  gps: 'Localizacao GPS',
  botao: 'Botao / cena',
  valvula: 'Valvula solenoide',
  modbus: 'Modbus RS485',
  io: 'Entradas / saidas',
}

export const measurementUnits: Partial<Record<Measurement, string>> = {
  temperatura: '°C',
  humidade: '%',
  co2: 'ppm',
  tvoc: 'IAQ',
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  hcho: 'mg/m³',
  o3: 'ppm',
  pressao: 'hPa',
  luz: 'lux',
  ruido: 'dB',
  distancia: 'cm',
  nivel: '%',
  corrente: 'A',
  consumo: 'kWh',
}

export type PowerSource = 'bateria' | 'poe' | 'dc' | 'usb' | 'solar'

export const powerLabels: Record<PowerSource, string> = {
  bateria: 'Bateria',
  poe: 'PoE',
  dc: 'DC',
  usb: 'USB',
  solar: 'Solar',
}

export type CatalogCategory =
  | 'gateway'
  | 'iaq'
  | 'ambiente'
  | 'ocupacao'
  | 'contagem'
  | 'agua'
  | 'nivel'
  | 'energia'
  | 'controlo'
  | 'exterior'
  | 'generico'

export const categoryLabels: Record<CatalogCategory, string> = {
  gateway: 'Gateways LoRaWAN',
  iaq: 'Qualidade do ar (serie AM)',
  ambiente: 'Ambiente / temperatura',
  ocupacao: 'Ocupacao e presenca',
  contagem: 'Contagem de pessoas',
  agua: 'Deteccao de fugas',
  nivel: 'Distancia e nivel',
  energia: 'Energia e clima',
  controlo: 'Controlo e I/O',
  exterior: 'Exterior e industria',
  generico: 'Equipamento generico',
}

export interface BatterySpec {
  cells: number
  mah: number
  chemistry: string
  /** manufacturer-stated typical lifetime range, in years */
  years: [number, number]
}

export interface DetectionSpec {
  /** footprint at the recommended mounting height, in metres */
  areaW?: number
  areaD?: number
  /** straight-line detection range, in metres */
  rangeM?: number
  fovH?: number
  fovV?: number
  /** recommended mounting height range, in metres */
  mountHeight?: [number, number]
  accuracy?: string
}

export interface RadioSpec {
  class: 'A' | 'B' | 'C'
  /** antenna gain of the end device, dBi */
  antennaDbi: number
}

export interface GatewaySpec {
  channels: number
  duplex: 'half' | 'half/full'
  maxNodes: number
  antennaDbi: number
  /** where the unit is designed to live — drives which propagation model applies */
  environment: 'indoor' | 'outdoor'
  chipset?: string
}

export interface DeviceModel {
  id: string
  brand: string
  /** exact manufacturer model number, e.g. "AM319" */
  model: string
  /** short display name used across the UI */
  name: string
  type: DeviceType
  category: CatalogCategory
  measures: Measurement[]
  power: PowerSource[]
  battery?: BatterySpec
  /** ingress protection rating as printed on the datasheet */
  ip: string
  mounting: string[]
  /** operating temperature range, degrees C */
  tempRange: [number, number]
  radio?: RadioSpec
  gateway?: GatewaySpec
  detection?: DetectionSpec
  /**
   * Default planning radius in metres. For gateways this is a conservative
   * indoor/outdoor starting point; the real per-SF ranges are computed in
   * rf.ts from the link budget and the building being planned.
   */
  radius: number
  description: string
}

const MILESIGHT = 'Milesight'

/** 2 x 2700 mAh ER14505 Li-SOCl2, the pack used across most AM/VS units. */
function pack(cells: number, mah: number, chemistry: string, years: [number, number]): BatterySpec {
  return { cells, mah, chemistry, years }
}

export const deviceCatalog: DeviceModel[] = [
  // ---------------------------------------------------------------- gateways
  {
    id: 'ms-ug65',
    brand: MILESIGHT,
    model: 'UG65',
    name: 'UG65 Gateway interior',
    type: 'gateway',
    category: 'gateway',
    measures: [],
    power: ['poe', 'dc'],
    ip: 'IP65',
    mounting: ['Secretaria', 'Parede', 'Poste'],
    tempRange: [-40, 70],
    gateway: { channels: 8, duplex: 'half/full', maxNodes: 2000, antennaDbi: 3, environment: 'indoor', chipset: 'SX1302' },
    radius: 90,
    description: 'Gateway interior 8 canais com servidor de rede embebido, antena interna ou externa. PoE ou 9-24 V DC.',
  },
  {
    id: 'ms-ug67',
    brand: MILESIGHT,
    model: 'UG67',
    name: 'UG67 Gateway exterior',
    type: 'gateway',
    category: 'gateway',
    measures: [],
    power: ['poe', 'dc'],
    ip: 'IP67',
    mounting: ['Parede', 'Poste'],
    tempRange: [-40, 70],
    gateway: { channels: 8, duplex: 'half/full', maxNodes: 2000, antennaDbi: 8, environment: 'outdoor', chipset: 'SX1302' },
    radius: 200,
    description: 'Gateway exterior IP67 com 2 antenas externas. Alimentacao PoE ou 12 V por conector M12.',
  },
  {
    id: 'ms-ug56',
    brand: MILESIGHT,
    model: 'UG56',
    name: 'UG56 Gateway industrial',
    type: 'gateway',
    category: 'gateway',
    measures: [],
    power: ['poe', 'dc'],
    ip: 'IP30',
    mounting: ['Secretaria', 'Parede', 'Teto'],
    tempRange: [-20, 60],
    gateway: { channels: 8, duplex: 'half', maxNodes: 2000, antennaDbi: 3, environment: 'indoor', chipset: 'SX1302' },
    radius: 95,
    description: 'Gateway industrial SX1302 para mais de 2000 nos. Cerca de 2 km em zona urbana e 15 km em zona rural.',
  },
  {
    id: 'ms-ug63',
    brand: MILESIGHT,
    model: 'UG63',
    name: 'UG63 Mini Gateway',
    type: 'gateway',
    category: 'gateway',
    measures: [],
    power: ['poe', 'usb'],
    ip: 'IP30',
    mounting: ['Secretaria', 'Parede', 'Teto'],
    tempRange: [-20, 50],
    gateway: { channels: 8, duplex: 'half', maxNodes: 2000, antennaDbi: 2, environment: 'indoor', chipset: 'SX1302' },
    radius: 70,
    description: 'Gateway compacto com backhaul Ethernet ou 4G LTE. Alimentado por PoE ou USB-C 5 V / 2 A.',
  },
  {
    id: 'ms-sg50',
    brand: MILESIGHT,
    model: 'SG50',
    name: 'SG50 Gateway solar',
    type: 'gateway',
    category: 'gateway',
    measures: [],
    power: ['solar', 'dc'],
    battery: pack(1, 25000, 'Baterias de reserva recarregaveis', [4, 4]),
    ip: 'IP67',
    mounting: ['Parede', 'Poste'],
    tempRange: [-20, 60],
    gateway: { channels: 8, duplex: 'half', maxNodes: 2000, antennaDbi: 8, environment: 'outdoor' },
    radius: 180,
    description: 'Gateway exterior de baixissimo consumo com painel solar e 25000 mAh de reserva: ate 4 dias sem sol.',
  },

  // ------------------------------------------------------- AM series (IAQ)
  {
    id: 'ms-am102',
    brand: MILESIGHT,
    model: 'AM102',
    name: 'AM102 2-em-1',
    type: 'sensor',
    category: 'iaq',
    measures: ['temperatura', 'humidade'],
    power: ['bateria'],
    battery: pack(2, 2700, 'Li-SOCl2', [7, 9]),
    ip: 'IP30',
    mounting: ['Parafuso de parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 12,
    description: 'Sensor de conforto temperatura + humidade. Ate 9 anos de autonomia com 2 pilhas Li-SOCl2.',
  },
  {
    id: 'ms-am103',
    brand: MILESIGHT,
    model: 'AM103',
    name: 'AM103 3-em-1',
    type: 'sensor',
    category: 'iaq',
    measures: ['temperatura', 'humidade', 'co2'],
    power: ['bateria'],
    battery: pack(2, 2700, 'Li-SOCl2', [3, 4]),
    ip: 'IP30',
    mounting: ['Parafuso de parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 14,
    description: 'Sensor 3-em-1 com CO2 NDIR e ecra e-ink. A escolha base para salas de reuniao e escritorios.',
  },
  {
    id: 'ms-am104',
    brand: MILESIGHT,
    model: 'AM104',
    name: 'AM104 4-em-1',
    type: 'sensor',
    category: 'iaq',
    measures: ['temperatura', 'humidade', 'luz', 'movimento'],
    power: ['bateria'],
    battery: pack(4, 2700, 'Li-SOCl2', [6, 7]),
    ip: 'IP30',
    mounting: ['Parafuso de parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 14,
    description: 'Temperatura, humidade, luminosidade e PIR — util para ligar ocupacao a conforto sem CO2.',
  },
  {
    id: 'ms-am307',
    brand: MILESIGHT,
    model: 'AM307',
    name: 'AM307 7-em-1',
    type: 'sensor',
    category: 'iaq',
    measures: ['temperatura', 'humidade', 'co2', 'luz', 'movimento', 'tvoc', 'pressao'],
    power: ['bateria', 'usb'],
    battery: pack(4, 2700, 'Li-SOCl2', [3, 4]),
    ip: 'IP30',
    mounting: ['Parafuso de parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 16,
    description: 'IAQ 7-em-1 com TVOC e pressao atmosferica. Ecra e-ink, bateria ou USB 5 V.',
  },
  {
    id: 'ms-am308',
    brand: MILESIGHT,
    model: 'AM308',
    name: 'AM308 8-em-1',
    type: 'sensor',
    category: 'iaq',
    measures: ['temperatura', 'humidade', 'co2', 'luz', 'movimento', 'tvoc', 'pressao', 'pm25', 'pm10'],
    power: ['bateria', 'usb'],
    battery: pack(4, 2700, 'Li-SOCl2', [1, 1.5]),
    ip: 'IP30',
    mounting: ['Parafuso de parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 16,
    description: 'Acrescenta particulas PM2.5 / PM10 ao AM307. Autonomia curta a bateria: preferir USB em uso continuo.',
  },
  {
    id: 'ms-am319',
    brand: MILESIGHT,
    model: 'AM319',
    name: 'AM319 IAQ 9-em-1',
    type: 'sensor',
    category: 'iaq',
    measures: ['temperatura', 'humidade', 'co2', 'luz', 'movimento', 'tvoc', 'pressao', 'pm25', 'pm10', 'hcho', 'o3'],
    power: ['usb'],
    ip: 'IP30',
    mounting: ['Parafuso de parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 18,
    description: 'Topo de gama IAQ com ecra e-ink 4.2", HCHO e O3 opcionais e certificacao Works with WELL. So USB 5 V.',
  },

  // ------------------------------------------------------- EM / TS ambiente
  {
    id: 'ms-em300-th',
    brand: MILESIGHT,
    model: 'EM300-TH',
    name: 'EM300-TH Temp/Hum',
    type: 'sensor',
    category: 'ambiente',
    measures: ['temperatura', 'humidade'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 12,
    description: 'Temperatura e humidade IP67, 10 anos de autonomia com reporte a cada 10 minutos. Para camaras frigorificas e tecnicas.',
  },
  {
    id: 'ms-em320-th',
    brand: MILESIGHT,
    model: 'EM320-TH',
    name: 'EM320-TH Temp/Hum',
    type: 'sensor',
    category: 'ambiente',
    measures: ['temperatura', 'humidade'],
    power: ['bateria'],
    battery: pack(2, 2700, 'ER14505 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Parede', 'Suporte magnetico'],
    tempRange: [-30, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 12,
    description: 'Versao compacta do EM300-TH com montagem magnetica. Mais de 10 anos a 10 min de intervalo.',
  },
  {
    id: 'ms-ws203',
    brand: MILESIGHT,
    model: 'WS203',
    name: 'WS203 Movimento + T/H',
    type: 'sensor',
    category: 'ambiente',
    measures: ['movimento', 'temperatura', 'humidade'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [4, 5]),
    ip: 'IP30',
    mounting: ['Fita 3M', 'Parafuso de parede'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { accuracy: 'ate 90%' },
    radius: 8,
    description: 'PIR combinado com temperatura e humidade: conforto e ocupacao num so ponto de instalacao.',
  },
  {
    id: 'ms-ws202',
    brand: MILESIGHT,
    model: 'WS202',
    name: 'WS202 PIR + Luz',
    type: 'sensor',
    category: 'ocupacao',
    measures: ['movimento', 'luz'],
    power: ['bateria'],
    battery: pack(1, 1650, 'ER14335 Li-SOCl2', [3, 4]),
    ip: 'IP30',
    mounting: ['Fita 3M', 'Parafuso de parede'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { accuracy: 'ate 90%' },
    radius: 7,
    description: 'Deteccao de movimento e de luz. Reporta o estado claro/escuro, nao o valor exato de lux.',
  },
  {
    id: 'ms-ts201',
    brand: MILESIGHT,
    model: 'TS201',
    name: 'TS201 Sonda temperatura',
    type: 'sensor',
    category: 'ambiente',
    measures: ['temperatura'],
    power: ['bateria'],
    battery: pack(1, 2700, 'ER14505 Li-SOCl2', [3, 3]),
    ip: 'IP67',
    mounting: ['Parafuso', 'Suporte magnetico'],
    tempRange: [-40, 125],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 10,
    description: 'Sonda DS18B20 de -40 a +125 C para quadros, condutas e equipamento. Cerca de 3 anos a 10 min.',
  },
  {
    id: 'ms-ws302',
    brand: MILESIGHT,
    model: 'WS302',
    name: 'WS302 Nivel de ruido',
    type: 'sensor',
    category: 'ambiente',
    measures: ['ruido'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [3, 4]),
    ip: 'IP30',
    mounting: ['Parede', 'Teto'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 10,
    description: 'Sonometro LoRaWAN para open spaces e zonas de atendimento.',
  },
  {
    id: 'ms-gs301',
    brand: MILESIGHT,
    model: 'GS301',
    name: 'GS301 Odor sanitarios',
    type: 'sensor',
    category: 'ambiente',
    measures: ['odor', 'temperatura', 'humidade'],
    power: ['bateria'],
    battery: pack(2, 2700, 'ER14505 Li-SOCl2', [2, 3]),
    ip: 'IP30',
    mounting: ['Parede', 'Teto'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 8,
    description: 'Detetor de odor para instalacoes sanitarias: aciona limpeza por necessidade em vez de por horario.',
  },

  // ---------------------------------------------------------- portas e fugas
  {
    id: 'ms-ws301',
    brand: MILESIGHT,
    model: 'WS301',
    name: 'WS301 Contacto magnetico',
    type: 'sensor',
    category: 'ocupacao',
    measures: ['porta'],
    power: ['bateria'],
    battery: pack(1, 1650, 'ER14335 Li-SOCl2', [4, 5]),
    ip: 'IP30',
    mounting: ['Fita 3M', 'Parafuso'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 4,
    description: 'Contacto magnetico de porta ou janela para interior.',
  },
  {
    id: 'ms-em300-mcs',
    brand: MILESIGHT,
    model: 'EM300-MCS',
    name: 'EM300-MCS Porta IP67',
    type: 'sensor',
    category: 'ocupacao',
    measures: ['porta'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [8, 10]),
    ip: 'IP67',
    mounting: ['Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 4,
    description: 'Contacto magnetico IP67 para portoes, cais de carga e portas exteriores.',
  },
  {
    id: 'ms-ws303',
    brand: MILESIGHT,
    model: 'WS303',
    name: 'WS303 Mini fuga de agua',
    type: 'sensor',
    category: 'agua',
    measures: ['fuga'],
    power: ['bateria'],
    battery: pack(1, 590, 'CR2450 Litio', [5, 5]),
    ip: 'IP67',
    mounting: ['Fita 3M', 'Pousado', 'Parede'],
    tempRange: [-10, 60],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { rangeM: 0.005, accuracy: 'dispara a 0,5 mm de agua' },
    radius: 3,
    description: 'Detetor de fuga miniatura que dispara com apenas 0,5 mm de agua. Ideal por baixo de lavatorios e AVAC.',
  },
  {
    id: 'ms-em300-sld',
    brand: MILESIGHT,
    model: 'EM300-SLD',
    name: 'EM300-SLD Fuga pontual',
    type: 'sensor',
    category: 'agua',
    measures: ['fuga'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { accuracy: 'dispara a 5 mm de agua' },
    radius: 4,
    description: 'Deteccao pontual de fuga com sonda no chao, 10 anos de autonomia.',
  },
  {
    id: 'ms-em300-zld',
    brand: MILESIGHT,
    model: 'EM300-ZLD',
    name: 'EM300-ZLD Fuga por cabo',
    type: 'sensor',
    category: 'agua',
    measures: ['fuga'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { accuracy: 'dispara a 1,5 mm ao longo do cabo' },
    radius: 6,
    description: 'Cabo de deteccao para cobrir uma zona inteira: salas tecnicas, datacenter, condutas.',
  },

  // ------------------------------------------------------ ocupacao / pessoas
  {
    id: 'ms-vs121',
    brand: MILESIGHT,
    model: 'VS121',
    name: 'VS121 Ocupacao AI',
    type: 'camera',
    category: 'ocupacao',
    measures: ['ocupacao', 'contagem'],
    power: ['poe', 'usb'],
    ip: 'IP30',
    mounting: ['Teto (parafuso)'],
    tempRange: [-5, 55],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { areaW: 4.8, areaD: 14, mountHeight: [2.3, 4], accuracy: 'contagem por zona ate 98%' },
    radius: 8,
    description: 'Sensor AI de ocupacao de postos de trabalho. A 3 m de altura cobre 4,8 x 14 m com deteccao multi-zona.',
  },
  {
    id: 'ms-vs133',
    brand: MILESIGHT,
    model: 'VS133',
    name: 'VS133 Contagem ToF',
    type: 'camera',
    category: 'contagem',
    measures: ['contagem'],
    power: ['poe', 'dc'],
    ip: 'IP40',
    mounting: ['Teto (parafuso)', 'Verga de porta'],
    tempRange: [-20, 50],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { areaW: 4, areaD: 3, fovH: 98, fovV: 80, mountHeight: [2.5, 3.5], accuracy: 'ate 99,8%' },
    radius: 4,
    description: 'Contagem de pessoas por ToF de 2a geracao, ate 99,8% de precisao. Nao capta imagem identificavel.',
  },
  {
    id: 'ms-vs135',
    brand: MILESIGHT,
    model: 'VS135',
    name: 'VS135 Contagem 4D ToF',
    type: 'camera',
    category: 'contagem',
    measures: ['contagem', 'ocupacao'],
    power: ['poe', 'dc'],
    ip: 'IP40',
    mounting: ['Teto', 'Verga de porta'],
    tempRange: [-20, 50],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { areaW: 5.54, areaD: 3.98, mountHeight: [2.5, 6.5], accuracy: 'ate 99,8%' },
    radius: 6,
    description: 'ToF 4D com versao de teto alto ate 6,5 m (5,54 x 3,98 m de cobertura).',
  },
  {
    id: 'ms-vs125',
    brand: MILESIGHT,
    model: 'VS125',
    name: 'VS125 Visao estereo',
    type: 'camera',
    category: 'contagem',
    measures: ['contagem'],
    power: ['poe', 'dc'],
    ip: 'IP40',
    mounting: ['Teto', 'Verga de porta'],
    tempRange: [-20, 50],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { fovH: 101, fovV: 70, mountHeight: [2.2, 6], accuracy: 'ate 99,8%' },
    radius: 6,
    description: 'Contador de pessoas por visao estereo, montagem entre 2,2 e 6 m. PoE 802.3af.',
  },
  {
    id: 'ms-vs330',
    brand: MILESIGHT,
    model: 'VS330',
    name: 'VS330 Ocupacao sanitarios',
    type: 'sensor',
    category: 'ocupacao',
    measures: ['ocupacao'],
    power: ['bateria'],
    battery: pack(3, 4000, 'Li-SOCl2', [4, 5]),
    ip: 'IP30',
    mounting: ['Teto', 'Parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { rangeM: 3.5, accuracy: 'ate 99,5%' },
    radius: 4,
    description: 'Deteccao de ocupacao de cabine sanitaria, alcance 0,04 a 3,5 m.',
  },
  {
    id: 'ms-vs350',
    brand: MILESIGHT,
    model: 'VS350',
    name: 'VS350 Contagem de passagem',
    type: 'sensor',
    category: 'contagem',
    measures: ['contagem'],
    power: ['bateria'],
    battery: pack(2, 2700, 'Li-SOCl2', [3, 4]),
    ip: 'IP30',
    mounting: ['Teto', 'Parede'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { areaW: 2.8, mountHeight: [2.5, 3], accuracy: 'grupos ~80%' },
    radius: 4,
    description: 'Contagem de passagem a bateria: cobre 2,8 m de largura instalado a 3 m de altura.',
  },
  {
    id: 'ms-vs370',
    brand: MILESIGHT,
    model: 'VS370',
    name: 'VS370 Presenca radar',
    type: 'sensor',
    category: 'ocupacao',
    measures: ['ocupacao', 'movimento'],
    power: ['bateria'],
    battery: pack(2, 2700, 'ER14505 Li-SOCl2', [2, 3]),
    ip: 'IP30',
    mounting: ['Suporte magnetico', 'Teto'],
    tempRange: [0, 30],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { rangeM: 7.5, mountHeight: [2.3, 3], accuracy: 'ate 99% — movimento 7,5 m, micro-movimento 4,8 m' },
    radius: 8,
    description: 'Radar de onda milimetrica: deteta presenca mesmo com a pessoa parada, ao contrario do PIR.',
  },
  {
    id: 'ms-vs341',
    brand: MILESIGHT,
    model: 'VS341',
    name: 'VS341 Ocupacao de secretaria',
    type: 'sensor',
    category: 'ocupacao',
    measures: ['ocupacao'],
    power: ['bateria'],
    battery: pack(1, 4000, 'Li-SOCl2', [4, 5]),
    ip: 'IP30',
    mounting: ['Fita 3M', 'Parafuso'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { rangeM: 0.4, accuracy: 'ate 98%' },
    radius: 2,
    description: 'Sensor por posto de trabalho, montado sob a secretaria. Distancia otima 20 a 40 cm.',
  },

  // ------------------------------------------------------------ nivel / dist
  {
    id: 'ms-ws201',
    brand: MILESIGHT,
    model: 'WS201',
    name: 'WS201 Nivel de enchimento',
    type: 'sensor',
    category: 'nivel',
    measures: ['nivel', 'distancia'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [3, 4]),
    ip: 'IP30',
    mounting: ['Fita 3M', 'Parafuso'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 3,
    description: 'Monitoriza o nivel de enchimento de dispensadores e contentores de residuos.',
  },
  {
    id: 'ms-em400-tld',
    brand: MILESIGHT,
    model: 'EM400-TLD',
    name: 'EM400-TLD Distancia laser',
    type: 'sensor',
    category: 'nivel',
    measures: ['distancia', 'nivel', 'temperatura'],
    power: ['bateria'],
    battery: pack(2, 9000, 'ER26500 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Teto', 'Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { rangeM: 3.5, accuracy: '2 a 350 cm, +/- 2 cm' },
    radius: 4,
    description: 'Medicao ToF laser de 2 a 350 cm com +/- 2 cm. Para contentores de residuos e silos pequenos.',
  },
  {
    id: 'ms-em400-mud',
    brand: MILESIGHT,
    model: 'EM400-MUD',
    name: 'EM400-MUD Ultrassons',
    type: 'sensor',
    category: 'nivel',
    measures: ['distancia', 'nivel', 'temperatura'],
    power: ['bateria'],
    battery: pack(2, 9000, 'ER26500 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Teto', 'Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    detection: { rangeM: 4.5, accuracy: '3 a 450 cm' },
    radius: 5,
    description: 'Sensor ultrassonico multifuncao de 3 a 450 cm, imune a superficies transparentes.',
  },

  // ------------------------------------------------------------- energia/AVAC
  {
    id: 'ms-wt201',
    brand: MILESIGHT,
    model: 'WT201',
    name: 'WT201 Termostato',
    type: 'sensor',
    category: 'energia',
    measures: ['temperatura', 'humidade'],
    power: ['dc'],
    ip: 'IP30',
    mounting: ['Parede (caixa de derivacao)'],
    tempRange: [0, 50],
    radio: { class: 'C', antennaDbi: 2 },
    radius: 10,
    description: 'Termostato LoRaWAN Classe C para AVAC: le a sala e atua sobre o equipamento em tempo real.',
  },
  {
    id: 'ms-wt101',
    brand: MILESIGHT,
    model: 'WT101',
    name: 'WT101 Valvula de radiador',
    type: 'sensor',
    category: 'energia',
    measures: ['temperatura', 'valvula'],
    power: ['bateria'],
    battery: pack(2, 2700, 'ER14505 Li-SOCl2', [1, 2]),
    ip: 'IP30',
    mounting: ['Radiador'],
    tempRange: [0, 50],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 8,
    description: 'Cabeca termostatica sem fios para radiadores: controlo por divisao sem obras.',
  },
  {
    id: 'ms-ct103',
    brand: MILESIGHT,
    model: 'CT103',
    name: 'CT103 Transformador de corrente',
    type: 'sensor',
    category: 'energia',
    measures: ['corrente', 'consumo'],
    power: ['bateria'],
    battery: pack(1, 4000, 'ER18505 Li-SOCl2', [5, 8]),
    ip: 'IP65',
    mounting: ['Pinca sobre o cabo'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 6,
    description: 'Transformador de corrente de nucleo dividido: mede consumo sem cortar a alimentacao.',
  },

  // ---------------------------------------------------------- controlo / I/O
  {
    id: 'ms-uc300',
    brand: MILESIGHT,
    model: 'UC300',
    name: 'UC300 Controlador I/O',
    type: 'repeater',
    category: 'controlo',
    measures: ['io', 'modbus'],
    power: ['dc'],
    ip: 'IP30',
    mounting: ['Calha DIN', 'Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 20,
    description: 'Controlador com 4 entradas digitais, 2 saidas, entradas analogicas e RS485. Liga equipamento antigo a rede.',
  },
  {
    id: 'ms-uc100',
    brand: MILESIGHT,
    model: 'UC100',
    name: 'UC100 Modbus para LoRaWAN',
    type: 'repeater',
    category: 'controlo',
    measures: ['modbus'],
    power: ['dc'],
    ip: 'IP30',
    mounting: ['Calha DIN', 'Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 18,
    description: 'Conversor Modbus RS485 para LoRaWAN, 70 x 45 x 13 mm. Le contadores e PLCs existentes.',
  },
  {
    id: 'ms-ws558',
    brand: MILESIGHT,
    model: 'WS558',
    name: 'WS558 Controlador de luz',
    type: 'repeater',
    category: 'controlo',
    measures: ['io', 'consumo'],
    power: ['dc'],
    ip: 'IP30',
    mounting: ['Caixa de derivacao'],
    tempRange: [-20, 60],
    radio: { class: 'C', antennaDbi: 2 },
    radius: 15,
    description: 'Controlador de iluminacao de 8 canais com medicao de consumo. Classe C para comando imediato.',
  },
  {
    id: 'ms-ws156',
    brand: MILESIGHT,
    model: 'WS156',
    name: 'WS156 Painel de cenas',
    type: 'repeater',
    category: 'controlo',
    measures: ['botao'],
    power: ['bateria'],
    battery: pack(2, 2700, 'ER14505 Li-SOCl2', [4, 5]),
    ip: 'IP30',
    mounting: ['Parede', 'Fita 3M'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 10,
    description: 'Painel de 6 teclas para acionar cenas: luz, AVAC e estores sem cablagem.',
  },

  // --------------------------------------------------------------- exterior
  {
    id: 'ms-em500-co2',
    brand: MILESIGHT,
    model: 'EM500-CO2',
    name: 'EM500-CO2 Exterior',
    type: 'sensor',
    category: 'exterior',
    measures: ['co2', 'temperatura', 'humidade', 'pressao'],
    power: ['bateria'],
    battery: pack(1, 19000, 'ER34615 Li-SOCl2', [8, 10]),
    ip: 'IP67',
    mounting: ['Poste', 'Parede'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 3 },
    radius: 30,
    description: 'CO2 para exterior e ambientes agressivos, com bateria de 19000 mAh.',
  },
  {
    id: 'ms-wts506',
    brand: MILESIGHT,
    model: 'WTS506',
    name: 'WTS506 Estacao meteorologica',
    type: 'sensor',
    category: 'exterior',
    measures: ['meteo', 'temperatura', 'humidade', 'pressao', 'luz'],
    power: ['solar', 'bateria'],
    ip: 'IP66',
    mounting: ['Poste'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 3 },
    radius: 40,
    description: 'Estacao meteorologica compacta: vento, chuva, temperatura, humidade, pressao e radiacao.',
  },
  {
    id: 'ms-em500-pt100',
    brand: MILESIGHT,
    model: 'EM500-PT100',
    name: 'EM500-PT100 Industrial',
    type: 'sensor',
    category: 'exterior',
    measures: ['temperatura'],
    power: ['bateria'],
    battery: pack(1, 19000, 'ER34615 Li-SOCl2', [10, 10]),
    ip: 'IP67',
    mounting: ['Poste', 'Parede', 'Calha DIN'],
    tempRange: [-200, 800],
    radio: { class: 'A', antennaDbi: 3 },
    radius: 25,
    description: 'Sonda PT100 Classe A de -200 a +800 C conforme a ponta escolhida. Processos industriais.',
  },
  {
    id: 'ms-at101',
    brand: MILESIGHT,
    model: 'AT101',
    name: 'AT101 Localizador de ativos',
    type: 'sensor',
    category: 'exterior',
    measures: ['gps', 'temperatura'],
    power: ['bateria'],
    battery: pack(1, 19000, 'ER34615 Li-SOCl2', [3, 5]),
    ip: 'IP67',
    mounting: ['Fita 3M', 'Suporte magnetico'],
    tempRange: [-30, 70],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 20,
    description: 'Localizador exterior com GPS e posicionamento Wi-Fi/BLE para ativos moveis.',
  },

  // --------------------------------------------------------------- genericos
  {
    id: 'generic-gateway',
    brand: 'Generico',
    model: '—',
    name: 'Gateway generico',
    type: 'gateway',
    category: 'generico',
    measures: [],
    power: ['poe'],
    ip: 'IP30',
    mounting: ['Parede'],
    tempRange: [-20, 55],
    gateway: { channels: 8, duplex: 'half', maxNodes: 1000, antennaDbi: 3, environment: 'indoor' },
    radius: 80,
    description: 'Gateway LoRaWAN de outro fabricante — mantem o plano coerente em instalacoes mistas.',
  },
  {
    id: 'generic-sensor',
    brand: 'Generico',
    model: '—',
    name: 'Sensor generico',
    type: 'sensor',
    category: 'generico',
    measures: ['temperatura', 'humidade'],
    power: ['bateria'],
    battery: pack(1, 2700, 'Li-SOCl2', [3, 5]),
    ip: 'IP30',
    mounting: ['Parede'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 2 },
    radius: 12,
    description: 'Sensor de ambiente de outro fabricante.',
  },
  {
    id: 'generic-camera',
    brand: 'Generico',
    model: '—',
    name: 'Camara generica',
    type: 'camera',
    category: 'generico',
    measures: ['contagem'],
    power: ['poe'],
    ip: 'IP40',
    mounting: ['Teto'],
    tempRange: [-10, 50],
    radius: 8,
    description: 'Camara ou sensor de visao de outro fabricante.',
  },
  {
    id: 'generic-repeater',
    brand: 'Generico',
    model: '—',
    name: 'Repetidor generico',
    type: 'repeater',
    category: 'generico',
    measures: [],
    power: ['dc'],
    ip: 'IP30',
    mounting: ['Parede'],
    tempRange: [-20, 60],
    radio: { class: 'A', antennaDbi: 3 },
    radius: 40,
    description: 'Repetidor / extensor de alcance de outro fabricante.',
  },
]

export const catalogById: Record<string, DeviceModel> = Object.fromEntries(
  deviceCatalog.map((model) => [model.id, model]),
)

/**
 * Projects saved before the catalog was rebuilt on real Milesight data may
 * reference models that turned out not to exist (or that were renamed).
 */
const legacyModelIds: Record<string, string> = {
  'ms-em300': 'ms-em300-th',
  'ms-em300-door': 'ms-em300-mcs',
  'ms-uc500': 'ms-uc300',
  'ms-sc541': 'ms-vs133',
}

export function resolveModel(modelId: string | undefined): DeviceModel | undefined {
  if (!modelId) return undefined
  return catalogById[modelId] ?? catalogById[legacyModelIds[modelId] ?? '']
}

export function defaultModelFor(type: DeviceType): DeviceModel {
  const preferred: Record<DeviceType, string> = {
    gateway: 'ms-ug65',
    sensor: 'ms-am103',
    camera: 'ms-vs133',
    repeater: 'ms-uc300',
  }
  return catalogById[preferred[type]] ?? deviceCatalog.find((m) => m.type === type)!
}

export function modelsForType(type: DeviceType): DeviceModel[] {
  return deviceCatalog.filter((model) => model.type === type)
}

export function measuresTemperature(modelId: string | undefined): boolean {
  return !!resolveModel(modelId)?.measures.includes('temperatura')
}

/** Groups a model list by catalog category, keeping the declared order. */
export function groupByCategory(models: DeviceModel[]): [CatalogCategory, DeviceModel[]][] {
  const groups = new Map<CatalogCategory, DeviceModel[]>()
  for (const model of models) {
    const list = groups.get(model.category) ?? []
    list.push(model)
    groups.set(model.category, list)
  }
  return [...groups.entries()]
}

export function batteryLabel(model: DeviceModel): string | null {
  if (!model.battery) return null
  const { cells, mah, chemistry, years } = model.battery
  const life = years[0] === years[1] ? `${years[0]} anos` : `${years[0]}-${years[1]} anos`
  return `${cells} x ${mah} mAh ${chemistry} · ${life}`
}
