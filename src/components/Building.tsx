import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { BuildingConfig, BuildingStyle, FloorSelector } from '../types'
import {
  buildingTopY,
  computeWindowDims,
  createRng,
  generateFloors,
  generateRoofEquipment,
  styleConfigs,
} from '../buildingGenerator'
import { getRoofMaps, getWallMaps } from '../textures'
import plasterUrl from '../assets/textures/painted_plaster_wall.jpg'
import concrete008Url from '../assets/textures/concrete_wall_008.jpg'
import brickUrl from '../assets/textures/red_brick_03.jpg'

// real CC0 wall photos (Polyhaven) per building style
const wallTexByStyle: Record<BuildingStyle, string> = {
  office: plasterUrl,
  industrial: concrete008Url,
  residential: brickUrl,
}

interface BuildingModelProps {
  building: BuildingConfig
  seed: number
  activeFloor: FloorSelector
  litBoost: number
}

const roughnessByKey: Record<string, number> = { smooth: 0.32, rough: 0.82 }
const wallNormalScale = new THREE.Vector2(0.5, 0.5)
const roofNormalScale = new THREE.Vector2(1.1, 1.1)

export function BuildingModel({ building, seed, activeFloor, litBoost }: BuildingModelProps) {
  const style = styleConfigs[building.style]
  const wallRoughness = roughnessByKey[style.roughness] ?? 0.5
  const dims = computeWindowDims(building, style)
  const interiorFocus = typeof activeFloor === 'number'

  const geometry = useMemo(() => {
    const rng = createRng(seed * 7919 + Math.round(building.width * 13) + Math.round(building.depth * 31) + building.floors * 97)
    const floors = generateFloors(building, style, rng)
    const topY = buildingTopY(building)
    const roof = generateRoofEquipment(building, rng, topY)
    return { floors, topY, roof }
  }, [building, style, seed])

  const frameGeom = useMemo(() => {
    const outerW = dims.w + 0.18
    const outerH = dims.h + 0.18
    const depth = 0.2
    const bar = 0.07
    const geoms = [
      new THREE.BoxGeometry(outerW, bar, depth).translate(0, outerH / 2 - bar / 2, depth / 2),
      new THREE.BoxGeometry(outerW, bar, depth).translate(0, -outerH / 2 + bar / 2, depth / 2),
      new THREE.BoxGeometry(bar, outerH - bar * 2, depth).translate(outerW / 2 - bar / 2, 0, depth / 2),
      new THREE.BoxGeometry(bar, outerH - bar * 2, depth).translate(-outerW / 2 + bar / 2, 0, depth / 2),
      new THREE.BoxGeometry(0.045, outerH - bar * 2, depth * 0.6).translate(0, 0, depth * 0.3),
      new THREE.BoxGeometry(outerW + 0.14, 0.07, 0.34).translate(0, -outerH / 2 - 0.035, 0.17),
    ]
    const merged = mergeGeometries(geoms)
    geoms.forEach((g) => g.dispose())
    return merged
  }, [dims.w, dims.h])
  const glassGeom = useMemo(() => {
    const g = new THREE.BoxGeometry(dims.w, dims.h, 0.03)
    g.translate(0, 0, 0.045)
    return g
  }, [dims.w, dims.h])
  const ledgeGeom = useMemo(() => {
    const g = new THREE.BoxGeometry(dims.w + 0.5, 0.09, 0.6)
    g.translate(0, 0, 0.33)
    return g
  }, [dims.w])
  const railGeom = useMemo(() => {
    const g = new THREE.BoxGeometry(dims.w + 0.5, 0.55, 0.035)
    g.translate(0, 0.32, 0.62)
    return g
  }, [dims.w])

  const halfW = building.width / 2
  const halfD = building.depth / 2

  const wallReal = useLoader(THREE.TextureLoader, wallTexByStyle[building.style])
  const wallMaps = useMemo(() => {
    const rx = Math.max(1, building.width / 3.6)
    const ry = Math.max(1, building.floorHeight / 2.6)
    const map = wallReal.clone()
    map.needsUpdate = true
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.colorSpace = THREE.SRGBColorSpace
    map.repeat.set(rx, ry)
    const normal = getWallMaps(rx, ry).normal
    return { map, normal }
  }, [wallReal, building.width, building.floorHeight])

  // flat roofs are commonly ballasted with gravel — the "roof" photo set is
  // the closest real-material match to the old procedural gravel texture
  const roofMaps = useMemo(() => {
    const rx = Math.max(1, building.width / 5)
    const ry = Math.max(1, building.depth / 5)
    return getRoofMaps(rx, ry)
  }, [building.width, building.depth])

  return (
    <group>
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[building.width + 1, 0.18, building.depth + 1]} />
        <meshStandardMaterial color={style.plinthColor} roughness={0.85} />
      </mesh>

      {geometry.floors.map((floor) => {
        const dimmed = interiorFocus && floor.index > (activeFloor as number)
        const opacity = dimmed ? 0.08 : 1
        // near-white so the real wall photo shows at its true colour, with a
        // hair of floor-to-floor banding rather than the old flat style colour
        const wallColor = floor.index % 2 === 0 ? '#efede7' : '#e6e4dd'

        const isOpenFloor = interiorFocus && floor.index === (activeFloor as number)
        const wallT = 0.3

        return (
          <group key={floor.index}>
            {isOpenFloor ? (
              <>
                {[
                  { pos: [0, 0, building.depth / 2 - wallT / 2] as const, size: [building.width, building.floorHeight - 0.06, wallT] as const },
                  { pos: [0, 0, -building.depth / 2 + wallT / 2] as const, size: [building.width, building.floorHeight - 0.06, wallT] as const },
                  { pos: [building.width / 2 - wallT / 2, 0, 0] as const, size: [wallT, building.floorHeight - 0.06, building.depth - wallT * 2] as const },
                  { pos: [-building.width / 2 + wallT / 2, 0, 0] as const, size: [wallT, building.floorHeight - 0.06, building.depth - wallT * 2] as const },
                ].map((wall, i) => (
                  <mesh
                    key={i}
                    position={[wall.pos[0], floor.y0 + building.floorHeight / 2, wall.pos[2]]}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={wall.size} />
                    <meshStandardMaterial
                      map={wallMaps.map}
                      normalMap={wallMaps.normal}
                      normalScale={wallNormalScale}
                      color={wallColor}
                      roughness={wallRoughness}
                      metalness={0.05}
                      envMapIntensity={0.9}
                    />
                  </mesh>
                ))}
              </>
            ) : (
              <mesh
                position={[0, floor.y0 + building.floorHeight / 2, 0]}
                castShadow={!dimmed}
                receiveShadow
              >
                <boxGeometry args={[building.width, building.floorHeight - 0.06, building.depth]} />
                <meshStandardMaterial
                  key={`wall-${dimmed}`}
                  map={wallMaps.map}
                  normalMap={wallMaps.normal}
                  normalScale={wallNormalScale}
                  color={wallColor}
                  roughness={wallRoughness}
                  metalness={0.05}
                  envMapIntensity={0.9}
                  transparent={dimmed}
                  opacity={opacity}
                  depthWrite={!dimmed}
                />
              </mesh>
            )}

            {floor.index > 0 && (
              <mesh position={[0, floor.y0 - 0.02, 0]} castShadow={!dimmed} receiveShadow>
                <boxGeometry args={[building.width + 0.14, 0.42, building.depth + 0.14]} />
                <meshStandardMaterial
                  key={`spandrel-${dimmed}`}
                  color={style.parapetColor}
                  roughness={0.75}
                  metalness={0.1}
                  transparent={dimmed}
                  opacity={opacity}
                  depthWrite={!dimmed}
                />
              </mesh>
            )}

            <Instances geometry={frameGeom} limit={floor.facade.frame.length || 1} frustumCulled={false}>
              <meshStandardMaterial
                key={`frame-${dimmed}`}
                color={style.frameColor}
                roughness={0.42}
                metalness={0.6}
                envMapIntensity={1.1}
                transparent={dimmed}
                opacity={opacity}
                depthWrite={!dimmed}
              />
              {floor.facade.frame.map((slot, i) => (
                <Instance key={i} position={[slot.x, slot.y, slot.z]} rotation={[0, slot.rotY, 0]} />
              ))}
            </Instances>

            <Instances geometry={glassGeom} limit={floor.facade.unlit.length || 1} frustumCulled={false}>
              <meshPhysicalMaterial
                key={`glass-${dimmed}`}
                color={style.glassColorDay}
                roughness={0.03}
                metalness={0}
                ior={1.5}
                reflectivity={0.9}
                clearcoat={1}
                clearcoatRoughness={0.04}
                envMapIntensity={3.2}
                specularIntensity={1}
                transparent={dimmed}
                opacity={opacity}
                depthWrite={!dimmed}
              />
              {floor.facade.unlit.map((slot, i) => (
                <Instance key={i} position={[slot.x, slot.y, slot.z]} rotation={[0, slot.rotY, 0]} />
              ))}
            </Instances>

            <Instances geometry={glassGeom} limit={floor.facade.lit.length || 1} frustumCulled={false}>
              <meshStandardMaterial
                key={`lit-${dimmed}`}
                color={style.glassColorLit}
                emissive={style.glassColorLit}
                emissiveIntensity={dimmed ? 0 : litBoost}
                roughness={0.2}
                metalness={0.1}
                transparent={dimmed}
                opacity={opacity}
                depthWrite={!dimmed}
              />
              {floor.facade.lit.map((slot, i) => (
                <Instance key={i} position={[slot.x, slot.y, slot.z]} rotation={[0, slot.rotY, 0]} />
              ))}
            </Instances>

            {style.balconies && floor.facade.balcony.length > 0 && (
              <>
                <Instances geometry={ledgeGeom} limit={floor.facade.balcony.length || 1} frustumCulled={false}>
                  <meshStandardMaterial
                    key={`ledge-${dimmed}`}
                    color={style.plinthColor}
                    roughness={0.8}
                    transparent={dimmed}
                    opacity={opacity}
                  />
                  {floor.facade.balcony.map((slot, i) => (
                    <Instance key={i} position={[slot.x, slot.y, slot.z]} rotation={[0, slot.rotY, 0]} />
                  ))}
                </Instances>
                <Instances geometry={railGeom} limit={floor.facade.balcony.length || 1} frustumCulled={false}>
                  <meshStandardMaterial
                    color={style.frameColor}
                    roughness={0.5}
                    metalness={0.4}
                    transparent
                    opacity={dimmed ? 0.14 : 0.85}
                  />
                  {floor.facade.balcony.map((slot, i) => (
                    <Instance key={i} position={[slot.x, slot.y, slot.z]} rotation={[0, slot.rotY, 0]} />
                  ))}
                </Instances>
              </>
            )}
          </group>
        )
      })}

      <group visible={!interiorFocus}>
        <mesh position={[0, geometry.topY + 0.12, 0]} receiveShadow>
          <boxGeometry args={[building.width, 0.24, building.depth]} />
          <meshStandardMaterial
            map={roofMaps.map}
            normalMap={roofMaps.normal}
            normalScale={roofNormalScale}
            color="#c8ccd4"
            roughness={0.98}
          />
        </mesh>

        {[
          { pos: [0, geometry.topY + 0.55, halfD - 0.1] as const, size: [building.width, 0.55, 0.2] as const },
          { pos: [0, geometry.topY + 0.55, -halfD + 0.1] as const, size: [building.width, 0.55, 0.2] as const },
          { pos: [halfW - 0.1, geometry.topY + 0.55, 0] as const, size: [0.2, 0.55, building.depth] as const },
          { pos: [-halfW + 0.1, geometry.topY + 0.55, 0] as const, size: [0.2, 0.55, building.depth] as const },
        ].map((wall, i) => (
          <mesh key={i} position={wall.pos} castShadow={!interiorFocus} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color={style.parapetColor} roughness={0.85} />
          </mesh>
        ))}

        {geometry.roof.hvac.map((unit, i) => (
          <mesh key={i} position={[unit.pos.x, unit.pos.y, unit.pos.z]} castShadow={!interiorFocus} receiveShadow>
            <boxGeometry args={[unit.size.x, unit.size.y, unit.size.z]} />
            <meshStandardMaterial color="#8b95a3" roughness={0.6} metalness={0.35} />
          </mesh>
        ))}

        {geometry.roof.hatch && (
          <mesh
            position={[geometry.roof.hatch.pos.x, geometry.roof.hatch.pos.y, geometry.roof.hatch.pos.z]}
            castShadow={!interiorFocus}
            receiveShadow
          >
            <boxGeometry args={[geometry.roof.hatch.size.x, geometry.roof.hatch.size.y, geometry.roof.hatch.size.z]} />
            <meshStandardMaterial color={style.parapetColor} roughness={0.7} />
          </mesh>
        )}

        {geometry.roof.pipes.map((pipe, i) => (
          <mesh key={i} position={[pipe.pos.x, pipe.pos.y + pipe.height / 2, pipe.pos.z]} castShadow={!interiorFocus}>
            <cylinderGeometry args={[0.09, 0.09, pipe.height, 10]} />
            <meshStandardMaterial color="#b8c0cc" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}

        <RoofMast x={-halfW + 1.6} z={-halfD + 1.6} topY={geometry.topY} />
      </group>

      <EntranceDetail building={building} style={style} />
    </group>
  )
}

function RoofMast({ x, z, topY }: { x: number; z: number; topY: number }) {
  const mastH = 3.4
  return (
    <group position={[x, topY + 0.24, z]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.7, 0.24, 0.7]} />
        <meshStandardMaterial color="#6a7280" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, mastH / 2 + 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, mastH, 8]} />
        <meshStandardMaterial color="#9aa2ae" roughness={0.4} metalness={0.7} />
      </mesh>
      {[0.55, 0.75].map((frac, i) => (
        <mesh key={i} position={[0, 0.24 + mastH * frac, 0]} castShadow>
          <boxGeometry args={[0.08, 0.62, 0.08]} />
          <meshStandardMaterial color="#dfe3e8" roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, mastH + 0.34, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function EntranceDetail({
  building,
  style,
}: {
  building: BuildingConfig
  style: (typeof styleConfigs)['office']
}) {
  const halfD = building.depth / 2
  const doorW = style.entranceWidth * 0.62
  const doorH = building.floorHeight * 0.82

  return (
    <group position={[0, 0, halfD]}>
      <mesh position={[0, doorH / 2, 0.06]} castShadow>
        <boxGeometry args={[doorW, doorH, 0.06]} />
        <meshPhysicalMaterial
          color={style.glassColorDay}
          roughness={0.08}
          metalness={0.15}
          clearcoat={1}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, doorH + 0.32, 0.75]} castShadow receiveShadow>
        <boxGeometry args={[style.entranceWidth + 1.6, 0.14, 1.7]} />
        <meshStandardMaterial color={style.frameColor} roughness={0.5} metalness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(style.entranceWidth / 2 + 0.7) * side, doorH / 2 + 0.16, 0.75]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, doorH + 0.32, 8]} />
          <meshStandardMaterial color={style.frameColor} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 1.1]} receiveShadow>
        <boxGeometry args={[doorW + 1.4, 0.08, 2.1]} />
        <meshStandardMaterial color="#c7c3bb" roughness={0.9} />
      </mesh>
    </group>
  )
}
