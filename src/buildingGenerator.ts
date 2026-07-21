import type { BuildingConfig, BuildingStyle } from './types'

export function createRng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface StyleConfig {
  wallColor: string
  wallColorAlt: string
  roughness: string
  frameColor: string
  glassColorDay: string
  glassColorLit: string
  roofColor: string
  parapetColor: string
  colSpacingFront: number
  colSpacingSide: number
  winWidthRatio: number
  winHeightRatio: number
  winSill: number
  balconies: boolean
  entranceWidth: number
  litRatio: number
  plinthColor: string
}

export const styleConfigs: Record<BuildingStyle, StyleConfig> = {
  office: {
    wallColor: '#eef1f5',
    wallColorAlt: '#dde3ea',
    roughness: 'smooth',
    frameColor: '#20242c',
    glassColorDay: '#bcdcec',
    glassColorLit: '#ffdca0',
    roofColor: '#4b5563',
    parapetColor: '#3a4048',
    colSpacingFront: 2.6,
    colSpacingSide: 2.6,
    winWidthRatio: 0.64,
    winHeightRatio: 0.62,
    winSill: 0.42,
    balconies: false,
    entranceWidth: 5.2,
    litRatio: 0.28,
    plinthColor: '#c7ccd4',
  },
  industrial: {
    wallColor: '#93a0ae',
    wallColorAlt: '#7e8b9a',
    roughness: 'rough',
    frameColor: '#2b2f36',
    glassColorDay: '#a9c2cf',
    glassColorLit: '#ffe3ab',
    roofColor: '#5b6470',
    parapetColor: '#454c56',
    colSpacingFront: 4.4,
    colSpacingSide: 4.4,
    winWidthRatio: 0.5,
    winHeightRatio: 0.34,
    winSill: 0.62,
    balconies: false,
    entranceWidth: 7.5,
    litRatio: 0.12,
    plinthColor: '#5f6772',
  },
  residential: {
    wallColor: '#d9c3a3',
    wallColorAlt: '#cdb491',
    roughness: 'smooth',
    frameColor: '#5a4632',
    glassColorDay: '#cfe6ee',
    glassColorLit: '#ffd699',
    roofColor: '#7a4a3a',
    parapetColor: '#5e3a2d',
    colSpacingFront: 3.0,
    colSpacingSide: 3.0,
    winWidthRatio: 0.44,
    winHeightRatio: 0.56,
    winSill: 0.48,
    balconies: true,
    entranceWidth: 3.6,
    litRatio: 0.32,
    plinthColor: '#b79f7f',
  },
}

/** A single punched-window slot on the facade. rotY 0 = faces +/-Z, PI/2 = faces +/-X. */
export interface WindowSlot {
  x: number
  y: number
  z: number
  rotY: number
}

export interface FacadeSet {
  frame: WindowSlot[]
  lit: WindowSlot[]
  unlit: WindowSlot[]
  balcony: WindowSlot[]
}

export interface FloorGeometry {
  index: number
  y0: number
  y1: number
  centerY: number
  facade: FacadeSet
}

export interface WindowDims {
  w: number
  h: number
}

export interface RoofEquipment {
  hvac: { pos: Vec3; size: Vec3 }[]
  hatch: { pos: Vec3; size: Vec3 } | null
  pipes: { pos: Vec3; height: number }[]
}

export interface TreeInstance extends Vec3 {
  scale: number
}

export interface ParkingSpot {
  x: number
  z: number
}

export interface BushInstance {
  x: number
  z: number
  scale: number
}

export interface LampInstance {
  x: number
  z: number
  rotY: number
}

export interface SiteLayout {
  plotWidth: number
  plotDepth: number
  walkMargin: number
  driveway: { x: number; z: number; width: number; depth: number }
  street: { x: number; z: number; width: number; depth: number }
  trees: TreeInstance[]
  bushes: BushInstance[]
  lamps: LampInstance[]
  parking: ParkingSpot[]
  parkingLot: { x: number; z: number; width: number; depth: number } | null
}

