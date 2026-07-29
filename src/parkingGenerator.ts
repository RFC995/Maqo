import type { BuildingConfig } from './types'
import { createRng } from './buildingGenerator'

/**
 * Procedural smart-parking lot layout. Pure and deterministic from the seed,
 * exactly like `buildingGenerator.ts` is for buildings, so the 3D scene, the
 * seeded deployment and the RF planning all agree on where the bays are.
 *
 * The lot fills the structure footprint (`config.width` x `config.depth`, in
 * local coordinates centred on 0). Bays are standard 2.6 x 5.0 m, arranged as
 * back-to-back rows separated by 6 m drive aisles — the layout a real surface
 * car park uses.
 */

export const BAY_W = 2.6
export const BAY_D = 5.0
const AISLE = 6.0
const EDGE = 2.2

export interface Bay {
  /** centre of the bay, local coordinates */
  x: number
  z: number
  /** car heading: 0 = nose toward -z, PI = nose toward +z */
  rotY: number
  /** deterministic baseline occupancy when no sensor watches this bay */
  ocupadoBase: boolean
  row: number
  col: number
}

export interface ParkLayout {
  width: number
  depth: number
  bayW: number
  bayD: number
  bays: Bay[]
  /** z-centre and depth of every drive aisle, for lane markings */
  aisles: { z: number; depth: number }[]
  /** where the entrance barrier sits, on the front (+z) edge */
  entrance: { x: number; z: number }
  lamps: { x: number; z: number }[]
}

export function gerarParque(config: BuildingConfig, seed: number): ParkLayout {
  const width = config.width
  const depth = config.depth
  const rng = createRng(seed * 7919 + Math.round(width * 13) + Math.round(depth * 29))

  const innerW = Math.max(BAY_W, width - EDGE * 2)
  const innerD = Math.max(BAY_D, depth - EDGE * 2)

  const cols = Math.max(2, Math.floor(innerW / BAY_W))
  const usableW = cols * BAY_W
  const x0 = -usableW / 2 + BAY_W / 2

  // pattern down the lot: [bay row][bay row back-to-back][drive aisle], repeated
  const pitch = 2 * BAY_D + AISLE
  const blocks = Math.max(1, Math.floor((innerD + AISLE) / pitch))
  const usedD = blocks * pitch - AISLE
  const zStart = -usedD / 2

  const bays: Bay[] = []
  const aisles: { z: number; depth: number }[] = []
  let row = 0

  for (let b = 0; b < blocks; b += 1) {
    const blockTop = zStart + b * pitch
    const rowZs: [number, number][] = [
      [blockTop + BAY_D / 2, 0], // faces -z
      [blockTop + BAY_D * 1.5, Math.PI], // faces +z
    ]
    for (const [z, rotY] of rowZs) {
      for (let c = 0; c < cols; c += 1) {
        bays.push({
          x: x0 + c * BAY_W,
          z,
          rotY,
          ocupadoBase: rng() < 0.6,
          row,
          col: c,
        })
      }
      row += 1
    }
    if (b < blocks - 1) {
      aisles.push({ z: blockTop + 2 * BAY_D + AISLE / 2, depth: AISLE })
    }
  }

  const entrance = { x: -usableW / 2 + BAY_W, z: usedD / 2 + 1.4 }

  // one pole per block corner, kept clear of the bays
  const lamps: { x: number; z: number }[] = []
  const lampX = usableW / 2 + 1.4
  for (let b = 0; b <= blocks; b += 1) {
    const z = zStart + b * pitch - AISLE / 2
    lamps.push({ x: -lampX, z })
    lamps.push({ x: lampX, z })
  }

  return { width, depth, bayW: BAY_W, bayD: BAY_D, bays, aisles, entrance, lamps }
}

/** True when a point falls inside a bay's rectangle — used to bind a placed sensor to a bay. */
export function pointInBay(bay: Bay, x: number, z: number): boolean {
  return (
    x >= bay.x - BAY_W / 2 &&
    x <= bay.x + BAY_W / 2 &&
    z >= bay.z - BAY_D / 2 &&
    z <= bay.z + BAY_D / 2
  )
}
