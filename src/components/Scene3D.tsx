import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Sky, Stars, ContactShadows, Environment, Lightformer, SoftShadows } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  N8AO,
  ToneMapping,
  Vignette,

  BrightnessContrast,
  HueSaturation,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { BuildingConfig, DeviceItem, FloorSelector } from '../types'
import { buildingTopY, computePlotSize } from '../buildingGenerator'
import type { Room, SensorSource } from '../rooms'
import { BuildingModel } from './Building'
import { Site } from './Site'
import { DeviceMarkers } from './DeviceMarkers'
import { defaultPropagation as defaultPropagationRf, type Propagation } from '../rf'
import { InteriorFloor } from './Interior'
import { perfisDeQualidade, type PerfilQualidade, type Qualidade } from '../qualidade'
import { registarCaptura } from '../captura'
import { calcularMapaCalor, desenharMapaCalor } from '../heatmap'

export type TimeOfDay = 'day' | 'dusk' | 'night'

interface Scene3DProps {
  building: BuildingConfig
  seed: number
  devices: DeviceItem[]
  selectedDeviceId: string | null
  activeFloor: FloorSelector
  timeOfDay: TimeOfDay
  qualidade?: Qualidade
  mapaCalorVisivel?: boolean
  placementMode: boolean
  coverageVisible: boolean
  propagation?: Propagation
  coverageOpacity: number
  labelsVisible: boolean
  resetSignal: number
  rooms: Room[]
  telemetryTick: number
  sensorsByRoom: Map<string, SensorSource[]>
  onSelectDevice: (id: string | null) => void
  onPlaceInterior: (floor: number, x: number, z: number) => void
  onPlaceRoof: (x: number, z: number) => void
  onPlaceGround: (x: number, z: number) => void
}

const lightPresets: Record<
  TimeOfDay,
  {
    sun: [number, number, number]
    sunColor: string
    sunIntensity: number
    ambient: number
    hemiSky: string
    hemiGround: string
    hemiIntensity: number
    fog: string
    fogNear: number
    fogFar: number
    background: string
    litBoost: number
    showSky: boolean
    showStars: boolean
    skyTurbidity: number
    skyRayleigh: number
    skyMieCoefficient: number
    skyMieDirectionalG: number
    bloomIntensity: number
    bloomThreshold: number
    aoIntensity: number
    grade: { saturation: number; brightness: number; contrast: number }
  }
> = {
  day: {
    sun: [52, 46, 30],
    sunColor: '#fff3dd',
    sunIntensity: 1.7,
    ambient: 0.55,
    hemiSky: '#cfe8ff',
    hemiGround: '#8fae74',
    hemiIntensity: 0.65,
    fog: '#cfe3f0',
    fogNear: 90,
    fogFar: 320,
    background: '#bcdcf2',
    litBoost: 0.15,
    showSky: true,
    showStars: false,
    skyTurbidity: 2.4,
    skyRayleigh: 1,
    skyMieCoefficient: 0.0028,
    skyMieDirectionalG: 0.82,
    bloomIntensity: 0.28,
    bloomThreshold: 0.86,
    aoIntensity: 2,
    grade: { saturation: 0.12, brightness: 0.01, contrast: 0.08 },
  },
  dusk: {
    sun: [-55, 18, -30],
    sunColor: '#ffb877',
    sunIntensity: 1.1,
    ambient: 0.32,
    hemiSky: '#7a6ba8',
    hemiGround: '#4a3b52',
    hemiIntensity: 0.45,
    fog: '#caa598',
    fogNear: 60,
    fogFar: 260,
    background: '#e2a179',
    litBoost: 0.85,
    showSky: true,
    showStars: false,
    skyTurbidity: 6,
    skyRayleigh: 2.4,
    skyMieCoefficient: 0.018,
    skyMieDirectionalG: 0.93,
    bloomIntensity: 0.55,
    bloomThreshold: 0.6,
    aoIntensity: 2.2,
    grade: { saturation: 0.18, brightness: 0.0, contrast: 0.1 },
  },
  night: {
    sun: [-40, 30, -20],
    sunColor: '#93a9d8',
    sunIntensity: 0.22,
    ambient: 0.1,
    hemiSky: '#1a2340',
    hemiGround: '#05070f',
    hemiIntensity: 0.28,
    fog: '#050810',
    fogNear: 40,
    fogFar: 240,
    background: '#050810',
    litBoost: 1.6,
    showSky: false,
    showStars: true,
    skyTurbidity: 2,
    skyRayleigh: 1,
    skyMieCoefficient: 0.003,
    skyMieDirectionalG: 0.8,
    bloomIntensity: 1.15,
    bloomThreshold: 0.22,
    aoIntensity: 2.6,
    grade: { saturation: 0.14, brightness: 0.01, contrast: 0.12 },
  },
}

