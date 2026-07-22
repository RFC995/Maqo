import type { BuildingConfig, DeviceItem } from './types'
import { resolveModel, type DeviceModel } from './catalog'
import { deviceWorldYFor } from './geometry'

/**
 * LoRaWAN EU868 planning engine.
 *
 * The numbers here are the published regional / chipset figures, not vendor
 * marketing ranges: ETSI ERP limits and the 1% duty cycle for the g1 sub-band,
 * Semtech SX1302 demodulator sensitivity per spreading factor, and the LoRa
 * time-on-air formula from the SX127x/SX130x datasheets. Coverage is then
 * derived from a log-distance path-loss model with per-obstacle losses, which
 * is what an RF planner would actually use for an indoor deployment.
 */

export const SPREADING_FACTORS = [7, 8, 9, 10, 11, 12] as const
export type SpreadingFactor = (typeof SPREADING_FACTORS)[number]

export const EU868 = {
  frequencyMHz: 868.1,
  bandwidthHz: 125_000,
  /** ETSI ERP limit on the 868.0-868.6 MHz sub-band */
  maxErpDbm: 14,
  /** duty cycle on the same sub-band */
  dutyCycle: 0.01,
  /** receiver noise figure assumed for the gateway front end */
  noiseFigureDb: 6,
}

/** SX1302 demodulator sensitivity at 125 kHz, dBm. */
export const sensitivityDbm: Record<SpreadingFactor, number> = {
  7: -125,
  8: -128,
  9: -131,
  10: -134,
  11: -136.5,
  12: -139,
}

/** Required demodulator SNR per SF, dB. */
export const requiredSnrDb: Record<SpreadingFactor, number> = {
  7: -7.5,
  8: -10,
  9: -12.5,
  10: -15,
  11: -17.5,
  12: -20,
}

/** EU868 data rate index and bit rate for each SF at 125 kHz. */
export const dataRate: Record<SpreadingFactor, { dr: number; bps: number }> = {
  7: { dr: 5, bps: 5470 },
  8: { dr: 4, bps: 3125 },
  9: { dr: 3, bps: 1760 },
  10: { dr: 2, bps: 980 },
  11: { dr: 1, bps: 440 },
  12: { dr: 0, bps: 250 },
}

export interface Propagation {
  /** path-loss exponent; 2 is free space, ~3 a typical office */
  exponent: number
  /** loss per interior partition crossed, dB */
  interiorWallDb: number
  /** loss per concrete floor slab crossed, dB */
  floorSlabDb: number
  /** loss crossing the facade, dB */
  facadeDb: number
  /** fade margin held back for fading and body loss, dB */
  fadeMarginDb: number
}

export const propagationPresets: Record<string, { label: string; hint: string; value: Propagation }> = {
  office: {
    label: 'Escritorio (betao + gesso cartonado)',
    hint: 'Divisorias frequentes, lajes de betao. O caso base para edificios de servicos.',
    value: { exponent: 3.0, interiorWallDb: 4, floorSlabDb: 15, facadeDb: 15, fadeMarginDb: 10 },
  },
  industrial: {
    label: 'Industrial / armazem (espaco aberto)',
    hint: 'Pouca compartimentacao mas muito metal, que provoca reflexoes e desvanecimento.',
    value: { exponent: 2.5, interiorWallDb: 3, floorSlabDb: 18, facadeDb: 12, fadeMarginDb: 12 },
  },
  dense: {
    label: 'Construcao pesada (betao armado)',
    hint: 'Paredes interiores em betao, arquivos e caves. Cenario mais pessimista.',
    value: { exponent: 3.4, interiorWallDb: 12, floorSlabDb: 20, facadeDb: 18, fadeMarginDb: 10 },
  },
}

export const defaultPropagation = propagationPresets.office.value

/** Free-space path loss at 1 m for the EU868 band: 20*log10(4*pi*d/lambda). */
export const referenceLossDb = 20 * Math.log10((4 * Math.PI * 1 * EU868.frequencyMHz * 1e6) / 299_792_458)

export function noiseFloorDbm() {
  return -174 + 10 * Math.log10(EU868.bandwidthHz) + EU868.noiseFigureDb
}

/**
 * LoRa time on air, from the SX1276 datasheet formula.
 * Explicit header, CRC on, coding rate 4/5, 8 preamble symbols.
 */
