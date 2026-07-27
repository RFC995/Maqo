import type { Measurement } from './catalog'

/**
 * TTN / ChirpStack integration: configuration, and turning a raw MQTT uplink
 * from either network server into a normalised reading the dashboard can use.
 *
 * The MQTT connection itself lives in the Electron main process (Node can open
 * the TLS socket the browser cannot) — see electron/integracao.cjs. This module
 * is provider-agnostic and three.js/electron-free so it can be imported from
 * anywhere in the renderer and unit-reasoned about on its own.
 */

export type Provedor = 'ttn' | 'chirpstack'

export const provedorLabels: Record<Provedor, string> = {
  ttn: 'The Things Network / Stack',
  chirpstack: 'ChirpStack',
}

export interface ConfigTTN {
  /** regional cluster host, e.g. eu1.cloud.thethings.network */
  host: string
  /** the application id exactly as it appears in the console */
  appId: string
  /** tenant: "ttn" for the community network, the tenant id on a private stack */
  tenant: string
  /** an API key with "read application traffic" rights (NNSXS....) */
  apiKey: string
}

export interface ConfigChirpStack {
  /** MQTT broker host of the ChirpStack server */
  host: string
  porta: number
  tls: boolean
  /** optional: restrict to one application id; empty subscribes to all */
  appId: string
  utilizador: string
  password: string
}

export interface ConfigIntegracao {
  provedor: Provedor
  ttn: ConfigTTN
  chirpstack: ConfigChirpStack
  /** reconnect automatically when the app opens */
  ligarAoIniciar: boolean
}

export const CONFIG_PADRAO: ConfigIntegracao = {
  provedor: 'ttn',
  ttn: { host: 'eu1.cloud.thethings.network', appId: '', tenant: 'ttn', apiKey: '' },
  chirpstack: { host: '', porta: 1883, tls: false, appId: '', utilizador: '', password: '' },
  ligarAoIniciar: true,
}

const CHAVE_CONFIG = 'maqo.integracao'

export function carregarConfig(): ConfigIntegracao {
  try {
    const bruto = window.localStorage.getItem(CHAVE_CONFIG)
    if (!bruto) return CONFIG_PADRAO
    const guardada = JSON.parse(bruto)
    // shallow-merge over the defaults so a newer field never lands undefined
    return {
      ...CONFIG_PADRAO,
      ...guardada,
      ttn: { ...CONFIG_PADRAO.ttn, ...guardada.ttn },
      chirpstack: { ...CONFIG_PADRAO.chirpstack, ...guardada.chirpstack },
    }
  } catch {
    return CONFIG_PADRAO
  }
}

export function guardarConfig(config: ConfigIntegracao) {
  try {
    window.localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config))
  } catch {
    // storage unavailable — the config just does not persist
  }
}