type CameraFraming = { position: [number, number, number]; target: [number, number, number] }

function computeHome(building: BuildingConfig): CameraFraming {
  const size = Math.max(building.width, building.depth)
  const height = buildingTopY(building)
  const dist = size * 1.05 + height * 0.55 + 20
  return {
    position: [dist * 0.6, height * 0.5 + dist * 0.36, dist * 0.7],
    target: [0, height * 0.3, 0],
  }
}

function computeFloorFraming(building: BuildingConfig, activeFloor: FloorSelector): CameraFraming {
  if (activeFloor === 'all') return computeHome(building)

  const size = Math.max(building.width, building.depth)

  if (activeFloor === 'ground') {
    const { plotWidth, plotDepth } = computePlotSize(building)
    const plotSize = Math.max(plotWidth, plotDepth)
    const dist = plotSize * 0.6
    return {
      position: [dist * 0.56, dist * 0.5, dist * 0.64],
      target: [0, 0.3, 0],
    }
  }

  if (activeFloor === 'roof') {
    const topY = buildingTopY(building)
    const dist = size * 0.95 + 16
    return {
      position: [dist * 0.34, topY + dist * 0.82, dist * 0.36],
      target: [0, topY, 0],
    }
  }

  const floorY = activeFloor * building.floorHeight + building.floorHeight * 0.5
  const dist = size * 0.82 + 12
  return {
    position: [dist * 0.58, floorY + dist * 0.46, dist * 0.66],
    target: [0, floorY, 0],
  }
}

function CameraRig({
  building,
  activeFloor,
  resetSignal,
}: {
  building: BuildingConfig
  activeFloor: FloorSelector
  resetSignal: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const desiredPosition = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const initialized = useRef(false)
  const animating = useRef(false)
  const home = useMemo(() => computeHome(building), [building])

  useEffect(() => {
    const framing = computeFloorFraming(building, activeFloor)
    desiredPosition.current.set(...framing.position)
    desiredTarget.current.set(...framing.target)

    if (!initialized.current) {
      initialized.current = true
      camera.position.copy(desiredPosition.current)
      controlsRef.current?.target.copy(desiredTarget.current)
      controlsRef.current?.update()
    } else {
      // begin a fresh fly-to; user interaction will cancel it
      animating.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, activeFloor, resetSignal])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || !animating.current) return
    const posDist = camera.position.distanceTo(desiredPosition.current)
    const targetDist = controls.target.distanceTo(desiredTarget.current)
    if (posDist < 0.05 && targetDist < 0.05) {
      animating.current = false
      return
    }
    const smoothing = 1 - Math.pow(0.0015, delta)
    camera.position.lerp(desiredPosition.current, smoothing)
    controls.target.lerp(desiredTarget.current, smoothing)
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      zoomSpeed={1.15}
      minDistance={2.5}
      maxDistance={home.position[0] * 5 + 120}
      maxPolarAngle={Math.PI / 2.04}
      onStart={() => {
        // any manual interaction cancels the auto fly-to so the user keeps control
        animating.current = false
      }}
    />
  )
}