export function timeOnAirMs(payloadBytes: number, sf: SpreadingFactor): number {
  const symbolTime = Math.pow(2, sf) / EU868.bandwidthHz
  const preamble = (8 + 4.25) * symbolTime
  // low data rate optimisation is mandatory for SF11/SF12 at 125 kHz
  const de = sf >= 11 ? 1 : 0
  const numerator = 8 * payloadBytes - 4 * sf + 28 + 16
  const denominator = 4 * (sf - 2 * de)
  const payloadSymbols = 8 + Math.max(Math.ceil(numerator / denominator) * 5, 0)
  return (preamble + payloadSymbols * symbolTime) * 1000
}

/** LoRaWAN adds a 13-byte MAC/MHDR/MIC overhead on top of the application payload. */
export function frameBytes(applicationBytes: number) {
  return applicationBytes + 13
}

/** Typical Milesight uplink size: a 2-byte channel header per measurement. */
export function estimatePayloadBytes(model: DeviceModel | undefined): number {
  const channels = Math.max(1, model?.measures.length ?? 2)
  return Math.min(51, 4 + channels * 3)
}

export interface LinkBudgetInput {
  /** end-device ERP, capped at the regional limit */
  txDbm: number
  /** gateway antenna gain, dBi */
  rxAntennaDbi: number
  propagation: Propagation
  /** fixed obstacle loss on this path, dB */
  obstacleDb: number
  /**
   * Average spacing between interior partitions, in metres. A signal spreading
   * indoors crosses one wall roughly every `wallPitch` metres, so attenuation
   * grows with distance instead of being a single fixed term. Omit (or pass 0)
   * for an unobstructed outdoor path.
   */
  wallPitch?: number
}

/** Total path loss at distance `d`, including the walls crossed along the way. */
function pathLossAt(d: number, input: LinkBudgetInput): number {
  const spread = referenceLossDb + 10 * input.propagation.exponent * Math.log10(Math.max(1, d))
  const walls = input.wallPitch && input.wallPitch > 0 ? Math.floor(d / input.wallPitch) : 0
  return spread + walls * input.propagation.interiorWallDb + input.obstacleDb
}

/**
 * Maximum distance in metres at which `sf` still closes the link.
 *
 * With a wall pitch the loss is no longer invertible in closed form (it steps
 * every time another partition is crossed), so this bisects instead.
 */
export function rangeForSf(sf: SpreadingFactor, input: LinkBudgetInput): number {
  const maxPathLoss = input.txDbm + input.rxAntennaDbi - sensitivityDbm[sf] - input.propagation.fadeMarginDb
  if (pathLossAt(1, input) > maxPathLoss) return 0

  let low = 1
  let high = 30_000
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2
    if (pathLossAt(mid, input) <= maxPathLoss) low = mid
    else high = mid
  }
  return low
}

export interface CoverageRing {
  sf: SpreadingFactor
  /** true modelled range, metres */
  radius: number
  /** radius actually drawn — clamped so a multi-kilometre outdoor ring stays on screen */
  drawRadius: number
  clamped: boolean
  /** kbps at this SF, for the legend */
  bps: number
  color: string
}

/** Ring colours run green (fast, close) to red (slow, far). */
export const sfColors: Record<SpreadingFactor, string> = {
  7: '#22c55e',
  8: '#84cc16',
  9: '#eab308',
  10: '#f97316',
  11: '#ef4444',
  12: '#b91c1c',
}

/**
 * Concentric SF rings for a gateway. Only SF7/SF9/SF12 are drawn by default —
 * three rings read clearly in 3D and they bracket the useful data rates.
 *
 * A gateway serving the inside of the building has its signal chewed up by
 * partitions as it spreads, so those rings use the wall-aware model and land in
 * the tens of metres. A pole-mounted outdoor unit gets the clean model, which
 * is why it reaches kilometres — the same split a real site survey would make.
 */
export function coverageRings(
  gateway: DeviceItem,
  propagation: Propagation,
  sfs: SpreadingFactor[] = [7, 9, 12],
  options: { wallPitch?: number; maxDrawRadius?: number } = {},
): CoverageRing[] {
  const model = resolveModel(gateway.modelId)
  const rxAntennaDbi = model?.gateway?.antennaDbi ?? 3
  const servesInterior = gateway.mount !== 'ground'

  const input: LinkBudgetInput = {
    txDbm: EU868.maxErpDbm,
    rxAntennaDbi,
    propagation,
    obstacleDb: 0,
    wallPitch: servesInterior ? (options.wallPitch ?? 6) : 0,
  }

  const maxDraw = options.maxDrawRadius ?? 260

  return sfs.map((sf) => {
    const radius = rangeForSf(sf, input)
    return {
      sf,
      radius,
      drawRadius: Math.min(radius, maxDraw),
      clamped: radius > maxDraw,
      bps: dataRate[sf].bps,
      color: sfColors[sf],
    }
  })
}

