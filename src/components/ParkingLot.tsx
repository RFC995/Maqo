import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import type { BuildingConfig, DeviceItem } from '../types'
import { gerarParque, pointInBay, BAY_W, BAY_D, type Bay } from '../parkingGenerator'
import { sensorReading } from '../telemetry'
import {
  getAsphaltNormal,
  getAsphaltTexture,
  getGrassNormal,
  getGrassTexture,
  setRepeat,
} from '../textures'
import type { TimeOfDay } from './Scene3D'

interface ParkingLotProps {
  building: BuildingConfig
  seed: number
  timeOfDay: TimeOfDay
  devices: DeviceItem[]
  telemetryTick: number
}

const carColors = ['#d7dbe0', '#f4f5f7', '#1c2128', '#3b6db3', '#b23b3b', '#8a9099', '#2f6f52', '#c9a13b']

function cloneWithRepeat(base: ReturnType<typeof getAsphaltTexture>, width: number, depth: number, tile: number) {
  const texture = base.clone()
  texture.needsUpdate = true
  setRepeat(texture, Math.max(1, width / tile), Math.max(1, depth / tile))
  return texture
}

/**
 * The Smart Parking world: a surface car park drawn from the same procedural
 * layout the RF planner and the seeded deployment use. Occupied bays get an
 * instanced car; a bay watched by a placed occupancy/distance sensor flips
 * live with the telemetry tick and shows a free/occupied status tile.
 */
