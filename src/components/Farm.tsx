import { useEffect, useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import type { BuildingConfig } from '../types'
import { gerarQuinta } from '../fieldGenerator'
import { getGrassNormal, getGrassTexture, setRepeat } from '../textures'
import type { TimeOfDay } from './Scene3D'

interface FarmProps {
  building: BuildingConfig
  seed: number
  timeOfDay: TimeOfDay
}

const cropDark = new THREE.Color('#4e7d2e')
const cropLight = new THREE.Color('#8bbf4a')
function cropColor(shade: number) {
  return new THREE.Color().lerpColors(cropDark, cropLight, Math.max(0, Math.min(1, shade)))
}

function cloneWithRepeat(base: ReturnType<typeof getGrassTexture>, width: number, depth: number, tile: number) {
  const t = base.clone()
  t.needsUpdate = true
  setRepeat(t, Math.max(1, width / tile), Math.max(1, depth / tile))
  return t
}

/**
 * The Smart Agriculture world: a farm. Planted field beds in rows, a glass
 * greenhouse, a red barn with a silo, a post-and-rail fence and trees — drawn
 * from the same procedural layout the RF planner and seeded deployment use.
 * Fully procedural/offline, like the rest of the app.
 */
export function Farm({ building, seed, timeOfDay }: FarmProps) {
  const q = useMemo(() => gerarQuinta(building, seed), [building, seed])
  const grassW = q.w + 90
  const grassD = q.d + 90

  const grass = useMemo(() => {
    const map = cloneWithRepeat(getGrassTexture(), grassW, grassD, 3)
    const normal = cloneWithRepeat(getGrassNormal(), grassW, grassD, 3)
    return { map, normal }
  }, [grassW, grassD])
  useEffect(() => () => { grass.map.dispose(); grass.normal.dispose() }, [grass])

  const rowW = q.beds[0]?.w ?? 8
  const isNight = timeOfDay === 'night'

  return (
    <group>
      {/* grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[grassW, grassD]} />
        <meshStandardMaterial map={grass.map} normalMap={grass.normal} normalScale={new THREE.Vector2(0.8, 0.8)} color="#ffffff" roughness={1} />
      </mesh>

      {/* tilled soil beds */}
      {q.beds.map((bed, i) => (
        <mesh key={i} position={[bed.x, 0.02, bed.z]} receiveShadow>
          <boxGeometry args={[bed.w, 0.06, bed.d]} />
          <meshStandardMaterial color="#5b3f28" roughness={1} />
        </mesh>
      ))}

      {/* crop rows */}
      {q.rows.length > 0 && (
        <Instances limit={q.rows.length} frustumCulled={false} castShadow>
          <boxGeometry args={[rowW - 0.6, 0.22, 0.34]} />
          <meshStandardMaterial roughness={0.85} />
          {q.rows.map((r, i) => (
            <Instance key={i} position={[r.x, 0.14, r.z]} color={cropColor(r.shade)} />
          ))}
        </Instances>
      )}

      {/* dotted plants */}
      {q.tufts.length > 0 && (
        <Instances limit={q.tufts.length} frustumCulled={false} castShadow>
          <icosahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial roughness={0.9} flatShading />
          {q.tufts.map((t, i) => (
            <Instance key={i} position={[t.x, 0.26 * t.s, t.z]} scale={[t.s, t.s * 1.3, t.s]} color={cropColor(t.shade)} />
          ))}
        </Instances>
      )}

      <Fence fence={q.fence} />
      <Trees trees={q.trees} />
      <Greenhouse gh={q.greenhouse} night={isNight} />
      <Barn barn={q.barn} />
      <Silo silo={q.silo} />
    </group>
  )
}

function Fence({ fence }: { fence: ReturnType<typeof gerarQuinta>['fence'] }) {
  const { minX, maxX, minZ, maxZ, posts } = fence
  const w = maxX - minX
  const d = maxZ - minZ
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const rails: { pos: [number, number, number]; size: [number, number, number] }[] = []
  for (const y of [0.5, 0.95]) {
    rails.push({ pos: [cx, y, minZ], size: [w, 0.06, 0.06] })
    rails.push({ pos: [cx, y, maxZ], size: [w, 0.06, 0.06] })
    rails.push({ pos: [minX, y, cz], size: [0.06, 0.06, d] })
    rails.push({ pos: [maxX, y, cz], size: [0.06, 0.06, d] })
  }
  return (
    <group>
      <Instances limit={posts.length} frustumCulled={false} castShadow>
        <boxGeometry args={[0.1, 1.1, 0.1]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.9} />
        {posts.map((p, i) => (
          <Instance key={i} position={[p.x, 0.55, p.z]} />
        ))}
      </Instances>
      {rails.map((r, i) => (
        <mesh key={i} position={r.pos}>
          <boxGeometry args={r.size} />
          <meshStandardMaterial color="#9b7a52" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

const canopy = ['#3e7a3d', '#4c8a48', '#356b36', '#578f4e']
function Trees({ trees }: { trees: { x: number; z: number; s: number }[] }) {
  if (trees.length === 0) return null
  return (
    <group>
      <Instances limit={trees.length} frustumCulled={false} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 2.2, 8]} />
        <meshStandardMaterial color="#5f4128" roughness={0.95} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 1.1 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>
      <Instances limit={trees.length} frustumCulled={false} castShadow>
        <icosahedronGeometry args={[1.9, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 3.1 * t.s, t.z]} scale={[t.s, t.s * 0.95, t.s]} color={canopy[i % canopy.length]} />
        ))}
      </Instances>
    </group>
  )
}

function Greenhouse({ gh, night }: { gh: { x: number; z: number; w: number; d: number }; night: boolean }) {
  const wallH = 2.4
  const roofH = 1.4
  const paneAngle = Math.atan2(roofH, gh.w / 2)
  const paneLen = Math.hypot(gh.w / 2, roofH)
  return (
    <group position={[gh.x, 0, gh.z]}>
      {/* concrete base */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[gh.w + 0.3, 0.16, gh.d + 0.3]} />
        <meshStandardMaterial color="#b9bcc2" roughness={0.9} />
      </mesh>
      {/* glass walls */}
      <mesh position={[0, wallH / 2 + 0.16, 0]}>
        <boxGeometry args={[gh.w, wallH, gh.d]} />
        <meshStandardMaterial color="#d3eef4" transparent opacity={0.26} roughness={0.08} metalness={0.1} envMapIntensity={1.5} />
      </mesh>
      {/* gable roof panes */}
      {([1, -1] as const).map((s) => (
        <mesh key={s} position={[(s * gh.w) / 4, wallH + 0.16 + roofH / 2, 0]} rotation={[0, 0, -s * paneAngle]}>
          <boxGeometry args={[paneLen, 0.06, gh.d]} />
          <meshStandardMaterial color="#cfeaf2" transparent opacity={0.34} roughness={0.06} metalness={0.1} emissive={night ? '#3a5a2a' : '#000000'} emissiveIntensity={night ? 0.5 : 0} />
        </mesh>
      ))}
      {/* ridge beam */}
      <mesh position={[0, wallH + 0.16 + roofH, 0]}>
        <boxGeometry args={[0.1, 0.1, gh.d]} />
        <meshStandardMaterial color="#e8eef0" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Barn({ barn }: { barn: { x: number; z: number; w: number; d: number } }) {
  const bodyH = 3
  const roofH = 1.8
  const paneAngle = Math.atan2(roofH, barn.w / 2)
  const paneLen = Math.hypot(barn.w / 2, roofH)
  return (
    <group position={[barn.x, 0, barn.z]}>
      <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[barn.w, bodyH, barn.d]} />
        <meshStandardMaterial color="#9c3a2f" roughness={0.85} />
      </mesh>
      {([1, -1] as const).map((s) => (
        <mesh key={s} position={[(s * barn.w) / 4, bodyH + roofH / 2, 0]} rotation={[0, 0, -s * paneAngle]} castShadow>
          <boxGeometry args={[paneLen, 0.16, barn.d + 0.4]} />
          <meshStandardMaterial color="#3f4650" roughness={0.8} />
        </mesh>
      ))}
      {/* big door on the +z face */}
      <mesh position={[0, 1.15, barn.d / 2 + 0.02]}>
        <boxGeometry args={[barn.w * 0.4, 2.3, 0.08]} />
        <meshStandardMaterial color="#6f2a22" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, barn.d / 2 + 0.07]}>
        <boxGeometry args={[0.12, 2.3, 0.05]} />
        <meshStandardMaterial color="#e6e0d4" roughness={0.7} />
      </mesh>
    </group>
  )
}

function Silo({ silo }: { silo: { x: number; z: number; r: number; h: number } }) {
  return (
    <group position={[silo.x, 0, silo.z]}>
      <mesh position={[0, silo.h / 2, 0]} castShadow>
        <cylinderGeometry args={[silo.r, silo.r, silo.h, 20]} />
        <meshStandardMaterial color="#d7d9dc" roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0, silo.h + silo.r * 0.4, 0]} castShadow>
        <sphereGeometry args={[silo.r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b9bcc0" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  )
}
