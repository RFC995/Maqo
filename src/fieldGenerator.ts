import type { BuildingConfig } from './types'
import { createRng } from './buildingGenerator'

/**
 * Procedural smart-farm layout, pure and seeded like `parkingGenerator.ts`.
 * The structure footprint (`config.width` x `config.depth`) is the whole plot,
 * local coordinates centred on 0, X = width, Z = depth. The front strip (+Z)
 * holds the farmstead (barn, silo, greenhouse); the rest is planted field split
 * into two beds either side of a central track.
 */

export interface Bed {
  x: number
  z: number
  w: number
  d: number
}

export interface QuintaLayout {
  w: number
  d: number
  beds: Bed[]
  /** planted rows across the beds (instanced); shade 0..1 picks the crop colour */
  rows: { x: number; z: number; w: number; shade: number }[]
  /** scattered plants for texture */
  tufts: { x: number; z: number; s: number; shade: number }[]
  fence: { minX: number; maxX: number; minZ: number; maxZ: number; posts: { x: number; z: number }[] }
  trees: { x: number; z: number; s: number }[]
  greenhouse: { x: number; z: number; w: number; d: number }
  barn: { x: number; z: number; w: number; d: number }
  silo: { x: number; z: number; r: number; h: number }
}

const ROW_PITCH = 0.72

export function gerarQuinta(config: BuildingConfig, seed: number): QuintaLayout {
  const w = config.width
  const d = config.depth
  const rng = createRng(seed * 6421 + Math.round(w * 17) + Math.round(d * 11))

  const frontStrip = 16 // farmstead depth at +Z
  const margin = 3
  const fieldFrontZ = d / 2 - frontStrip
  const fieldBackZ = -d / 2 + margin
  const fieldDepth = fieldFrontZ - fieldBackZ
  const fieldCenterZ = (fieldFrontZ + fieldBackZ) / 2

  const track = 3 // central path
  const bedW = (w - margin * 2 - track) / 2
  const leftX = -track / 2 - bedW / 2
  const rightX = track / 2 + bedW / 2

  const beds: Bed[] = [
    { x: leftX, z: fieldCenterZ, w: bedW, d: fieldDepth },
    { x: rightX, z: fieldCenterZ, w: bedW, d: fieldDepth },
  ]

  const rows: QuintaLayout['rows'] = []
  const tufts: QuintaLayout['tufts'] = []
  beds.forEach((bed, i) => {
    const shade = i === 0 ? 0.15 : 0.7 // each bed a different crop colour
    const n = Math.max(3, Math.floor(bed.d / ROW_PITCH))
    const startZ = bed.z - (n - 1) * ROW_PITCH * 0.5
    for (let r = 0; r < n; r += 1) {
      rows.push({ x: bed.x, z: startZ + r * ROW_PITCH, w: bed.w, shade: shade + (rng() - 0.5) * 0.12 })
    }
    // a handful of taller plants dotted along the rows
    const tuftCount = Math.floor(bed.w * bed.d * 0.05)
    for (let t = 0; t < tuftCount; t += 1) {
      tufts.push({
        x: bed.x + (rng() - 0.5) * (bed.w - 1),
        z: bed.z + (rng() - 0.5) * (bed.d - 1),
        s: 0.7 + rng() * 0.7,
        shade: shade + (rng() - 0.5) * 0.1,
      })
    }
  })

  // fence around the field area
  const minX = -w / 2 + margin * 0.5
  const maxX = w / 2 - margin * 0.5
  const minZ = fieldBackZ - 0.5
  const maxZ = fieldFrontZ + 0.5
  const posts: { x: number; z: number }[] = []
  const postPitch = 3
  for (let x = minX; x <= maxX + 0.01; x += postPitch) {
    posts.push({ x, z: minZ })
    posts.push({ x, z: maxZ })
  }
  for (let z = minZ + postPitch; z < maxZ - 0.01; z += postPitch) {
    posts.push({ x: minX, z })
    posts.push({ x: maxX, z })
  }

  // trees along the back edge
  const trees: QuintaLayout['trees'] = []
  const treeCount = Math.max(3, Math.round(w / 12))
  for (let i = 0; i < treeCount; i += 1) {
    trees.push({
      x: -w / 2 + 2 + (i / (treeCount - 1 || 1)) * (w - 4),
      z: -d / 2 - 1.5,
      s: 0.85 + rng() * 0.6,
    })
  }

  return {
    w,
    d,
    beds,
    rows,
    tufts,
    fence: { minX, maxX, minZ, maxZ, posts },
    trees,
    greenhouse: { x: w / 2 - 11, z: d / 2 - 8, w: 9, d: 13 },
    barn: { x: -w / 2 + 9, z: d / 2 - 8, w: 10, d: 7 },
    silo: { x: -w / 2 + 16.5, z: d / 2 - 8, r: 1.9, h: 7 },
  }
}