export type LinkQuality = 'excelente' | 'bom' | 'marginal' | 'sem-cobertura'

export const linkQualityLabels: Record<LinkQuality, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  marginal: 'Marginal',
  'sem-cobertura': 'Sem cobertura',
}

export const linkQualityColors: Record<LinkQuality, string> = {
  excelente: '#22c55e',
  bom: '#84cc16',
  marginal: '#f59e0b',
  'sem-cobertura': '#ef4444',
}

export interface LinkAnalysis {
  gatewayId: string | null
  gatewayName: string | null
  /** straight-line 3D distance, metres */
  distance: number
  floorsCrossed: number
  wallsCrossed: number
  obstacleDb: number
  pathLossDb: number
  rssiDbm: number
  snrDb: number
  sf: SpreadingFactor | null
  /** dB above the sensitivity threshold of the chosen SF */
  marginDb: number
  quality: LinkQuality
  payloadBytes: number
  airtimeMs: number
  /** uplinks per hour allowed by the 1% duty cycle at this SF */
  maxUplinksPerHour: number
}

const NO_LINK: LinkAnalysis = {
  gatewayId: null,
  gatewayName: null,
  distance: 0,
  floorsCrossed: 0,
  wallsCrossed: 0,
  obstacleDb: 0,
  pathLossDb: 0,
  rssiDbm: -999,
  snrDb: -999,
  sf: null,
  marginDb: 0,
  quality: 'sem-cobertura',
  payloadBytes: 0,
  airtimeMs: 0,
  maxUplinksPerHour: 0,
}

/**
 * Interior partitions crossed on a horizontal path. Rooms are laid out in two
 * bands off a central corridor, so a link crosses roughly one partition per
 * room width — that is the same assumption rooms.ts builds the plan on.
 */
function estimateWalls(horizontal: number, building: BuildingConfig, sameFloor: boolean): number {
  if (horizontal < 1) return 0
  const typicalRoom = Math.max(4, building.width / 4)
  const walls = Math.floor(horizontal / typicalRoom)
  return sameFloor ? walls : Math.max(0, walls - 1)
}

export interface PontoAvaliado {
  rssiDbm: number
  sf: SpreadingFactor | null
  /** dB above the sensitivity of the chosen SF; negative when out of range */
  marginDb: number
  gatewayId: string | null
}

const SEM_SINAL: PontoAvaliado = { rssiDbm: -999, sf: null, marginDb: -999, gatewayId: null }

/**
 * Best signal reachable at an arbitrary point on a floor, as heard by whichever
 * gateway serves it best. Assumes a generic end device (the regional ERP limit
 * and a 2 dBi antenna), because this answers "is this spot covered?" rather
 * than "how is this particular sensor doing".
 *
 * Shares the obstacle model with `analyseLink`, so the heatmap and the
 * per-device figures can never disagree.
 */
export function avaliarPonto(
  x: number,
  z: number,
  floorIndex: number,
  gateways: DeviceItem[],
  building: BuildingConfig,
  propagation: Propagation,
): PontoAvaliado {
  if (gateways.length === 0) return SEM_SINAL

  const pontoY = floorIndex * building.floorHeight + building.floorHeight * 0.55
  let melhor = SEM_SINAL

  for (const gateway of gateways) {
    const rxAntennaDbi = resolveModel(gateway.modelId)?.gateway?.antennaDbi ?? 3
    const gatewayY = deviceWorldYFor(gateway, building)

    const horizontal = Math.hypot(x - gateway.x, z - gateway.z)
    const distance = Math.max(1, Math.hypot(horizontal, pontoY - gatewayY))

    const gatewayFloor =
      gateway.mount === 'interior' ? (gateway.floor ?? 0) : gateway.mount === 'roof' ? building.floors : 0
    const floorsCrossed = Math.abs(floorIndex - gatewayFloor)
    const wallsCrossed = estimateWalls(horizontal, building, floorsCrossed === 0)
    const crossesFacade = gateway.mount === 'ground'

    const obstacleDb =
      floorsCrossed * propagation.floorSlabDb +
      wallsCrossed * propagation.interiorWallDb +
      (crossesFacade ? propagation.facadeDb : 0)

    const pathLossDb = referenceLossDb + 10 * propagation.exponent * Math.log10(distance) + obstacleDb
    const rssiDbm = EU868.maxErpDbm + rxAntennaDbi - pathLossDb
    if (rssiDbm <= melhor.rssiDbm) continue

    let sf: SpreadingFactor | null = null
    for (const candidate of SPREADING_FACTORS) {
      if (rssiDbm - propagation.fadeMarginDb >= sensitivityDbm[candidate]) {
        sf = candidate
        break
      }
    }

    melhor = {
      rssiDbm,
      sf,
      marginDb: rssiDbm - sensitivityDbm[sf ?? 12],
      gatewayId: gateway.id,
    }
  }

  return melhor
}

