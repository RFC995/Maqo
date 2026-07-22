import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import './App.css'
import type { BuildingConfig, DeviceItem, DeviceType, FloorSelector, Project } from './types'
import { deviceLabels } from './types'
import { createDefaultProject, exportProjectFile, importProjectFile, loadProject, saveProject } from './storage'
import type { PlanPreset } from './planPresets'
import { clampRoom, createRoom, isFloorCustomised, pointInRoom, resolveRooms, type SensorSource } from './rooms'
import type { Room } from './types'
import { defaultModelFor, resolveModel } from './catalog'
import { propagationPresets } from './rf'
import { desktop, ehDesktop, nomeSugerido } from './desktop'
import { capturarVista3D } from './captura'
import { Relatorio } from './components/Relatorio'
import { RoomStats } from './components/RoomStats'
import { NetworkPanel } from './components/NetworkPanel'
import { RoomEditor } from './components/RoomEditor'
import { TopBar } from './components/TopBar'
import { FloorTabs } from './components/FloorTabs'
import { Sidebar } from './components/Sidebar'
import type { TimeOfDay } from './components/Scene3D'
import type { Qualidade } from './qualidade'
import { FloorPlan2D } from './components/FloorPlan2D'
import { DraggablePanel } from './components/DraggablePanel'
import { DevicesPanel } from './components/DevicesPanel'
import { GatewayIcon } from './components/icons'

/**
 * three.js, drei and the postprocessing stack are by far the largest part of
 * the bundle. Loading them separately lets the dashboard chrome paint while
 * they are still arriving, instead of everyone waiting on one big chunk.
 */
const Scene3D = lazy(() => import('./components/Scene3D').then((m) => ({ default: m.Scene3D })))

function VistaACarregar() {
  return (
    <div className="scene-loading">
      <div className="scene-loading-spinner" />
      <span>A preparar a vista 3D...</span>
    </div>
  )
}

