import { useEffect, useMemo, useState } from 'react'
import './App.css'
import type { BuildingConfig, DeviceItem, DeviceType, FloorSelector, Project } from './types'
import { deviceLabels } from './types'
import { createDefaultProject, exportProjectFile, importProjectFile, loadProject, saveProject } from './storage'
import type { PlanPreset } from './planPresets'
import { generateRooms, pointInRoom, type SensorSource } from './rooms'
import { catalogById, defaultModelFor } from './catalog'
import { RoomStats } from './components/RoomStats'
import { TopBar } from './components/TopBar'
import { FloorTabs } from './components/FloorTabs'
import { Sidebar } from './components/Sidebar'
import { Scene3D, type TimeOfDay } from './components/Scene3D'
import { FloorPlan2D } from './components/FloorPlan2D'
import { DraggablePanel } from './components/DraggablePanel'
import { DevicesPanel } from './components/DevicesPanel'
import { GatewayIcon } from './components/icons'

function App() {
  const [project, setProject] = useState<Project>(() => loadProject() ?? createDefaultProject())
  const [activeFloor, setActiveFloor] = useState<FloorSelector>('all')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [placementType, setPlacementType] = useState<DeviceType | null>(null)
  const [placementModelId, setPlacementModelId] = useState<string>(() => defaultModelFor('gateway').id)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day')
  const [coverageVisible, setCoverageVisible] = useState(true)
  const [coverageOpacity, setCoverageOpacity] = useState(0.12)
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [resetSignal, setResetSignal] = useState(0)
  const [devicesPanelPosition] = useState(() => ({ x: Math.max(20, window.innerWidth - 356), y: 128 }))

  const building = project.building
  const devices = project.devices

  const [telemetryTick, setTelemetryTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTelemetryTick((t) => t + 1), 5000)
    return () => clearInterval(timer)
  }, [])

  const rooms = useMemo(
    () => (typeof activeFloor === 'number' ? generateRooms(building, activeFloor, project.seed) : []),
    [building, activeFloor, project.seed],
  )

  const sensorsByRoom = useMemo(() => {
    const map = new Map<string, SensorSource[]>()
    if (typeof activeFloor !== 'number') return map
    for (const device of devices) {
      if (device.mount !== 'interior' || device.floor !== activeFloor) continue
      const model = device.modelId ? catalogById[device.modelId] : undefined
      const measures = model?.measures ?? (device.type === 'sensor' ? ['temperatura', 'humidade'] : [])
      const source: SensorSource = {
        sensorId: device.id,
        measuresTemp: measures.includes('temperatura'),
        measuresHumidity: measures.includes('humidade'),
        measuresCo2: measures.includes('co2'),
      }
      for (const room of rooms) {
        if (pointInRoom(room, device.x, device.z)) {
          const list = map.get(room.id) ?? []
          list.push(source)
          map.set(room.id, list)
          break
        }
      }
    }
    return map
  }, [devices, rooms, activeFloor])

  useEffect(() => {
    const timer = setTimeout(() => saveProject(project), 400)
    return () => clearTimeout(timer)
  }, [project])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPlacementType(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (activeFloor === 'all') setPlacementType(null)
  }, [activeFloor])

  function touch(patch: Partial<Project>) {
    setProject((p) => ({ ...p, ...patch, updatedAt: new Date().toISOString() }))
  }

  function updateBuilding(patch: Partial<BuildingConfig>) {
    const nextFloors = patch.floors
    if (typeof nextFloors === 'number' && nextFloors < building.floors) {
      setProject((p) => ({
        ...p,
        building: { ...p.building, ...patch },
        devices: p.devices.filter((d) => d.mount !== 'interior' || (d.floor ?? 0) < nextFloors),
        updatedAt: new Date().toISOString(),
      }))
      if (typeof activeFloor === 'number' && activeFloor >= nextFloors) setActiveFloor('all')
      return
    }
    setProject((p) => ({ ...p, building: { ...p.building, ...patch }, updatedAt: new Date().toISOString() }))
  }

  function regenerateVariant() {
    touch({ seed: project.seed + 1 })
  }

  function addDevice(
    type: DeviceType,
    mount: 'roof' | 'interior' | 'ground',
    floor: number | null,
    x: number,
    z: number,
    modelId?: string,
  ) {
    const model = catalogById[modelId ?? ''] ?? defaultModelFor(type)
    const countOfType = project.devices.filter((d) => d.type === type).length
    const device: DeviceItem = {
      id: crypto.randomUUID(),
      type,
      modelId: model.id,
      name: `${deviceLabels[type]} ${countOfType + 1}`,
      mount,
      floor,
      x,
      z,
      radius: model.radius,
      notes: '',
    }
    setProject((p) => ({ ...p, devices: [...p.devices, device], updatedAt: new Date().toISOString() }))
    setSelectedDeviceId(device.id)
  }

  function moveDevice(id: string, x: number, z: number) {
    setProject((p) => ({
      ...p,
      devices: p.devices.map((d) => (d.id === id ? { ...d, x, z } : d)),
      updatedAt: new Date().toISOString(),
    }))
  }

  function updateDevice(id: string, patch: Partial<DeviceItem>) {
    setProject((p) => ({
      ...p,
      devices: p.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      updatedAt: new Date().toISOString(),
    }))
  }

  function deleteDevice(id: string) {
    setProject((p) => ({ ...p, devices: p.devices.filter((d) => d.id !== id), updatedAt: new Date().toISOString() }))
    setSelectedDeviceId((current) => (current === id ? null : current))
  }

  function clearAll() {
    if (devices.length === 0) return
    if (!window.confirm('Remover todos os dispositivos deste projeto?')) return
    touch({ devices: [] })
    setSelectedDeviceId(null)
  }

  function armPlacement(type: DeviceType) {
    setPlacementType((current) => {
      if (current === type) return null
      setPlacementModelId(defaultModelFor(type).id)
      return type
    })
  }

  function applyPlan(preset: PlanPreset) {
    if (devices.length > 0 && !window.confirm(`Aplicar o plano "${preset.name}"? Os dispositivos atuais serao substituidos.`)) {
      return
    }
    touch({ devices: preset.generate(building) })
    setSelectedDeviceId(null)
    setPlacementType(null)
    setActiveFloor('all')
  }

  function handlePlanPlace(x: number, z: number) {
    if (!placementType || activeFloor === 'all') return
    if (activeFloor === 'roof') addDevice(placementType, 'roof', null, x, z, placementModelId)
    else if (activeFloor === 'ground') addDevice(placementType, 'ground', null, x, z, placementModelId)
    else addDevice(placementType, 'interior', activeFloor, x, z, placementModelId)
  }

  function handleExport() {
    exportProjectFile(project)
  }

  function handleImport(file: File) {
    importProjectFile(file)
      .then((imported) => {
        setProject(imported)
        setSelectedDeviceId(null)
        setActiveFloor('all')
      })
      .catch(() => window.alert('Nao foi possivel importar este ficheiro. Verifica se e um projeto Maqo valido (.json).'))
  }

  function handleNewProject() {
    if (!window.confirm('Comecar um novo projeto? Perdes as alteracoes nao exportadas do projeto atual.')) return
    setProject(createDefaultProject())
    setSelectedDeviceId(null)
    setActiveFloor('all')
    setPlacementType(null)
  }

  return (
    <div className="app-shell">
      <TopBar
        projectName={building.name}
        onRename={(name) => updateBuilding({ name })}
        timeOfDay={timeOfDay}
        onTimeOfDay={setTimeOfDay}
        onExport={handleExport}
        onImport={handleImport}
        onNewProject={handleNewProject}
        onResetView={() => setResetSignal((v) => v + 1)}
        savedLabel="Guardado automaticamente"
      />

      <div className="workspace">
        <Sidebar building={building} onUpdateBuilding={updateBuilding} onRegenerateVariant={regenerateVariant} />

        <DraggablePanel title="Dispositivos" icon={<GatewayIcon size={15} />} defaultPosition={devicesPanelPosition} width={320}>
          <DevicesPanel
            building={building}
            devices={devices}
            activeFloor={activeFloor}
            onChangeFloor={setActiveFloor}
            placementType={placementType}
            onArm={armPlacement}
            placementModelId={placementModelId}
            onSelectModel={setPlacementModelId}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            onUpdateDevice={updateDevice}
            onDeleteDevice={deleteDevice}
            coverageVisible={coverageVisible}
            onToggleCoverage={() => setCoverageVisible((v) => !v)}
            coverageOpacity={coverageOpacity}
            onCoverageOpacity={setCoverageOpacity}
            labelsVisible={labelsVisible}
            onToggleLabels={() => setLabelsVisible((v) => !v)}
            onApplyPlan={applyPlan}
            onClearAll={clearAll}
          />
        </DraggablePanel>

        <main className="viewport-area">
          <FloorTabs building={building} devices={devices} activeFloor={activeFloor} onChange={setActiveFloor} />

          <div className={activeFloor === 'all' ? 'viewport-split full' : 'viewport-split'}>
            <div className="canvas-wrap">
              <Scene3D
                building={building}
                seed={project.seed}
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                activeFloor={activeFloor}
                timeOfDay={timeOfDay}
                placementMode={placementType !== null}
                coverageVisible={coverageVisible}
                coverageOpacity={coverageOpacity}
                labelsVisible={labelsVisible}
                resetSignal={resetSignal}
                rooms={rooms}
                telemetryTick={telemetryTick}
                sensorsByRoom={sensorsByRoom}
                onSelectDevice={setSelectedDeviceId}
                onPlaceInterior={(floor, x, z) => placementType && addDevice(placementType, 'interior', floor, x, z, placementModelId)}
                onPlaceRoof={(x, z) => placementType && addDevice(placementType, 'roof', null, x, z, placementModelId)}
                onPlaceGround={(x, z) => placementType && addDevice(placementType, 'ground', null, x, z, placementModelId)}
              />
              {placementType && (
                <div className="placement-banner">
                  A colocar: <strong>{deviceLabels[placementType]}</strong> &mdash; clica no edificio ou na planta &middot; Esc
                  para sair
                </div>
              )}
            </div>

            {activeFloor !== 'all' && (
              <div className="plan-wrap">
                <FloorPlan2D
                  building={building}
                  devices={devices}
                  activeFloor={activeFloor}
                  rooms={rooms}
                  sensorsByRoom={sensorsByRoom}
                  telemetryTick={telemetryTick}
                  selectedId={selectedDeviceId}
                  placementMode={placementType !== null}
                  coverageVisible={coverageVisible}
                  onPlace={handlePlanPlace}
                  onSelect={setSelectedDeviceId}
                  onMove={moveDevice}
                />
              </div>
            )}
          </div>

          {typeof activeFloor === 'number' && rooms.length > 0 && (
            <RoomStats
              rooms={rooms}
              telemetryTick={telemetryTick}
              sensorsByRoom={sensorsByRoom}
              floorLabel={activeFloor === 0 ? 'Res-do-chao' : `Piso ${activeFloor}`}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
