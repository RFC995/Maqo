import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { BuildingConfig } from '../types'
import { createRng, generateSite, type SiteLayout } from '../buildingGenerator'
import * as THREE from 'three'
import {
  getAsphaltNormal,
  getAsphaltTexture,
  getConcreteNormal,
  getConcreteTexture,
  getGrassNormal,
  getGrassTexture,
  setRepeat,
} from '../textures'
import type { TimeOfDay } from './Scene3D'

interface SiteProps {
  building: BuildingConfig
  seed: number
  timeOfDay: TimeOfDay
  minGroundHalf?: number
}

const TILE = 2.2

function cloneWithRepeat(base: ReturnType<typeof getAsphaltTexture>, width: number, depth: number, tile = TILE) {
  const texture = base.clone()
  texture.needsUpdate = true
  setRepeat(texture, Math.max(1, width / tile), Math.max(1, depth / tile))
  return texture
}

export function Site({ building, seed, timeOfDay, minGroundHalf = 0 }: SiteProps) {
  const site = useMemo(() => {
    const rng = createRng(seed * 12347 + Math.round(building.width * 3) + Math.round(building.depth * 5))
    return generateSite(building, rng)
  }, [building, seed])

  // a compact ground so the model base reads as a maquette (edge in frame),
  // still expanding when a large coverage radius needs the room
  const lawnW = Math.max(site.plotWidth + 12, minGroundHalf * 2 + 16)
  const lawnD = Math.max(site.plotDepth + 12, minGroundHalf * 2 + 16)
  const plazaW = building.width + site.walkMargin * 2
  const plazaD = building.depth + site.walkMargin * 2

  const grassMaps = useMemo(() => {
    const map = cloneWithRepeat(getGrassTexture(), lawnW, lawnD, TILE * 1.4)
    const normal = cloneWithRepeat(getGrassNormal(), lawnW, lawnD, TILE * 1.4)
    return { map, normal }
  }, [lawnW, lawnD])

  const plazaMaps = useMemo(() => {
    const map = cloneWithRepeat(getConcreteTexture(), plazaW, plazaD, TILE * 1.6)
    const normal = cloneWithRepeat(getConcreteNormal(), plazaW, plazaD, TILE * 1.6)
    return { map, normal }
  }, [plazaW, plazaD])

  const drivewayMap = useMemo(
    () => cloneWithRepeat(getAsphaltTexture(), site.driveway.width, site.driveway.depth),
    [site.driveway.width, site.driveway.depth],
  )
  const streetMaps = useMemo(() => {
    const map = cloneWithRepeat(getAsphaltTexture(), site.street.width, site.street.depth)
    const normal = cloneWithRepeat(getAsphaltNormal(), site.street.width, site.street.depth)
    return { map, normal }
  }, [site.street.width, site.street.depth])
  const parkingMap = useMemo(
    () =>
      site.parkingLot ? cloneWithRepeat(getAsphaltTexture(), site.parkingLot.width, site.parkingLot.depth) : null,
    [site.parkingLot],
  )

  const isNight = timeOfDay === 'night'
  const isDusk = timeOfDay === 'dusk'
  const lampsOn = isNight || isDusk

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[lawnW, lawnD]} />
        <meshStandardMaterial
          map={grassMaps.map}
          normalMap={grassMaps.normal}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          color="#ffffff"
          roughness={1}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[plazaW, plazaD]} />
        <meshStandardMaterial
          map={plazaMaps.map}
          normalMap={plazaMaps.normal}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          color="#ffffff"
          roughness={0.92}
          envMapIntensity={0.7}
        />
      </mesh>

      <PlazaCurb width={plazaW} depth={plazaD} />

      <mesh position={[site.driveway.x, 0.012, site.driveway.z]} receiveShadow>
        <boxGeometry args={[site.driveway.width, 0.024, site.driveway.depth]} />
        <meshStandardMaterial map={drivewayMap} color="#ffffff" roughness={0.82} envMapIntensity={0.5} />
      </mesh>

      <mesh position={[site.street.x, 0.018, site.street.z]} receiveShadow>
        <boxGeometry args={[site.street.width, 0.036, site.street.depth]} />
        <meshStandardMaterial
          map={streetMaps.map}
          normalMap={streetMaps.normal}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          color="#ffffff"
          roughness={0.78}
          envMapIntensity={0.5}
        />
      </mesh>
      <mesh position={[site.street.x, 0.04, site.street.z]}>
        <boxGeometry args={[Math.min(site.street.width, building.width + 10), 0.008, 0.14]} />
        <meshStandardMaterial color="#d8b93e" roughness={0.7} />
      </mesh>

      {[site.street.z - site.street.depth / 2 - 0.14, site.street.z + site.street.depth / 2 + 0.14].map((z, i) => (
        <mesh key={i} position={[site.street.x, 0.055, z]} castShadow receiveShadow>
          <boxGeometry args={[site.street.width, 0.11, 0.24]} />
          <meshStandardMaterial color="#a7abb2" roughness={0.85} />
        </mesh>
      ))}

      {site.parkingLot && (
        <>
          <mesh position={[site.parkingLot.x, 0.014, site.parkingLot.z]} receiveShadow>
            <boxGeometry args={[site.parkingLot.width, 0.028, site.parkingLot.depth]} />
            <meshStandardMaterial map={parkingMap} color="#ffffff" roughness={0.9} />
          </mesh>
          {site.parking.map((spot, i) => (
            <mesh key={i} position={[spot.x, 0.032, spot.z]}>
              <boxGeometry args={[0.07, 0.006, 4.2]} />
              <meshStandardMaterial color="#e8e8e4" roughness={0.7} />
            </mesh>
          ))}
        </>
      )}

      <TreeField trees={site.trees} />
      <BushField bushes={site.bushes} />
      <LampField site={site} lampsOn={lampsOn} isNight={isNight} />
    </group>
  )
}

