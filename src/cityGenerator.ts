import type { BuildingConfig } from './types'
import { createRng, computePlotSize } from './buildingGenerator'

/**
 * Procedural surrounding city. The subject building sits in the reserved centre;
 * this fills the ground around it with a grid of context buildings and streets
 * so the scene reads as a city model rather than one building on a lawn.
 *
 * Pure and seeded — no three.js — so it can be reasoned about on its own and
 * stays out of the Scene3D code-split chunk boundary concerns.
 */

export interface CityBuilding {
  x: number
  z: number
  w: number
  d: number
  h: number
  /** which real wall texture to use (index into the facade set) */
  facade: number
  /** per-building tint multiplier applied over the texture */
  tone: string
  /** 0..1 fraction of windows lit at night */
  litRatio: number
  rotY: number
}

export interface CityRoad {
  x: number
  z: number
  w: number
  d: number
}

export interface CityLayout {
  buildings: CityBuilding[]
  roads: CityRoad[]
  /** half-extent of the whole city (ground/base is sized to this) */
  half: number
}

/** Half-extent of the surrounding city, shared by the ground, base and shadow frustum. */
export function cityHalfExtent(building: BuildingConfig): number {
  const { plotWidth, plotDepth } = computePlotSize(building)
  return Math.max(plotWidth, plotDepth) * 0.5 + 96
}

const facadeTones = ['#e9e4da', '#dcd5c8', '#e7ddcf', '#d3ccbe', '#efe9dd', '#cdc6b8', '#e2d9c9']

export function gerarCidade(building: BuildingConfig, seed: number): CityLayout {
  const rng = createRng(seed * 92821 + Math.round(building.width * 7 + building.depth * 13) + 3)
  const { plotWidth, plotDepth } = computePlotSize(building)
  const half = cityHalfExtent(building)

  // the central block the subject building + its landscaping own, kept clear
  const reservedX = plotWidth / 2 + 10
  const reservedZ = plotDepth / 2 + 10

  const roadW = 7
  const pitch = 27 // block + road
  const buildings: CityBuilding[] = []
  const roads: CityRoad[] = []

  const cells = Math.ceil(half / pitch)

  // street grid — lines running the full span between blocks
  for (let g = -cells; g <= cells; g += 1) {
    const p = g * pitch + pitch / 2
    if (Math.abs(p) > half) continue
    roads.push({ x: p, z: 0, w: roadW, d: half * 2 }) // vertical avenue
    roads.push({ x: 0, z: p, w: half * 2, d: roadW }) // horizontal street
  }

  for (let gx = -cells; gx <= cells; gx += 1) {
    for (let gz = -cells; gz <= cells; gz += 1) {
      const cx = gx * pitch
      const cz = gz * pitch
      if (Math.abs(cx) > half - 6 || Math.abs(cz) > half - 6) continue
      // keep the subject building's block (and the ring just around it) clear
      if (Math.abs(cx) < reservedX + pitch * 0.5 && Math.abs(cz) < reservedZ + pitch * 0.5) continue

      const blockInner = pitch - roadW - 3 // usable footprint band inside the block
      // 1 building for tight blocks, sometimes split into 2 for variety
      const split = rng() > 0.62 && blockInner > 16
      const parts = split ? 2 : 1

      for (let i = 0; i < parts; i += 1) {
        const w = blockInner * (split ? 0.42 : 0.62) * (0.75 + rng() * 0.4)
        const d = blockInner * (0.6 + rng() * 0.35)
        // taller nearer the centre so the skyline builds toward the subject; a
        // few random towers punctuate the outskirts
        const dist = Math.hypot(cx, cz)
        const near = 1 - Math.min(1, dist / half)
        const tower = rng() > 0.88
        const floors = Math.round(2 + near * 5 + rng() * 5 + (tower ? 6 + rng() * 8 : 0))
        const h = Math.max(6, floors * 3.2)

        const ox = split ? (i === 0 ? -blockInner * 0.24 : blockInner * 0.24) : (rng() - 0.5) * 3
        const oz = (rng() - 0.5) * 3

        buildings.push({
          x: cx + ox,
          z: cz + oz,
          w,
          d,
          h,
          facade: Math.floor(rng() * 3),
          tone: facadeTones[Math.floor(rng() * facadeTones.length)],
          litRatio: 0.35 + rng() * 0.4,
          rotY: 0,
        })
      }
    }
  }

  return { buildings, roads, half }
}
