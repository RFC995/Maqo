import { useLayoutEffect, useMemo, useRef } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import type { BuildingConfig } from '../types'
import { gerarCidade, type CityBuilding } from '../cityGenerator'
import type { TimeOfDay } from './Scene3D'

import concreteUrl from '../assets/textures/concrete_wall_008.jpg'
import brickUrl from '../assets/textures/red_brick_03.jpg'
import plasterUrl from '../assets/textures/painted_plaster_wall.jpg'

const facadeUrls = [concreteUrl, brickUrl, plasterUrl]

interface Facade {
  map: THREE.CanvasTexture
  emissiveMap: THREE.CanvasTexture
}

/**
 * Bakes a real wall photo into a facade: the CC0 texture tiled for resolution,
 * with a window grid drawn over it (glass in daytime) and a matching emissive
 * map (lit windows) so the city glows at night. One per wall texture.
 */
function composeFacade(img: HTMLImageElement, seedRatio: number): Facade {
  const W = 512
  const H = 512
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  // real wall, tiled 2x2 so it stays sharp and less obviously repeated
  for (let x = 0; x < 2; x += 1) {
    for (let y = 0; y < 2; y += 1) {
      ctx.drawImage(img, 0, 0, img.width, img.height, (x * W) / 2, (y * H) / 2, W / 2, H / 2)
    }
  }
  ctx.fillStyle = 'rgba(10,14,22,0.05)'
  ctx.fillRect(0, 0, W, H)

  const em = document.createElement('canvas')
  em.width = W
  em.height = H
  const ectx = em.getContext('2d')!
  ectx.fillStyle = '#000000'
  ectx.fillRect(0, 0, W, H)

  const cols = 5
  const rows = 7
  const padX = W * 0.09
  const padY = H * 0.07
  const cellW = (W - 2 * padX) / cols
  const cellH = (H - 2 * padY) / rows
  const winW = cellW * 0.66
  const winH = cellH * 0.62

  // deterministic-ish lit pattern from the seed
  let s = Math.floor(seedRatio * 100000) >>> 0 || 7
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const wx = padX + c * cellW + (cellW - winW) / 2
      const wy = padY + r * cellH + (cellH - winH) / 2
      const g = ctx.createLinearGradient(0, wy, 0, wy + winH)
      g.addColorStop(0, '#46586e')
      g.addColorStop(1, '#222d3c')
      ctx.fillStyle = g
      ctx.fillRect(wx, wy, winW, winH)
      ctx.strokeStyle = 'rgba(18,24,32,0.55)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(wx, wy, winW, winH)
      // night: some windows lit warm, some cool, some dark
      const lit = rnd()
      ectx.fillStyle = lit > 0.55 ? '#ffd89a' : lit > 0.4 ? '#cfe0ff' : '#050503'
      ectx.fillRect(wx, wy, winW, winH)
    }
  }

  const map = new THREE.CanvasTexture(cv)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const emissiveMap = new THREE.CanvasTexture(em)
  emissiveMap.colorSpace = THREE.SRGBColorSpace
  return { map, emissiveMap }
}

function InstancedBuildings({
  data,
  facade,
  emissiveIntensity,
}: {
  data: CityBuilding[]
  facade: Facade
  emissiveIntensity: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    data.forEach((b, i) => {
      tmp.position.set(b.x, b.h / 2, b.z)
      tmp.scale.set(b.w, b.h, b.d)
      tmp.rotation.set(0, b.rotY, 0)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
      mesh.setColorAt(i, color.set(b.tone))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data, tmp, color])

  if (data.length === 0) return null

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        map={facade.map}
        emissiveMap={facade.emissiveMap}
        emissive="#ffffff"
        emissiveIntensity={emissiveIntensity}
        roughness={0.82}
        metalness={0.02}
        envMapIntensity={0.5}
      />
    </instancedMesh>
  )
}

function Roofs({ data }: { data: CityBuilding[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    data.forEach((b, i) => {
      tmp.position.set(b.x, b.h + 0.15, b.z)
      tmp.scale.set(b.w + 0.3, 0.5, b.d + 0.3)
      tmp.rotation.set(0, b.rotY, 0)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [data, tmp])
  if (data.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#5b616b" roughness={0.95} />
    </instancedMesh>
  )
}

export function CityContext({
  building,
  seed,
  timeOfDay,
}: {
  building: BuildingConfig
  seed: number
  timeOfDay: TimeOfDay
}) {
  const layout = useMemo(() => gerarCidade(building, seed), [building, seed])
  const walls = useLoader(THREE.TextureLoader, facadeUrls)

  const facades = useMemo(() => {
    return walls.map((w, i) => composeFacade(w.image as HTMLImageElement, 0.11 + i * 0.27))
  }, [walls])

  useLayoutEffect(() => {
    return () => facades.forEach((f) => (f.map.dispose(), f.emissiveMap.dispose()))
  }, [facades])

  const byFacade = useMemo(() => {
    const groups: CityBuilding[][] = [[], [], []]
    for (const b of layout.buildings) groups[b.facade % 3].push(b)
    return groups
  }, [layout])

  const night = timeOfDay === 'night'
  const emissiveIntensity = night ? 1.5 : timeOfDay === 'dusk' ? 0.5 : 0

  const half = layout.half

  return (
    <group>
      {/* city ground (pavement) — sits just under the central grass plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[half * 2, half * 2]} />
        <meshStandardMaterial color={night ? '#3f434b' : '#9a9b93'} roughness={0.98} />
      </mesh>

      {/* street grid */}
      <Roads roads={layout.roads} night={night} />

      {facades.map((f, i) => (
        <InstancedBuildings key={i} data={byFacade[i]} facade={f} emissiveIntensity={emissiveIntensity} />
      ))}
      <Roofs data={layout.buildings} />
    </group>
  )
}

function Roads({ roads, night }: { roads: { x: number; z: number; w: number; d: number }[]; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    roads.forEach((r, i) => {
      tmp.position.set(r.x, 0.015, r.z)
      tmp.scale.set(r.w, 0.03, r.d)
      tmp.rotation.set(0, 0, 0)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [roads, tmp])
  if (roads.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, roads.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={night ? '#1a1c22' : '#41444b'} roughness={0.9} />
    </instancedMesh>
  )
}
