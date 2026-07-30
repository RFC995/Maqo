import { measurementUnits, type DeviceModel, type Measurement } from './catalog'
import { modoDados, valorPorDispositivo } from './liveStore'

/**
 * Simulated live readings.
 *
 * The values are synthetic, but the ranges, resolutions and the good/fair/poor
 * thresholds are the real ones: WHO 2021 air-quality guidelines for PM,
 * ASHRAE / DGS indoor CO2 bands, EN 16798 comfort bands for temperature and
 * humidity, and the measuring range printed on the Milesight datasheets.
 */

export type ReadingStatus = 'bom' | 'razoavel' | 'mau' | 'sem-dados'

export const readingStatusColors: Record<ReadingStatus, string> = {
  bom: '#22c55e',
  razoavel: '#f59e0b',
  mau: '#ef4444',
  'sem-dados': '#5b6472',
}

interface MeasurementSpec {
  /** typical indoor baseline the simulation oscillates around */
  base: number
  /** peak-to-peak swing across a working day */
  swing: number
  /** sensor resolution, used for rounding */
  decimals: number
  /** [good below, poor above] — omitted when the reading has no comfort band */
  thresholds?: [number, number]
  /** true when a low value is the bad one (e.g. light in a workspace) */
  lowerIsWorse?: boolean
  min: number
  max: number
}

const specs: Partial<Record<Measurement, MeasurementSpec>> = {
  temperatura: { base: 22.4, swing: 2.6, decimals: 1, thresholds: [24.5, 26.5], min: -30, max: 70 },
  humidade: { base: 48, swing: 12, decimals: 1, thresholds: [60, 70], min: 0, max: 100 },
  co2: { base: 620, swing: 420, decimals: 0, thresholds: [800, 1200], min: 400, max: 5000 },
  tvoc: { base: 110, swing: 90, decimals: 0, thresholds: [150, 300], min: 0, max: 500 },
  pm25: { base: 9, swing: 8, decimals: 1, thresholds: [15, 25], min: 0, max: 1000 },
  pm10: { base: 17, swing: 14, decimals: 1, thresholds: [45, 75], min: 0, max: 1000 },
  hcho: { base: 0.04, swing: 0.04, decimals: 3, thresholds: [0.1, 0.2], min: 0, max: 2 },
  o3: { base: 0.02, swing: 0.02, decimals: 3, thresholds: [0.05, 0.1], min: 0, max: 1 },
  pressao: { base: 1013, swing: 8, decimals: 0, min: 300, max: 1100 },
  luz: { base: 420, swing: 260, decimals: 0, thresholds: [300, 200], lowerIsWorse: true, min: 0, max: 60000 },
  ruido: { base: 46, swing: 12, decimals: 1, thresholds: [55, 65], min: 30, max: 130 },
  odor: { base: 1.4, swing: 1.2, decimals: 1, thresholds: [3, 4], min: 0, max: 5 },
  corrente: { base: 12.5, swing: 8, decimals: 2, min: 0, max: 200 },
  distancia: { base: 120, swing: 60, decimals: 0, min: 2, max: 450 },
  nivel: { base: 55, swing: 35, decimals: 0, thresholds: [70, 90], min: 0, max: 100 },
}

/**
 * On/off readings that can't share the sine-wave `MeasurementSpec` shape
 * above — a leak is a rare alarm condition, occupancy flips between meeting
 * blocks. The state only re-rolls once per `epochTicks`, so it stays stable
 * for a while instead of flickering every tick, and `chance` sets how often
 * the "on" state (leak / occupied) comes up.
 */
interface BinarySpec {
  epochTicks: number
  chance: number
}

const binarySpecs: Partial<Record<Measurement, BinarySpec>> = {
  fuga: { epochTicks: 24, chance: 0.06 },
  ocupacao: { epochTicks: 90, chance: 0.4 },
}

function simulateBinary(measurement: Measurement, sensorId: string, tick: number): number {
  const spec = binarySpecs[measurement]!
  const epoch = Math.floor(tick / spec.epochTicks)
  return hash01(`${sensorId}:${measurement}:${epoch}`) < spec.chance ? 1 : 0
}

