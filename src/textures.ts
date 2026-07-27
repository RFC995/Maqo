import * as THREE from 'three'

/**
 * Real photographed PBR material scans (Poly Haven, CC0 — see
 * `public/textures/CREDITS.txt`) replace what used to be canvas-drawn noise.
 * Loaded with the plain `TextureLoader` rather than `useLoader`/Suspense: the
 * mesh renders immediately with its flat `color` and pops the photo in a
 * frame later once decoded, which is a much safer failure mode than a
 * suspended load with no boundary around it (that took the whole app to a
 * blank page once already — see Scene3D.tsx's HDRI loading for the fix).
 *
 * Each (path, repeat) pair gets its own `Texture`/`Image` load rather than a
 * shared base texture that gets `.clone()`d per repeat setting: cloning before
 * the source image finishes decoding freezes the clone on the still-empty
 * image forever, since the loader's `onLoad` only ever repopulates the
 * original texture object. The browser's HTTP cache makes the repeat
 * `TextureLoader.load()` calls for the same file effectively free.
 */
const cache = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()

function cached(key: string, build: () => THREE.Texture) {
  const hit = cache.get(key)
  if (hit) return hit
  const texture = build()
  cache.set(key, texture)
  return texture
}

function loadMap(key: string, path: string, colorSpace: THREE.ColorSpace, repeatX: number, repeatY: number) {
  return cached(`${key}:${repeatX}:${repeatY}`, () => {
    const texture = loader.load(`${import.meta.env.BASE_URL}textures/${path}`)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    texture.colorSpace = colorSpace
    texture.repeat.set(repeatX, repeatY)
    return texture
  })
}

export interface MaterialMaps {
  map: THREE.Texture
  normal: THREE.Texture
  roughnessMap: THREE.Texture
}

function materialMaps(name: string, rx: number, ry: number): MaterialMaps {
  return {
    map: loadMap(`${name}-diffuse`, `${name}/diffuse.jpg`, THREE.SRGBColorSpace, rx, ry),
    normal: loadMap(`${name}-normal`, `${name}/normal.jpg`, THREE.NoColorSpace, rx, ry),
    roughnessMap: loadMap(`${name}-roughness`, `${name}/roughness.jpg`, THREE.NoColorSpace, rx, ry),
  }
}

export function getWallMaps(rx: number, ry: number) {
  return materialMaps('wall', rx, ry)
}
export function getGrassMaps(rx: number, ry: number) {
  return materialMaps('grass', rx, ry)
}
export function getPlazaMaps(rx: number, ry: number) {
  return materialMaps('plaza', rx, ry)
}
export function getAsphaltMaps(rx: number, ry: number) {
  return materialMaps('asphalt', rx, ry)
}
export function getRoofMaps(rx: number, ry: number) {
  return materialMaps('roof', rx, ry)
}