export function Scene3D({
  building,
  seed,
  devices,
  selectedDeviceId,
  activeFloor,
  timeOfDay,
  qualidade = 'equilibrado',
  mapaCalorVisivel = false,
  placementMode,
  coverageVisible,
  propagation,
  coverageOpacity,
  labelsVisible,
  resetSignal,
  rooms,
  telemetryTick,
  sensorsByRoom,
  onSelectDevice,
  onPlaceInterior,
  onPlaceRoof,
  onPlaceGround,
}: Scene3DProps) {
  const preset = lightPresets[timeOfDay]
  const perfil = perfisDeQualidade[qualidade]
  const maxCoverageRadius = devices.reduce(
    (acc, d) => (d.type === 'gateway' || d.type === 'repeater' ? Math.max(acc, d.radius) : acc),
    0,
  )

  const shadowSpan = Math.max(building.width, building.depth) * 1.6 + 30

  return (
    <Canvas
      flat
      shadows
      dpr={perfil.dpr}
      // preserveDrawingBuffer keeps the frame readable for the report snapshot
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05
      }}
      onPointerMissed={() => onSelectDevice(null)}
    >
      <color attach="background" args={[preset.background]} />
      <fog attach="fog" args={[preset.fog, preset.fogNear, preset.fogFar]} />

      {perfil.softShadows !== null && <SoftShadows size={26} samples={perfil.softShadows} focus={0.35} />}

      <hemisphereLight args={[preset.hemiSky, preset.hemiGround, preset.hemiIntensity]} />
      <ambientLight intensity={preset.ambient} />
      {/* Shadow map at 2048 rather than 4096: a quarter of the memory and a far
          faster first shadow pass, with no visible difference at this scale. */}
      <directionalLight
        position={preset.sun}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        castShadow
        shadow-mapSize={[perfil.sombras, perfil.sombras]}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={shadowSpan}
        shadow-camera-bottom={-shadowSpan}
        shadow-camera-far={shadowSpan * 4}
        shadow-bias={-0.00015}
        shadow-normalBias={0.025}
      />

      {timeOfDay === 'night' && (
        <pointLight position={[0, 3.4, building.depth / 2 + 2.2]} color="#ffdca0" intensity={12} distance={9} decay={2} />
      )}

      {preset.showSky && (
        <Sky
          sunPosition={preset.sun}
          turbidity={preset.skyTurbidity}
          rayleigh={preset.skyRayleigh}
          mieCoefficient={preset.skyMieCoefficient}
          mieDirectionalG={preset.skyMieDirectionalG}
        />
      )}
      {preset.showStars && perfil.estrelas && <Stars radius={200} depth={60} count={2600} factor={3.4} fade speed={0.4} />}

      <SceneEnvironment timeOfDay={timeOfDay} preset={preset} sun={preset.sun} />

      <Site building={building} seed={seed} timeOfDay={timeOfDay} minGroundHalf={maxCoverageRadius * 1.15} />
      <BuildingModel building={building} seed={seed} activeFloor={activeFloor} litBoost={preset.litBoost} />
      {typeof activeFloor === 'number' && (
        <InteriorFloor
          building={building}
          floorIndex={activeFloor}
          rooms={rooms}
          telemetryTick={telemetryTick}
          labelsVisible={labelsVisible}
          sensorsByRoom={sensorsByRoom}
        />
      )}
      <DeviceMarkers
        devices={devices}
        building={building}
        selectedId={selectedDeviceId}
        visibleFloor={activeFloor === 'roof' || activeFloor === 'ground' ? activeFloor : typeof activeFloor === 'number' ? activeFloor : 'all'}
        coverageVisible={coverageVisible}
        propagation={propagation}
        coverageOpacity={coverageOpacity}
        labelsVisible={labelsVisible}
        onSelect={onSelectDevice}
      />

      <PlacementSurfaces
        building={building}
        activeFloor={activeFloor}
        placementMode={placementMode}
        onPlaceInterior={onPlaceInterior}
        onPlaceRoof={onPlaceRoof}
        onPlaceGround={onPlaceGround}
      />

      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={Math.max(building.width, building.depth) * 2.4} blur={2.4} far={12} />

      <CameraRig building={building} activeFloor={activeFloor} resetSignal={resetSignal} />

      {mapaCalorVisivel && typeof activeFloor === 'number' && (
        <MapaCalorNoPiso
          building={building}
          floorIndex={activeFloor}
          devices={devices}
          propagation={propagation ?? defaultPropagationRf}
        />
      )}
      <PosProcessamento preset={preset} perfil={perfil} />
      <RegistoDeCaptura />
    </Canvas>
  )
}

