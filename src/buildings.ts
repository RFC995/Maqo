import type { Building, BuildingConfig } from './types'

/**
 * Gap between a building's footprint and the next one's. Generous on purpose:
 * Site.tsx extends each building's lawn ~60m past its own footprint (see
 * `lawnW` in components/Site.tsx), so a tight margin would make neighbouring
 * lawns overlap and z-fight.
 */
const OFFSET_MARGIN = 50

/** Where a new building should sit: right after the rightmost existing one. */
export function nextSiteSlot(existing: Building[], config: BuildingConfig): { x: number; z: number } {
  if (existing.length === 0) return { x: 0, z: 0 }
  const rightEdge = Math.max(...existing.map((b) => b.site.x + b.config.width / 2))
  return { x: rightEdge + OFFSET_MARGIN + config.width / 2, z: 0 }
}

/** A new building dropped next to the existing ones, ready to be edited. */
export function createBuilding(existing: Building[]): Building {
  const config: BuildingConfig = {
    name: `Edificio ${existing.length + 1}`,
    style: 'office',
    width: 28,
    depth: 18,
    floors: 3,
    floorHeight: 3.4,
  }
  return { id: crypto.randomUUID(), config, site: nextSiteSlot(existing, config) }
}

/** Bounding box of every building's footprint, in world coordinates. */
export function campusBounds(buildings: Building[]) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const b of buildings) {
    const halfW = b.config.width / 2
    const halfD = b.config.depth / 2
    minX = Math.min(minX, b.site.x - halfW)
    maxX = Math.max(maxX, b.site.x + halfW)
    minZ = Math.min(minZ, b.site.z - halfD)
    maxZ = Math.max(maxZ, b.site.z + halfD)
  }
  return { minX, maxX, minZ, maxZ, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 }
}