function App() {
  const [project, setProject] = useState<Project>(() => loadProject() ?? createDefaultProject())
  const [activeFloor, setActiveFloor] = useState<FloorSelector>('all')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [placementType, setPlacementType] = useState<DeviceType | null>(null)
  const [placementModelId, setPlacementModelId] = useState<string>(() => defaultModelFor('gateway').id)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day')
  const [coverageVisible, setCoverageVisible] = useState(true)
  const [coverageOpacity, setCoverageOpacity] = useState(0.12)
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [mapaCalorVisivel, setMapaCalorVisivel] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [ficheiroAtual, setFicheiroAtual] = useState<string | null>(null)
  const [qualidade, setQualidade] = useState<Qualidade>(
    () => (localStorage.getItem('maqo.qualidade') as Qualidade | null) ?? 'equilibrado',
  )
  const [relatorioAberto, setRelatorioAberto] = useState(false)
  const [imagem3D, setImagem3D] = useState<string | null>(null)
  const [aGerarPdf, setAGerarPdf] = useState(false)
  const [propagationPreset, setPropagationPreset] = useState('office')
  const [uplinkMinutes, setUplinkMinutes] = useState(10)
  // opens just right of the sidebar, over the 3D view — the far right belongs to
  // the 2D plan, which is the precision tool and must not be covered
  const [devicesPanelPosition] = useState(() => ({ x: 336, y: 128 }))

  const propagation = propagationPresets[propagationPreset].value

  const building = project.building
  const devices = project.devices

  const [telemetryTick, setTelemetryTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTelemetryTick((t) => t + 1), 5000)
    return () => clearInterval(timer)
  }, [])

  const rooms = useMemo(
    () => (typeof activeFloor === 'number' ? resolveRooms(project, activeFloor) : []),
    [project, activeFloor],
  )

  const sensorsByRoom = useMemo(() => {
    const map = new Map<string, SensorSource[]>()
    if (typeof activeFloor !== 'number') return map
    for (const device of devices) {
      if (device.mount !== 'interior' || device.floor !== activeFloor) continue
      const model = resolveModel(device.modelId)
      const source: SensorSource = {
        sensorId: device.id,
        measures: model?.measures ?? (device.type === 'sensor' ? ['temperatura', 'humidade'] : []),
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
    setSelectedRoomId(null)
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

  /**
   * Grabs the 3D view before the report covers it, then opens the document.
   * The snapshot has to happen while the canvas is still on screen.
   */
  function abrirRelatorio() {
    setImagem3D(capturarVista3D())
    setRelatorioAberto(true)
  }

  async function imprimirRelatorio() {
    const shell = desktop()
    if (!shell) {
      window.print()
      return
    }
    setAGerarPdf(true)
    try {
      await shell.guardarRelatorioPdf(`relatorio-${nomeSugerido(project)}`)
    } catch {
      window.alert('Nao foi possivel gerar o PDF.')
    } finally {
      setAGerarPdf(false)
    }
  }

  function mudarQualidade(proxima: Qualidade) {
    setQualidade(proxima)
    try {
      localStorage.setItem('maqo.qualidade', proxima)
    } catch {
      // storage unavailable - the choice just does not persist
    }
  }

  /**
   * Writes a floor's room list into the project. The first edit of an
   * auto-generated floor materialises it, so the layout stops following the seed.
   */
  function commitRooms(floor: number, next: Room[]) {
    setProject((p) => ({
      ...p,
      rooms: { ...(p.rooms ?? {}), [String(floor)]: next },
      updatedAt: new Date().toISOString(),
    }))
  }

  function updateRoom(id: string, patch: Partial<Room>) {
    if (typeof activeFloor !== 'number') return
    commitRooms(
      activeFloor,
      rooms.map((room) => (room.id === id ? clampRoom({ ...room, ...patch }, building) : room)),
    )
  }

  function addRoom() {
    if (typeof activeFloor !== 'number') return
    const room = createRoom(building, rooms)
    commitRooms(activeFloor, [...rooms, room])
    setSelectedRoomId(room.id)
  }

  function deleteRoom(id: string) {
    if (typeof activeFloor !== 'number') return
    commitRooms(
      activeFloor,
      rooms.filter((room) => room.id !== id),
    )
    setSelectedRoomId((current) => (current === id ? null : current))
  }

  function resetFloorRooms() {
    if (typeof activeFloor !== 'number') return
    setProject((p) => {
      const next = { ...(p.rooms ?? {}) }
      delete next[String(activeFloor)]
      return { ...p, rooms: next, updatedAt: new Date().toISOString() }
    })
    setSelectedRoomId(null)
  }

  function addDevice(
    type: DeviceType,
    mount: 'roof' | 'interior' | 'ground',
    floor: number | null,
    x: number,
    z: number,
    modelId?: string,
  ) {
    const model = resolveModel(modelId) ?? defaultModelFor(type)
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
    touch({ devices: preset.generate(building, project.seed) })
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

  /**
   * In the desktop shell "export" becomes a real Save: it writes back to the
   * open file, or opens a Save dialog the first time. In a browser it stays a
   * download.
   */
  function handleExport(comoNovo = false) {
    const shell = desktop()
    if (!shell) {
      exportProjectFile(project)
      return
    }
    shell
      .guardarProjeto(JSON.stringify(project, null, 2), comoNovo, nomeSugerido(project))
      .then((resultado) => {
        if (resultado.ok && resultado.caminho) setFicheiroAtual(resultado.caminho)
      })
      .catch(() => window.alert('Nao foi possivel guardar o projeto.'))
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
    setFicheiroAtual(null)
  }

  /** Menu commands coming from the Electron shell. */
  useEffect(() => {
    const shell = desktop()
    if (!shell) return

    const desligar = [
      shell.aoAbrirProjeto(({ caminho, conteudo }) => {
        try {
          const importado = JSON.parse(conteudo) as Project
          if (!importado || importado.version !== 1 || !importado.building) throw new Error('invalido')
          setProject(importado)
          setFicheiroAtual(caminho)
          setSelectedDeviceId(null)
          setActiveFloor('all')
        } catch {
          window.alert('Este ficheiro nao e um projeto Maqo valido.')
        }
      }),
      shell.aoPedirParaGuardar(({ comoNovo }) => handleExport(comoNovo)),
      shell.aoNovoProjeto(() => handleNewProject()),
    ]
    return () => desligar.forEach((off) => off())
    // handlers close over the current project, so rebind when it changes
  }, [project])

  useEffect(() => {
    desktop()
      ?.caminhoAtual()
      .then((caminho) => setFicheiroAtual(caminho))
  }, [])

  return (
    <div className="app-shell">
      {relatorioAberto && (
        <Relatorio
          project={project}
          propagation={propagation}
          propagationPreset={propagationPreset}
          uplinkMinutes={uplinkMinutes}
          imagem3D={imagem3D}
          onFechar={() => setRelatorioAberto(false)}
          onImprimir={imprimirRelatorio}
          aGerarPdf={aGerarPdf}
        />
      )}
      <TopBar
        projectName={building.name}
        onRename={(name) => updateBuilding({ name })}
        timeOfDay={timeOfDay}
        onTimeOfDay={setTimeOfDay}
        onExport={() => handleExport(false)}
        onImport={handleImport}
        onNewProject={handleNewProject}
        onResetView={() => setResetSignal((v) => v + 1)}
        onRelatorio={abrirRelatorio}
        savedLabel={
          ehDesktop()
            ? ficheiroAtual
              ? `Ficheiro: ${ficheiroAtual.split(/[\\/]/).pop()}`
              : 'Projeto por guardar'
            : 'Guardado automaticamente'
        }
      />

      <div className="workspace">
        <Sidebar
          building={building}
          onUpdateBuilding={updateBuilding}
          onRegenerateVariant={regenerateVariant}
          network={
            <NetworkPanel
              building={building}
              devices={devices}
              propagation={propagation}
              propagationPreset={propagationPreset}
              onPropagationPreset={setPropagationPreset}
              uplinkMinutes={uplinkMinutes}
              onUplinkMinutes={setUplinkMinutes}
              onSelectDevice={setSelectedDeviceId}
            />
          }
          rooms={
            typeof activeFloor === 'number' ? (
              <RoomEditor
                building={building}
                rooms={rooms}
                floorLabel={activeFloor === 0 ? 'Res-do-chao' : `Piso ${activeFloor}`}
                customised={isFloorCustomised(project, activeFloor)}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                onUpdateRoom={updateRoom}
                onAddRoom={addRoom}
                onDeleteRoom={deleteRoom}
                onResetFloor={resetFloorRooms}
              />
            ) : null
          }
        />

        <DraggablePanel
          title="Dispositivos"
          icon={<GatewayIcon size={15} />}
          defaultPosition={devicesPanelPosition}
          width={320}
          storageKey="maqo.panel.devices"
        >
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
            propagation={propagation}
            uplinkMinutes={uplinkMinutes}
            qualidade={qualidade}
            onQualidade={mudarQualidade}
            mapaCalorVisivel={mapaCalorVisivel}
            onToggleMapaCalor={() => setMapaCalorVisivel((v) => !v)}
          />
        </DraggablePanel>

        <main className="viewport-area">
          <FloorTabs building={building} devices={devices} activeFloor={activeFloor} onChange={setActiveFloor} />

          <div className={activeFloor === 'all' ? 'viewport-split full' : 'viewport-split'}>
            <div className="canvas-wrap">
              <Suspense fallback={<VistaACarregar />}>
                <Scene3D
                building={building}
                seed={project.seed}
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                activeFloor={activeFloor}
                timeOfDay={timeOfDay}
                qualidade={qualidade}
                mapaCalorVisivel={mapaCalorVisivel}
                placementMode={placementType !== null}
                coverageVisible={coverageVisible}
                propagation={propagation}
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
              </Suspense>
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
                  mapaCalorVisivel={mapaCalorVisivel}
                  propagation={propagation}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  onMoveRoom={(id, x, z) => updateRoom(id, { x, z })}
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