/**
 * Analyses one end device against every gateway in the project and keeps the
 * best link — which is what a real network does when several gateways hear the
 * same uplink.
 */
export function analyseLink(
  device: DeviceItem,
  gateways: DeviceItem[],
  building: BuildingConfig,
  propagation: Propagation,
): LinkAnalysis {
  if (device.type === 'gateway' || gateways.length === 0) return NO_LINK

  const model = resolveModel(device.modelId)
  const payloadBytes = frameBytes(estimatePayloadBytes(model))
  const txDbm = Math.min(EU868.maxErpDbm, EU868.maxErpDbm + (model?.radio?.antennaDbi ?? 2) - 2)
  const deviceY = deviceWorldYFor(device, building)

  let best: LinkAnalysis = { ...NO_LINK, payloadBytes }

  for (const gateway of gateways) {
    const gatewayModel = resolveModel(gateway.modelId)
    const rxAntennaDbi = gatewayModel?.gateway?.antennaDbi ?? 3
    const gatewayY = deviceWorldYFor(gateway, building)

    const dx = device.x - gateway.x
    const dz = device.z - gateway.z
    const dy = deviceY - gatewayY
    const horizontal = Math.hypot(dx, dz)
    const distance = Math.max(1, Math.hypot(horizontal, dy))

    const deviceFloor = device.mount === 'interior' ? (device.floor ?? 0) : device.mount === 'roof' ? building.floors : 0
    const gatewayFloor =
      gateway.mount === 'interior' ? (gateway.floor ?? 0) : gateway.mount === 'roof' ? building.floors : 0
    const floorsCrossed = Math.abs(deviceFloor - gatewayFloor)
    const sameFloor = floorsCrossed === 0
    const wallsCrossed = estimateWalls(horizontal, building, sameFloor)

    // a link that leaves or enters the building pays the facade once
    const crossesFacade = (device.mount === 'ground') !== (gateway.mount === 'ground')
    const obstacleDb =
      floorsCrossed * propagation.floorSlabDb +
      wallsCrossed * propagation.interiorWallDb +
      (crossesFacade ? propagation.facadeDb : 0)

    const pathLossDb = referenceLossDb + 10 * propagation.exponent * Math.log10(distance) + obstacleDb
    const rssiDbm = txDbm + rxAntennaDbi - pathLossDb
    const snrDb = rssiDbm - noiseFloorDbm()

    let sf: SpreadingFactor | null = null
    for (const candidate of SPREADING_FACTORS) {
      if (rssiDbm - propagation.fadeMarginDb >= sensitivityDbm[candidate]) {
        sf = candidate
        break
      }
    }

    const marginDb = sf ? rssiDbm - sensitivityDbm[sf] : rssiDbm - sensitivityDbm[12]
    const quality: LinkQuality =
      sf === null ? 'sem-cobertura' : marginDb >= 20 ? 'excelente' : marginDb >= 12 ? 'bom' : 'marginal'

    const airtimeMs = timeOnAirMs(payloadBytes, sf ?? 12)
    const maxUplinksPerHour = Math.floor((3600 * 1000 * EU868.dutyCycle) / airtimeMs)

    const candidateAnalysis: LinkAnalysis = {
      gatewayId: gateway.id,
      gatewayName: gateway.name,
      distance,
      floorsCrossed,
      wallsCrossed,
      obstacleDb,
      pathLossDb,
      rssiDbm,
      snrDb,
      sf,
      marginDb,
      quality,
      payloadBytes,
      airtimeMs,
      maxUplinksPerHour,
    }

    if (candidateAnalysis.rssiDbm > best.rssiDbm) best = candidateAnalysis
  }

  return best
}