/**
 * The coverage field laid on the floor slab. Painted to a canvas at one pixel
 * per sample and stretched with linear filtering, which reads as a smooth field
 * rather than a grid of cells.
 */
function MapaCalorNoPiso({
  building,
  floorIndex,
  devices,
  propagation,
}: {
  building: BuildingConfig
  floorIndex: number
  devices: DeviceItem[]
  propagation: Propagation
}) {
  const textura = useMemo(() => {
    const mapa = calcularMapaCalor(building, floorIndex, devices, propagation)
    const t = new THREE.CanvasTexture(desenharMapaCalor(mapa, 1))
    t.colorSpace = THREE.SRGBColorSpace
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    return t
  }, [building, floorIndex, devices, propagation])

  useEffect(() => () => textura.dispose(), [textura])

  const y = floorIndex * building.floorHeight + 0.06

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[building.width, building.depth]} />
      <meshBasicMaterial map={textura} transparent opacity={0.62} depthWrite={false} />
    </mesh>
  )
}

/**
 * Publishes a snapshot function for the report. The canvas is created with
 * `preserveDrawingBuffer` so the pixels are still readable when the report asks
 * for them, rather than having been discarded after compositing.
 */
function RegistoDeCaptura() {
  const gl = useThree((estado) => estado.gl)

  useEffect(() => {
    registarCaptura(() => gl.domElement.toDataURL('image/png'))
    return () => registarCaptura(null)
  }, [gl])

  return null
}

/**
 * The effect pipeline is the single most expensive thing to bring up: N8AO,
 * Bloom and SMAA each compile their own programs, and profiling showed shader
 * linking dominating startup. Mounting it a few frames late lets the building
 * appear almost immediately and the grade settle in right after.
 *
 * Until it takes over, the renderer does its own AGX tone mapping, so those
 * first frames are graded rather than washed out.
 */
function PosProcessamento({
  preset,
  perfil,
}: {
  preset: (typeof lightPresets)['day']
  perfil: PerfilQualidade
}) {
  const gl = useThree((estado) => estado.gl)
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    // with no composer the renderer must grade the image itself, otherwise the
    // scene renders flat and washed out
    if (!perfil.posProcessamento) {
      gl.toneMapping = THREE.AgXToneMapping
      setAtivo(false)
      return
    }
    if (ativo) return
    gl.toneMapping = THREE.AgXToneMapping

    let frames = 0
    let pedido = 0
    const passo = () => {
      frames += 1
      if (frames >= 3) {
        // hand tone mapping over to the composer's own AGX pass
        gl.toneMapping = THREE.NoToneMapping
        setAtivo(true)
        return
      }
      pedido = requestAnimationFrame(passo)
    }
    pedido = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(pedido)
  }, [gl, ativo, perfil.posProcessamento])

  if (!ativo) return null

  return (
    /*
     * Two deliberate swaps against the previous "maximum quality" pipeline,
     * both measured:
     *  - no normal pass. It re-rendered the whole scene into a normal buffer,
     *    which meant compiling a normal-material variant of every material in
     *    the scene. N8AO reconstructs normals from depth instead.
     *  - hardware MSAA instead of SMAA. SMAA compiles three extra passes plus
     *    lookup textures; 4x MSAA is done by the GPU with no shader to build.
     */
    <EffectComposer multisampling={4}>
      {/* EffectComposer types its children as elements, so an unwanted pass is
          swapped for a transparent one rather than conditioned away. */}
      {perfil.ambientOcclusion ? (
        <N8AO aoRadius={2.4} intensity={preset.aoIntensity} distanceFalloff={1} color="#050810" quality="medium" />
      ) : (
        <Vignette eskil={false} offset={1} darkness={0} />
      )}
      <Bloom
        mipmapBlur
        luminanceThreshold={preset.bloomThreshold}
        luminanceSmoothing={0.28}
        intensity={preset.bloomIntensity}
        radius={0.72}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <HueSaturation saturation={preset.grade.saturation} hue={0} />
      <BrightnessContrast brightness={preset.grade.brightness} contrast={preset.grade.contrast} />
      <Vignette eskil={false} offset={0.2} darkness={0.62} />
    </EffectComposer>
  )
}