export function ParkingLot({ building, seed, timeOfDay, devices, telemetryTick }: ParkingLotProps) {
  const layout = useMemo(() => gerarParque(building, seed), [building, seed])

  const lotW = building.width
  const lotD = building.depth
  const grassW = lotW + 90
  const grassD = lotD + 90

  const asphaltMaps = useMemo(() => {
    const map = cloneWithRepeat(getAsphaltTexture(), lotW, lotD, 2.4)
    const normal = cloneWithRepeat(getAsphaltNormal(), lotW, lotD, 2.4)
    return { map, normal }
  }, [lotW, lotD])

  const grassMaps = useMemo(() => {
    const map = cloneWithRepeat(getGrassTexture(), grassW, grassD, 3.1)
    const normal = cloneWithRepeat(getGrassNormal(), grassW, grassD, 3.1)
    return { map, normal }
  }, [grassW, grassD])

  useEffect(
    () => () => {
      asphaltMaps.map.dispose()
      asphaltMaps.normal.dispose()
      grassMaps.map.dispose()
      grassMaps.normal.dispose()
    },
    [asphaltMaps, grassMaps],
  )

  // which bays a sensor is watching, and whether each bay is occupied right now
  const estado = useMemo(() => {
    const watchers: { bay: Bay; sensorId: string }[] = []
    const sensors = devices.filter((d) => d.mount === 'ground' && d.type === 'sensor')
    for (const bay of layout.bays) {
      const watcher = sensors.find((s) => pointInBay(bay, s.x, s.z))
      if (watcher) watchers.push({ bay, sensorId: watcher.id })
    }
    return { watchers }
  }, [devices, layout.bays])

  const bayStatus = useMemo(() => {
    const watched = new Map(estado.watchers.map((w) => [w.bay, w.sensorId]))
    return layout.bays.map((bay) => {
      const sensorId = watched.get(bay)
      if (sensorId) {
        const dist = sensorReading('distancia', sensorId, telemetryTick) ?? 999
        return { bay, occupied: dist < 120, sensored: true }
      }
      return { bay, occupied: bay.ocupadoBase, sensored: false }
    })
  }, [layout.bays, estado.watchers, telemetryTick])

  const occupied = bayStatus.filter((b) => b.occupied)
  const isNight = timeOfDay === 'night'
  const lampsOn = isNight || timeOfDay === 'dusk'

  return (
    <group>
      {/* grass surround */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[grassW, grassD]} />
        <meshStandardMaterial
          map={grassMaps.map}
          normalMap={grassMaps.normal}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          color="#ffffff"
          roughness={1}
        />
      </mesh>

      {/* asphalt lot */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[lotW, 0.05, lotD]} />
        <meshStandardMaterial
          map={asphaltMaps.map}
          normalMap={asphaltMaps.normal}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          color="#ffffff"
          roughness={0.85}
          envMapIntensity={0.5}
        />
      </mesh>

      <LotCurb width={lotW} depth={lotD} />

      {/* bay side stripes */}
      <Instances limit={layout.bays.length} frustumCulled={false}>
        <boxGeometry args={[0.08, 0.01, BAY_D * 0.92]} />
        <meshStandardMaterial color="#e9e9e4" roughness={0.6} />
        {layout.bays.map((bay, i) => (
          <Instance key={i} position={[bay.x - BAY_W / 2, 0.05, bay.z]} />
        ))}
      </Instances>
      {/* closing stripe on the last column of each row */}
      <Instances limit={layout.bays.length} frustumCulled={false}>
        <boxGeometry args={[0.08, 0.01, BAY_D * 0.92]} />
        <meshStandardMaterial color="#e9e9e4" roughness={0.6} />
        {layout.bays.map((bay, i) => (
          <Instance key={i} position={[bay.x + BAY_W / 2, 0.05, bay.z]} />
        ))}
      </Instances>

      {/* live status tiles under sensored bays */}
      {bayStatus
        .filter((b) => b.sensored)
        .map((b, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[b.bay.x, 0.055, b.bay.z]}>
            <planeGeometry args={[BAY_W * 0.82, BAY_D * 0.82]} />
            <meshBasicMaterial
              color={b.occupied ? '#ef4444' : '#22c55e'}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* parked cars */}
      {occupied.length > 0 && <Carros bays={occupied.map((b) => b.bay)} night={isNight} />}

      {/* light poles */}
      {layout.lamps.map((lamp, i) => (
        <LampPole key={i} x={lamp.x} z={lamp.z} on={lampsOn} night={isNight} />
      ))}

      <EntranceBarrier x={layout.entrance.x} z={layout.entrance.z} />
    </group>
  )
}

function LotCurb({ width, depth }: { width: number; depth: number }) {
  const t = 0.2
  const h = 0.14
  const parts = [
    { pos: [0, h / 2, depth / 2 + t / 2] as const, size: [width + t * 2, h, t] as const },
    { pos: [0, h / 2, -depth / 2 - t / 2] as const, size: [width + t * 2, h, t] as const },
    { pos: [width / 2 + t / 2, h / 2, 0] as const, size: [t, h, depth] as const },
    { pos: [-width / 2 - t / 2, h / 2, 0] as const, size: [t, h, depth] as const },
  ]
  return (
    <group>
      {parts.map((c, i) => (
        <mesh key={i} position={c.pos} castShadow receiveShadow>
          <boxGeometry args={c.size} />
          <meshStandardMaterial color="#b4b8bf" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function LampPole({ x, z, on, night }: { x: number; z: number; on: boolean; night: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 4.8, 8]} />
        <meshStandardMaterial color="#3a3e45" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 4.85, 0]}>
        <boxGeometry args={[0.5, 0.14, 0.34]} />
        <meshStandardMaterial
          color={on ? '#fff2cc' : '#c9cdd4'}
          emissive={on ? '#ffdf94' : '#000000'}
          emissiveIntensity={on ? (night ? 2.4 : 1.1) : 0}
          roughness={0.4}
        />
      </mesh>
      {on && night && <pointLight position={[0, 4.7, 0]} color="#ffd98f" intensity={20} distance={16} decay={2} />}
    </group>
  )
}

function EntranceBarrier({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.18, 1, 0.18]} />
        <meshStandardMaterial color="#d9d9de" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[1.7, 1, 0]} castShadow rotation={[0, 0, 0]}>
        <boxGeometry args={[3.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#e14b4b" emissive="#5a1010" emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- cars ----- */

/** Rotate a local offset (length along Z, width along X) into world space by the bay heading. */
function rodarXZ(lx: number, lz: number, ang: number): [number, number] {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  return [lx * c + lz * s, -lx * s + lz * c]
}

/** stable 0..1 from two ints, to vary colour/size per car without randomness re-rolling each frame */
function hash2(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/**
 * A proper low-poly car: the side silhouette (bonnet, raked windscreen, roof,
 * boot) is a 2D profile extruded to the car width and rounded at the edges, then
 * dressed with dark glass, four wheels and lit head/tail lamps. One geometry per
 * part, drawn with instancing, so the whole car park is a handful of draw calls.
 */
function Carros({ bays, night }: { bays: Bay[]; night: boolean }) {
  const geoms = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-2.1, 0.36)
    s.lineTo(-2.12, 0.62)
    s.lineTo(-1.68, 0.76) // bonnet front
    s.lineTo(-0.66, 0.82) // bonnet base
    s.lineTo(-0.24, 1.3) // windscreen top
    s.lineTo(0.72, 1.33) // roof rear
    s.lineTo(1.12, 0.92) // rear screen
    s.lineTo(2.0, 0.82) // boot
    s.lineTo(2.12, 0.6)
    s.lineTo(2.1, 0.36)
    s.closePath()
    const body = new THREE.ExtrudeGeometry(s, {
      depth: 1.78,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 2,
      steps: 1,
    })
    body.translate(0, 0, -0.89) // centre on width
    body.rotateY(Math.PI / 2) // length runs along Z, width along X
    body.computeVertexNormals()

    const wheel = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 20)
    wheel.rotateZ(Math.PI / 2) // spin axis along X (car width)

    return {
      body,
      wheel,
      glass: new THREE.BoxGeometry(1.5, 0.44, 1.78),
      lamp: new THREE.BoxGeometry(0.32, 0.15, 0.07),
    }
  }, [])

  useEffect(
    () => () => Object.values(geoms).forEach((g) => g.dispose()),
    [geoms],
  )

  const mats = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.34, envMapIntensity: 1.3 }),
      glass: new THREE.MeshStandardMaterial({
        color: '#0a0e15',
        metalness: 0.9,
        roughness: 0.08,
        envMapIntensity: 1.8,
      }),
      wheel: new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.85, metalness: 0.1 }),
      head: new THREE.MeshStandardMaterial({
        color: '#fff7e0',
        emissive: '#fff0c0',
        emissiveIntensity: night ? 1.7 : 0.25,
        roughness: 0.3,
      }),
      tail: new THREE.MeshStandardMaterial({
        color: '#e01f1f',
        emissive: '#c21414',
        emissiveIntensity: night ? 2.2 : 0.5,
        roughness: 0.4,
      }),
    }
  }, [night])

  useEffect(
    () => () => Object.values(mats).forEach((m) => m.dispose()),
    [mats],
  )

  // build per-instance transforms once per bay set
  const t = useMemo(() => {
    const body: Transform[] = []
    const glass: Transform[] = []
    const wheels: Transform[] = []
    const heads: Transform[] = []
    const tails: Transform[] = []

    for (const bay of bays) {
      const a = bay.rotY
      const scale = 0.95 + hash2(bay.row, bay.col) * 0.12
      const cor = new THREE.Color(carColors[(bay.row * 7 + bay.col * 3) % carColors.length])
      body.push({ pos: [bay.x, 0.02, bay.z], rotY: a, scale, color: cor })
      glass.push({ pos: [bay.x, 1.02, bay.z], rotY: a, scale })

      for (const [lx, lz] of [
        [0.86, 1.32],
        [-0.86, 1.32],
        [0.86, -1.32],
        [-0.86, -1.32],
      ] as [number, number][]) {
        const [dx, dz] = rodarXZ(lx * scale, lz * scale, a)
        wheels.push({ pos: [bay.x + dx, 0.35, bay.z + dz], rotY: a, scale })
      }
      for (const lx of [0.55, -0.55]) {
        const [hx, hz] = rodarXZ(lx * scale, 2.02 * scale, a)
        heads.push({ pos: [bay.x + hx, 0.66, bay.z + hz], rotY: a, scale })
        const [tx, tz] = rodarXZ(lx * scale, -2.02 * scale, a)
        tails.push({ pos: [bay.x + tx, 0.68, bay.z + tz], rotY: a, scale })
      }
    }
    return { body, glass, wheels, heads, tails }
  }, [bays])

  return (
    <group>
      <ParteInstanciada geometry={geoms.body} material={mats.body} transforms={t.body} castShadow />
      <ParteInstanciada geometry={geoms.glass} material={mats.glass} transforms={t.glass} />
      <ParteInstanciada geometry={geoms.wheel} material={mats.wheel} transforms={t.wheels} />
      <ParteInstanciada geometry={geoms.lamp} material={mats.head} transforms={t.heads} />
      <ParteInstanciada geometry={geoms.lamp} material={mats.tail} transforms={t.tails} />
    </group>
  )
}

interface Transform {
  pos: [number, number, number]
  rotY: number
  scale: number
  color?: THREE.Color
}

/** One instanced-mesh part, positioned/rotated/scaled (and optionally coloured) per instance. */
function ParteInstanciada({
  geometry,
  material,
  transforms,
  castShadow,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  transforms: Transform[]
  castShadow?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const sc = new THREE.Vector3()
    let temCor = false
    transforms.forEach((tr, i) => {
      e.set(0, tr.rotY, 0)
      q.setFromEuler(e)
      p.set(tr.pos[0], tr.pos[1], tr.pos[2])
      sc.setScalar(tr.scale)
      m.compose(p, q, sc)
      mesh.setMatrixAt(i, m)
      if (tr.color) {
        mesh.setColorAt(i, tr.color)
        temCor = true
      }
    })
    mesh.instanceMatrix.needsUpdate = true
    if (temCor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [transforms])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={castShadow}
    />
  )
}