export interface BatteryEstimate {
  /** modelled lifetime for the configured uplink interval, in years */
  years: number
  /** manufacturer-stated range, when the datasheet gives one */
  datasheetYears: [number, number] | null
  uplinksPerDay: number
  airtimePerDayMs: number
}

/**
 * Coulomb-counting estimate: transmit current for the airtime, two receive
 * windows after every uplink, and sleep current the rest of the time. Currents
 * are the usual SX126x front-end figures at +14 dBm.
 */
export function estimateBattery(
  model: DeviceModel | undefined,
  sf: SpreadingFactor | null,
  intervalMinutes: number,
  payloadBytes: number,
): BatteryEstimate | null {
  if (!model?.battery) return null

  const airtimeMs = timeOnAirMs(payloadBytes, sf ?? 10)
  const uplinksPerDay = (24 * 60) / Math.max(1, intervalMinutes)

  const txCurrentMa = 45
  const rxCurrentMa = 12
  const rxWindowMs = 2 * 40
  const sleepCurrentUa = 3

  // mA x hours = mAh; airtime is in ms, so divide by 3.6e6 to get hours
  const mahPerUplink = (txCurrentMa * airtimeMs) / 3_600_000 + (rxCurrentMa * rxWindowMs) / 3_600_000
  const mahPerDay = mahPerUplink * uplinksPerDay + (sleepCurrentUa / 1000) * 24

  // Li-SOCl2 cells lose usable capacity to self-discharge and cannot be run flat
  const usableMah = model.battery.cells * model.battery.mah * 0.8
  const years = usableMah / mahPerDay / 365

  return {
    years,
    datasheetYears: model.battery.years,
    uplinksPerDay,
    airtimePerDayMs: airtimeMs * uplinksPerDay,
  }
}

export interface NetworkSummary {
  gateways: number
  endDevices: number
  /** node capacity across all gateways */
  capacity: number
  linked: number
  marginal: number
  uncovered: number
  /**
   * Fraction of airtime occupied on a single channel at the busiest gateway,
   * once the load is spread over its channels. This is a collision-risk
   * metric, not the ETSI limit — that one is per transmitter and is reported
   * per device by `analyseLink`.
   */
  channelLoad: number
  /** nodes whose own uplink rate would break the per-device 1% duty cycle */
  overDutyCycle: number
  sfHistogram: Record<SpreadingFactor, number>
  worstDeviceId: string | null
}

export function summariseNetwork(
  devices: DeviceItem[],
  building: BuildingConfig,
  propagation: Propagation,
  intervalMinutes: number,
): NetworkSummary {
  const gateways = devices.filter((d) => d.type === 'gateway')
  const endDevices = devices.filter((d) => d.type !== 'gateway')

  const sfHistogram = { 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 } as Record<SpreadingFactor, number>
  const airtimeByGateway = new Map<string, number>()

  let linked = 0
  let marginal = 0
  let uncovered = 0
  let overDutyCycle = 0
  let worstDeviceId: string | null = null
  let worstMargin = Infinity

  const uplinksPerHour = 60 / Math.max(1, intervalMinutes)

  for (const device of endDevices) {
    const link = analyseLink(device, gateways, building, propagation)
    if (link.sf === null) {
      uncovered += 1
    } else {
      linked += 1
      sfHistogram[link.sf] += 1
      if (link.quality === 'marginal') marginal += 1
      if (uplinksPerHour > link.maxUplinksPerHour) overDutyCycle += 1
      const perHour = uplinksPerHour * link.airtimeMs
      airtimeByGateway.set(link.gatewayId!, (airtimeByGateway.get(link.gatewayId!) ?? 0) + perHour)
    }
    if (link.marginDb < worstMargin) {
      worstMargin = link.marginDb
      worstDeviceId = device.id
    }
  }

  // spread each gateway's received airtime over the channels it listens on
  let busiestLoad = 0
  for (const [gatewayId, ms] of airtimeByGateway) {
    const channels = resolveModel(gateways.find((g) => g.id === gatewayId)?.modelId)?.gateway?.channels ?? 8
    busiestLoad = Math.max(busiestLoad, ms / channels / (3600 * 1000))
  }

  const capacity = gateways.reduce((sum, g) => sum + (resolveModel(g.modelId)?.gateway?.maxNodes ?? 1000), 0)

  return {
    gateways: gateways.length,
    endDevices: endDevices.length,
    capacity,
    linked,
    marginal,
    uncovered,
    channelLoad: busiestLoad,
    overDutyCycle,
    sfHistogram,
    worstDeviceId,
  }
}