function hash01(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function round(value: number, decimals: number) {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Deterministic per-sensor value: two out-of-phase sine waves so neighbouring
 * sensors drift apart the way real ones do, seeded from the device id.
 */
export function sensorReading(measurement: Measurement, sensorId: string, tick: number): number | null {
  // a device bound to a real DevEUI on a live TTN/ChirpStack link reads its
  // actual uplinks — null here means "bound but not reported yet", i.e. wait
  // for the next real uplink rather than fabricate a value
  if (modoDados(sensorId) === 'real') {
    return valorPorDispositivo(sensorId, measurement)
  }

  if (binarySpecs[measurement]) return simulateBinary(measurement, sensorId, tick)

  const spec = specs[measurement]
  if (!spec) return null

  const seed = hash01(sensorId + measurement)
  const offset = (seed - 0.5) * spec.swing * 0.7
  const slow = Math.sin(tick * 0.09 + seed * 11.3)
  const fast = Math.sin(tick * 0.31 + seed * 4.7) * 0.35
  const value = spec.base + offset + (slow + fast) * spec.swing * 0.5

  return round(Math.min(spec.max, Math.max(spec.min, value)), spec.decimals)
}

export function readingStatus(measurement: Measurement, value: number | null): ReadingStatus {
  if (value === null) return 'sem-dados'
  if (measurement === 'fuga') return value > 0 ? 'mau' : 'bom'
  if (measurement === 'ocupacao') return value > 0 ? 'mau' : 'bom'
  const spec = specs[measurement]
  if (!spec?.thresholds) return 'bom'
  const [fair, poor] = spec.thresholds
  if (spec.lowerIsWorse) {
    if (value < poor) return 'mau'
    return value < fair ? 'razoavel' : 'bom'
  }
  if (value >= poor) return 'mau'
  return value >= fair ? 'razoavel' : 'bom'
}

export function formatReading(measurement: Measurement, value: number | null): string {
  if (value === null) return '—'
  if (measurement === 'fuga') return value > 0 ? 'Fuga detetada' : 'Seco'
  if (measurement === 'ocupacao') return value > 0 ? 'Ocupada' : 'Livre'
  const unit = measurementUnits[measurement]
  return unit ? `${value} ${unit}` : `${value}`
}

/**
 * The measurements worth showing on a room callout, in priority order.
 * `ocupacao` leads: on an occupancy sensor (Tektelic VIVID v3, Milesight
 * VS-series) that's the one reading worth surfacing, ahead of any comfort
 * data the same device also reports.
 */
export const primaryMeasurements: Measurement[] = [
  'ocupacao',
  'temperatura',
  'humidade',
  'co2',
  'tvoc',
  'pm25',
  'ruido',
  'luz',
]

export function hasSpec(measurement: Measurement) {
  return specs[measurement] !== undefined || binarySpecs[measurement] !== undefined
}

/**
 * The one measurement worth showing as a device's compact/marker-level
 * reading — a leak sensor's alarm state, a level sensor's fill percentage
 * (falling back to raw distance if a future catalog entry lacks 'nivel'),
 * or the first `primaryMeasurements` entry the model actually reports.
 */
export function primaryReading(
  model: DeviceModel,
  sensorId: string,
  tick: number,
): { measurement: Measurement; value: number | null } | null {
  if (model.category === 'agua' && model.measures.includes('fuga')) {
    return { measurement: 'fuga', value: sensorReading('fuga', sensorId, tick) }
  }
  if (model.category === 'nivel') {
    const measurement = model.measures.includes('nivel')
      ? 'nivel'
      : model.measures.includes('distancia')
        ? 'distancia'
        : null
    return measurement ? { measurement, value: sensorReading(measurement, sensorId, tick) } : null
  }
  const measurement = primaryMeasurements.find((m) => model.measures.includes(m))
  return measurement ? { measurement, value: sensorReading(measurement, sensorId, tick) } : null
}