function SceneEnvironment({
  timeOfDay,
  preset,
  sun,
}: {
  timeOfDay: TimeOfDay
  preset: (typeof lightPresets)['day']
  sun: [number, number, number]
}) {
  const night = timeOfDay === 'night'
  return (
    <Environment key={timeOfDay} resolution={256} frames={1} background={false}>
      {/* sky dome */}
      <Lightformer
        form="ring"
        intensity={night ? 0.15 : 1.7}
        color={preset.hemiSky}
        position={[0, 16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[42, 42, 1]}
      />
      {/* ground bounce */}
      <Lightformer
        intensity={night ? 0.05 : 0.6}
        color={preset.hemiGround}
        position={[0, -10, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[42, 42, 1]}
      />
      {/* warm sun disc (key reflection) */}
      <Lightformer
        form="circle"
        intensity={timeOfDay === 'day' ? 4 : timeOfDay === 'dusk' ? 3 : 0.25}
        color={preset.sunColor}
        position={sun}
        scale={[8, 8, 1]}
      />
      {/* soft key panel above-front */}
      <Lightformer
        intensity={night ? 0.2 : 2}
        color="#ffffff"
        position={[10, 18, 22]}
        rotation={[-Math.PI / 3, 0, 0]}
        scale={[20, 12, 1]}
      />
      {/* cool rim lights left/right for glass sparkle */}
      <Lightformer intensity={night ? 0.4 : 0.9} color="#cfe4ff" position={[-22, 8, 12]} scale={[3, 14, 1]} />
      <Lightformer intensity={night ? 0.4 : 0.9} color="#cfe4ff" position={[22, 8, -12]} scale={[3, 14, 1]} />
      <Lightformer intensity={night ? 0.3 : 0.7} color="#ffffff" position={[-14, 5, -20]} scale={[10, 6, 1]} />
    </Environment>
  )
}

function PlacementSurfaces({
  building,
  activeFloor,
  placementMode,
  onPlaceInterior,
  onPlaceRoof,
  onPlaceGround,
}: {
  building: BuildingConfig
  activeFloor: FloorSelector
  placementMode: boolean
  onPlaceInterior: (floor: number, x: number, z: number) => void
  onPlaceRoof: (x: number, z: number) => void
  onPlaceGround: (x: number, z: number) => void
}) {
  if (!placementMode || activeFloor === 'all') return null

  if (typeof activeFloor === 'number') {
    const y = activeFloor * building.floorHeight + building.floorHeight * 0.5
    return (
      <mesh
        position={[0, y, 0]}
        onPointerDown={(event) => {
          event.stopPropagation()
          if (!isNearestHit(event)) return
          onPlaceInterior(activeFloor, event.point.x, event.point.z)
        }}
        visible={false}
      >
        <boxGeometry args={[building.width, building.floorHeight - 0.06, building.depth]} />
        <meshBasicMaterial />
      </mesh>
    )
  }

  if (activeFloor === 'roof') {
    const topY = buildingTopY(building)
    return (
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, topY + 0.26, 0]}
        onPointerDown={(event) => {
          event.stopPropagation()
          if (!isNearestHit(event)) return
          onPlaceRoof(event.point.x, event.point.z)
        }}
      >
        <planeGeometry args={[building.width, building.depth]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    )
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (!isNearestHit(event)) return
        onPlaceGround(event.point.x, event.point.z)
      }}
    >
      <planeGeometry args={[building.width * 3.2 + 60, building.depth * 3.2 + 60]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** A ray through a box hits front+back faces, firing onPointerDown twice.
 *  Only act on the nearest intersection so each click places exactly one device. */
function isNearestHit(event: ThreeEvent<PointerEvent>) {
  const first = event.intersections[0]
  return !first || first.distance === event.distance
}