function PlazaCurb({ width, depth }: { width: number; depth: number }) {
  const t = 0.16
  const h = 0.12
  return (
    <group>
      {[
        { pos: [0, h / 2, depth / 2 + t / 2] as const, size: [width + t * 2, h, t] as const },
        { pos: [0, h / 2, -depth / 2 - t / 2] as const, size: [width + t * 2, h, t] as const },
        { pos: [width / 2 + t / 2, h / 2, 0] as const, size: [t, h, depth] as const },
        { pos: [-width / 2 - t / 2, h / 2, 0] as const, size: [t, h, depth] as const },
      ].map((curb, i) => (
        <mesh key={i} position={curb.pos} castShadow receiveShadow>
          <boxGeometry args={curb.size} />
          <meshStandardMaterial color="#b4b8bf" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

const canopyPalette = ['#3e7a3d', '#4c8a48', '#356b36', '#578f4e', '#457f42']

function TreeField({ trees }: { trees: { x: number; y: number; z: number; scale: number }[] }) {
  const canopyColors = useMemo(
    () => trees.map((_, i) => canopyPalette[i % canopyPalette.length]),
    [trees],
  )

  return (
    <group>
      <Instances limit={trees.length || 1} frustumCulled={false} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 2.0, 8]} />
        <meshStandardMaterial color="#5f4128" roughness={0.95} />
        {trees.map((tree, i) => (
          <Instance key={i} position={[tree.x, 1.0 * tree.scale, tree.z]} scale={tree.scale} />
        ))}
      </Instances>
      <Instances limit={trees.length || 1} frustumCulled={false} castShadow>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
        {trees.map((tree, i) => (
          <Instance
            key={i}
            position={[tree.x, 2.9 * tree.scale, tree.z]}
            scale={[tree.scale * 1.05, tree.scale * 0.92, tree.scale * 1.05]}
            color={canopyColors[i]}
          />
        ))}
      </Instances>
      <Instances limit={trees.length || 1} frustumCulled={false} castShadow>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
        {trees.map((tree, i) => (
          <Instance
            key={i}
            position={[tree.x + 0.4 * tree.scale, 3.9 * tree.scale, tree.z - 0.2 * tree.scale]}
            scale={tree.scale}
            color={canopyColors[(i + 2) % canopyPalette.length]}
          />
        ))}
      </Instances>
    </group>
  )
}

function BushField({ bushes }: { bushes: { x: number; z: number; scale: number }[] }) {
  if (bushes.length === 0) return null
  return (
    <Instances limit={bushes.length} frustumCulled={false} castShadow>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial roughness={0.95} flatShading />
      {bushes.map((bush, i) => (
        <Instance
          key={i}
          position={[bush.x, 0.34 * bush.scale, bush.z]}
          scale={[bush.scale * 1.15, bush.scale * 0.75, bush.scale * 1.15]}
          color={canopyPalette[(i + 1) % canopyPalette.length]}
        />
      ))}
    </Instances>
  )
}

function LampField({ site, lampsOn, isNight }: { site: SiteLayout; lampsOn: boolean; isNight: boolean }) {
  const lightLamps = site.lamps.slice(0, 4)

  return (
    <group>
      {site.lamps.map((lamp, i) => (
        <group key={i} position={[lamp.x, 0, lamp.z]}>
          <mesh position={[0, 2.1, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 4.2, 8]} />
            <meshStandardMaterial color="#3a3e45" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 4.18, 0.45]} rotation={[Math.PI / 2 - 0.35, 0, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
            <meshStandardMaterial color="#3a3e45" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 4.32, 0.9]}>
            <boxGeometry args={[0.32, 0.12, 0.55]} />
            <meshStandardMaterial
              color={lampsOn ? '#fff2cc' : '#c9cdd4'}
              emissive={lampsOn ? '#ffdf94' : '#000000'}
              emissiveIntensity={lampsOn ? (isNight ? 2.4 : 1.2) : 0}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}

      {lampsOn &&
        lightLamps.map((lamp, i) => (
          <pointLight
            key={i}
            position={[lamp.x, 4.1, lamp.z + 0.9]}
            color="#ffd98f"
            intensity={isNight ? 26 : 8}
            distance={16}
            decay={2}
          />
        ))}
    </group>
  )
}