/** Compact "time ago" label for a reception timestamp. */
export function haQuanto(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `há ${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  return `há ${h}h`
}

/** True once a provider has enough filled in to attempt a connection. */
export function configPronta(config: ConfigIntegracao): boolean {
  if (config.provedor === 'ttn') {
    const t = config.ttn
    return !!(t.host && t.appId && t.tenant && t.apiKey)
  }
  const c = config.chirpstack
  return !!(c.host && c.porta)
}

// ------------------------------------------------------------ uplink parsing

export interface UplinkNormalizado {
  provedor: Provedor
  /** hex, upper-case, no separators — the join key against a device binding */
  devEui: string
  /** the network-server device id / name, shown to help identify the sensor */
  deviceId?: string
  /** decoder fields mapped onto the app's measurement vocabulary */
  valores: Partial<Record<Measurement, number>>
  /** the decoded payload exactly as it arrived, so unmapped fields still show */
  bruto: Record<string, unknown>
  rssi?: number
  snr?: number
  sf?: number
  fcnt?: number
  /** epoch millis of reception */
  at: number
}

/**
 * A DevEUI written with colons, dashes or lower case still has to match a
 * binding typed differently — so everything is compared in this canonical form.
 */
export function normalizarDevEui(valor: string | undefined | null): string {
  if (!valor) return ''
  return valor.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
}

/**
 * Decoder field name (lower-case) -> app measurement. Milesight's TTN/ChirpStack
 * codecs emit the English field names on the left; several aliases are covered
 * because the same quantity is spelled differently across product families.
 */
const CAMPO_PARA_MEDIDA: Record<string, Measurement> = {
  temperature: 'temperatura',
  temp: 'temperatura',
  humidity: 'humidade',
  hum: 'humidade',
  co2: 'co2',
  co2_ppm: 'co2',
  tvoc: 'tvoc',
  voc: 'tvoc',
  pm2_5: 'pm25',
  pm25: 'pm25',
  'pm2.5': 'pm25',
  pm10: 'pm10',
  hcho: 'hcho',
  ch2o: 'hcho',
  o3: 'o3',
  ozone: 'o3',
  pressure: 'pressao',
  barometric_pressure: 'pressao',
  illumination: 'luz',
  light: 'luz',
  lux: 'luz',
  luminosity: 'luz',
  noise: 'ruido',
  noise_level: 'ruido',
  laeq: 'ruido',
  la: 'ruido',
  distance: 'distancia',
  level: 'nivel',
  fill_level: 'nivel',
  remaining: 'nivel',
  current: 'corrente',
}

function numeroFinito(valor: unknown): number | null {
  const n = typeof valor === 'string' ? Number(valor) : valor
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** Maps a flat decoded payload onto the measurement vocabulary. */
function extrairValores(bruto: Record<string, unknown>): Partial<Record<Measurement, number>> {
  const valores: Partial<Record<Measurement, number>> = {}
  for (const [chave, valor] of Object.entries(bruto)) {
    const medida = CAMPO_PARA_MEDIDA[chave.toLowerCase()]
    if (!medida) continue
    const n = numeroFinito(valor)
    // first spelling wins, so a real value is never overwritten by an alias null
    if (n !== null && valores[medida] === undefined) valores[medida] = n
  }
  return valores
}

function comoObjeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : {}
}

function primeiro<T>(lista: unknown, extrair: (item: Record<string, unknown>) => T | undefined): T | undefined {
  if (!Array.isArray(lista)) return undefined
  for (const item of lista) {
    const v = extrair(comoObjeto(item))
    if (v !== undefined) return v
  }
  return undefined
}

function tempoOuAgora(valor: unknown): number {
  if (typeof valor === 'string') {
    const t = Date.parse(valor)
    if (Number.isFinite(t)) return t
  }
  return Date.now()
}

/**
 * Turns a raw uplink message (already JSON-parsed) from TTN or ChirpStack into
 * the shared shape. Returns null when the message has no usable DevEUI.
 */
export function normalizarUplink(provedor: Provedor, mensagem: unknown): UplinkNormalizado | null {
  const raiz = comoObjeto(mensagem)

  if (provedor === 'ttn') {
    const ids = comoObjeto(raiz.end_device_ids)
    const up = comoObjeto(raiz.uplink_message)
    const devEui = normalizarDevEui(ids.dev_eui as string)
    if (!devEui) return null
    const bruto = comoObjeto(up.decoded_payload)
    const lora = comoObjeto(comoObjeto(comoObjeto(up.settings).data_rate).lora)
    return {
      provedor,
      devEui,
      deviceId: (ids.device_id as string) || undefined,
      valores: extrairValores(bruto),
      bruto,
      rssi: primeiro(up.rx_metadata, (m) => numeroFinito(m.rssi) ?? undefined),
      snr: primeiro(up.rx_metadata, (m) => numeroFinito(m.snr) ?? undefined),
      sf: numeroFinito(lora.spreading_factor) ?? undefined,
      fcnt: numeroFinito(up.f_cnt) ?? undefined,
      at: tempoOuAgora(up.received_at ?? raiz.received_at),
    }
  }

  // ChirpStack — v4 shape, with fall-backs for v3 key spellings
  const info = comoObjeto(raiz.deviceInfo)
  const devEui = normalizarDevEui((info.devEui as string) ?? (raiz.devEUI as string) ?? (raiz.devEui as string))
  if (!devEui) return null
  // v4: object; v3: objectJSON (a string) or object
  let bruto = comoObjeto(raiz.object)
  if (Object.keys(bruto).length === 0 && typeof raiz.objectJSON === 'string') {
    try {
      bruto = comoObjeto(JSON.parse(raiz.objectJSON))
    } catch {
      bruto = {}
    }
  }
  const lora = comoObjeto(comoObjeto(comoObjeto(raiz.txInfo).modulation).lora)
  return {
    provedor,
    devEui,
    deviceId: (info.deviceName as string) || (raiz.deviceName as string) || undefined,
    valores: extrairValores(bruto),
    bruto,
    rssi: primeiro(raiz.rxInfo, (m) => numeroFinito(m.rssi) ?? undefined),
    snr: primeiro(raiz.rxInfo, (m) => numeroFinito(m.snr ?? m.loRaSNR) ?? undefined),
    sf: numeroFinito(lora.spreadingFactor) ?? undefined,
    fcnt: numeroFinito(raiz.fCnt) ?? undefined,
    at: tempoOuAgora(raiz.time),
  }
}