function windowPositionsAlongAxis(span: number, spacing: number, gapCenterWidth: number) {
  const columns = Math.max(2, Math.floor(span / spacing))
  const margin = (span - (columns - 1) * spacing) / 2
  const positions: number[] = []
  for (let c = 0; c < columns; c += 1) {
    const pos = -span / 2 + margin + c * spacing
    if (Math.abs(pos) < gapCenterWidth / 2) continue
    positions.push(pos)
  }
  return positions
}

export function computeWindowDims(building: BuildingConfig, style: StyleConfig): WindowDims {
  const w = ((style.colSpacingFront + style.colSpacingSide) / 2) * style.winWidthRatio
  const h = building.floorHeight * style.winHeightRatio
  return { w, h }
}

export function generateFloors(
  building: BuildingConfig,
  style: StyleConfig,
  rng: () => number,
): FloorGeometry[] {
  const dims = computeWindowDims(building, style)
  const halfW = building.width / 2
  const halfD = building.depth / 2
  const wallOffset = 0.03

  const floors: FloorGeometry[] = []

  for (let i = 0; i < building.floors; i += 1) {
    const y0 = i * building.floorHeight
    const y1 = y0 + building.floorHeight
    const centerY = y0 + building.floorHeight * style.winSill + dims.h / 2

    const gap = i === 0 ? style.entranceWidth : 0
    const xsFront = windowPositionsAlongAxis(building.width, style.colSpacingFront, gap)
    const zsSide = windowPositionsAlongAxis(
      building.depth,
      style.colSpacingSide,
      i === 0 ? style.entranceWidth * 0.4 : 0,
    )

    const facade: FacadeSet = { frame: [], lit: [], unlit: [], balcony: [] }

    const zSides: [number, number][] = [
      [halfD + wallOffset, 0],
      [-halfD - wallOffset, Math.PI],
    ]
    for (const px of xsFront) {
      for (const [z, rotY] of zSides) {
        const slot: WindowSlot = { x: px, y: centerY, z, rotY }
        facade.frame.push(slot)
        const lit = rng() < style.litRatio
        ;(lit ? facade.lit : facade.unlit).push(slot)
        if (style.balconies && i > 0) {
          facade.balcony.push({ x: px, y: y0 + 0.02, z, rotY })
        }
      }
    }

    const xSides: [number, number][] = [
      [halfW + wallOffset, Math.PI / 2],
      [-halfW - wallOffset, -Math.PI / 2],
    ]
    for (const pz of zsSide) {
      for (const [x, rotY] of xSides) {
        const slot: WindowSlot = { x, y: centerY, z: pz, rotY }
        facade.frame.push(slot)
        const lit = rng() < style.litRatio
        ;(lit ? facade.lit : facade.unlit).push(slot)
      }
    }

    floors.push({ index: i, y0, y1, centerY, facade })
  }

  return floors
}

export function generateRoofEquipment(
  building: BuildingConfig,
  rng: () => number,
  topY: number,
): RoofEquipment {
  const hvacCount = 2 + Math.floor(rng() * 3)
  const hvac: RoofEquipment['hvac'] = []
  const usableW = building.width * 0.6
  const usableD = building.depth * 0.6

  for (let i = 0; i < hvacCount; i += 1) {
    const w = 1.6 + rng() * 1.4
    const d = 1.6 + rng() * 1.4
    const h = 0.9 + rng() * 0.6
    hvac.push({
      pos: {
        x: (rng() - 0.5) * usableW,
        y: topY + h / 2,
        z: (rng() - 0.5) * usableD,
      },
      size: { x: w, y: h, z: d },
    })
  }

  const hatch =
    building.width > 10 && building.depth > 10
      ? {
          pos: { x: building.width * 0.28, y: topY + 0.5, z: -building.depth * 0.28 },
          size: { x: 1.8, y: 1.0, z: 1.8 },
        }
      : null

  const pipes: RoofEquipment['pipes'] = []
  const pipeCount = 1 + Math.floor(rng() * 2)
  for (let i = 0; i < pipeCount; i += 1) {
    pipes.push({
      pos: {
        x: (rng() - 0.5) * usableW * 0.8,
        y: topY,
        z: (rng() - 0.5) * usableD * 0.8,
      },
      height: 0.6 + rng() * 0.8,
    })
  }

  return { hvac, hatch, pipes }
}

