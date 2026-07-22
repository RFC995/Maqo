import type { BuildingConfig, DeviceItem } from './types'

/**
 * World-space height of a device marker. Lives outside the 3D components so
 * that the RF engine can use the same geometry the scene draws.
 */
export function deviceWorldYFor(device: DeviceItem, building: BuildingConfig): number {
  if (device.mount === 'roof') return building.floors * building.floorHeight + 0.35
  if (device.mount === 'ground') return 0.05
  const floor = device.floor ?? 0
  return floor * building.floorHeight + building.floorHeight * 0.55
}