export function computePlotSize(building: BuildingConfig) {
  const siteMargin = Math.max(22, building.width * 0.55, building.depth * 0.45)
  const plotWidth = building.width + siteMargin * 2
  const plotDepth = building.depth + siteMargin * 2
  return { siteMargin, plotWidth, plotDepth }
}

export function generateSite(building: BuildingConfig, rng: () => number): SiteLayout {
  const walkMargin = 3
  const { siteMargin, plotWidth, plotDepth } = computePlotSize(building)

  const driveway = {
    x: 0,
    z: building.depth / 2 + (siteMargin + walkMargin) / 2,
    width: 6,
    depth: siteMargin - walkMargin + 1,
  }

  const street = {
    x: 0,
    z: plotDepth / 2 - 1.5,
    width: plotWidth,
    depth: 3.2,
  }

  const trees: TreeInstance[] = []
  const treeAttempts = 26
  for (let i = 0; i < treeAttempts; i += 1) {
    const x = (rng() - 0.5) * (plotWidth - 4)
    const z = (rng() - 0.5) * (plotDepth - 4)
    const insideBuilding =
      Math.abs(x) < building.width / 2 + walkMargin && Math.abs(z) < building.depth / 2 + walkMargin
    const onDriveway = Math.abs(x - driveway.x) < driveway.width / 2 + 1 && z > building.depth / 2
    const onStreet = Math.abs(z - street.z) < street.depth + 2
    if (insideBuilding || onDriveway || onStreet) continue
    trees.push({ x, y: 0, z, scale: 0.75 + rng() * 0.6 })
    if (trees.length >= 14) break
  }

  const parkingLot =
    plotWidth > building.width + 18
      ? {
          x: building.width / 2 + siteMargin * 0.55,
          z: building.depth * 0.1,
          width: siteMargin * 0.85,
          depth: Math.min(building.depth * 0.8, siteMargin * 1.4),
        }
      : null

  const parking: ParkingSpot[] = []
  if (parkingLot) {
    const stallW = 2.6
    const stallsPerRow = Math.max(2, Math.floor(parkingLot.width / stallW) - 1)
    const rows = parkingLot.depth > 12 ? 2 : 1
    for (let r = 0; r < rows; r += 1) {
      for (let s = 0; s < stallsPerRow; s += 1) {
        parking.push({
          x: parkingLot.x - parkingLot.width / 2 + stallW * 0.5 + s * stallW + 1,
          z: parkingLot.z - parkingLot.depth / 2 + 2.5 + r * (parkingLot.depth - 5),
        })
      }
    }
  }

  const bushes: BushInstance[] = []
  const frontZ = building.depth / 2 + 1.4
  const bushSpread = building.width / 2 - 2
  for (let i = 0; i < 8; i += 1) {
    const x = -bushSpread + (i / 7) * bushSpread * 2
    if (Math.abs(x) < 4.2) continue
    bushes.push({ x: x + (rng() - 0.5) * 0.8, z: frontZ + (rng() - 0.5) * 0.5, scale: 0.65 + rng() * 0.5 })
  }
  for (const sideX of [-building.width / 2 - 1.4, building.width / 2 + 1.4]) {
    for (let i = 0; i < 3; i += 1) {
      bushes.push({
        x: sideX + (rng() - 0.5) * 0.6,
        z: -building.depth / 2 + 2 + i * (building.depth / 3) + (rng() - 0.5) * 1.2,
        scale: 0.6 + rng() * 0.5,
      })
    }
  }

  const lamps: LampInstance[] = []
  const lampZ = street.z - street.depth / 2 - 1.1
  const lampSpan = plotWidth * 0.82
  const lampCount = Math.max(2, Math.round(lampSpan / 17))
  for (let i = 0; i < lampCount; i += 1) {
    const x = -lampSpan / 2 + (i / (lampCount - 1)) * lampSpan
    if (Math.abs(x - driveway.x) < 4) continue
    lamps.push({ x, z: lampZ, rotY: 0 })
  }

  return { plotWidth, plotDepth, walkMargin, driveway, street, trees, bushes, lamps, parking, parkingLot }
}

export function buildingTopY(building: BuildingConfig) {
  return building.floors * building.floorHeight
}
