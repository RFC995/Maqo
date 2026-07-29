import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { mountLabels, type DeviceItem, type FloorSelector, type Project } from '../types'
import { cenarioMeta } from '../cenarios'
import { resolveRooms, sensorsByRoomFor, type SensorSource } from '../rooms'
import { categoryLabels, measurementLabels, resolveModel, type DeviceModel } from '../catalog'
import { formatReading, primaryReading, readingStatus, readingStatusColors, sensorReading } from '../telemetry'
import { entradaDeDispositivo, modoDados } from '../liveStore'
import { haQuanto } from '../integracao'
import { useLiveVersion } from '../useLive'
import { defaultPropagation, type Propagation } from '../rf'
import { BuildingTabs } from './BuildingTabs'
import { FloorTabs } from './FloorTabs'
import { FloorPlan2D } from './FloorPlan2D'
import { AlertIcon, GatewayIcon, LayersIcon, SensorIcon } from './icons'

const Scene3D = lazy(() => import('./Scene3D').then((m) => ({ default: m.Scene3D })))

function VistaACarregar() {
  return (
    <div className="scene-loading">
      <div className="scene-loading-spinner" />
      <span>A preparar a vista 3D...</span>
    </div>
  )
}

interface DashboardProps {
  project: Project
  telemetryTick: number
  propagation?: Propagation
}

const noop = () => {}

/**
 * Read-only "situation room": pick a building/floor and see its live sensor
 * state on the same 3D scene planning uses (plus a compact 2D plan), with a
 * building-wide KPI summary up top. Every marker shows its own reading and,
 * for sensors, the gateway serving it — nothing requires a click. Keeps its
 * own building/floor/selection state rather than sharing App.tsx's, so
 * planning is untouched when this tab is open or closed.
 */
export function Dashboard({ project, telemetryTick, propagation = defaultPropagation }: DashboardProps) {
  useLiveVersion() // re-render as soon as a real uplink lands, not just on tick

  const [activeBuildingId, setActiveBuildingId] = useState<string>(() => project.buildings[0].id)
  const [activeFloor, setActiveFloor] = useState<FloorSelector>(() =>
    cenarioMeta[project.scenario].pisos ? 0 : 'ground',
  )
  const [inspectedId, setInspectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!project.buildings.some((b) => b.id === activeBuildingId)) {
      setActiveBuildingId(project.buildings[0].id)
    }
  }, [project.buildings, activeBuildingId])

  // the map always needs one concrete floor — redirect out of "Vista geral"
  useEffect(() => {
    if (activeFloor === 'all') {
      setActiveFloor(cenarioMeta[project.scenario].pisos ? 0 : 'ground')
    }
  }, [activeFloor, project.scenario])

  useEffect(() => {
    setInspectedId(null)
  }, [activeBuildingId, activeFloor])

  const building = project.buildings.find((b) => b.id === activeBuildingId) ?? project.buildings[0]
  const vocab = cenarioMeta[project.scenario].vocabulario
  const devices = useMemo(
    () => project.devices.filter((d) => d.buildingId === building.id),
    [project.devices, building.id],
  )
  const rooms = useMemo(
    () => (typeof activeFloor === 'number' ? resolveRooms(project, building, activeFloor) : []),
    [project, building, activeFloor],
  )
  const sensorsByRoom = useMemo(
    () => (typeof activeFloor === 'number' ? sensorsByRoomFor(devices, rooms, activeFloor) : new Map<string, SensorSource[]>()),
    [devices, rooms, activeFloor],
  )

  const inspectedDevice = devices.find((d) => d.id === inspectedId) ?? null
  const inspectedModel = inspectedDevice ? resolveModel(inspectedDevice.modelId) : undefined

  return (
    <div className="dashboard">
      <KpiSummary devices={devices} telemetryTick={telemetryTick} />

      <div className="dashboard-toolbar">
        <BuildingTabs
          buildings={project.buildings}
          devices={project.devices}
          activeBuildingId={building.id}
          onChange={setActiveBuildingId}
          readOnly
        />
        <FloorTabs
          building={building.config}
          scenario={project.scenario}
          terrenoLabel={vocab.terreno}
          devices={devices}
          activeFloor={activeFloor}
          onChange={setActiveFloor}
        />
      </div>

      <div className="dashboard-body">
        <div className="dashboard-scene">
          <Suspense fallback={<VistaACarregar />}>
            <Scene3D
              buildings={project.buildings}
              scenario={project.scenario}
              activeBuildingId={building.id}
              seed={project.seed}
              devices={project.devices}
              selectedDeviceId={inspectedId}
              activeFloor={activeFloor}
              timeOfDay="day"
              placementMode={false}
              coverageVisible
              propagation={propagation}
              coverageOpacity={0.14}
              labelsVisible
              resetSignal={0}
              rooms={rooms}
              telemetryTick={telemetryTick}
              sensorsByRoom={sensorsByRoom}
              dashboardMode
              onSelectDevice={setInspectedId}
              onPlaceInterior={noop}
              onPlaceRoof={noop}
              onPlaceGround={noop}
            />
          </Suspense>
        </div>

        {activeFloor !== 'all' && (
          <div className="dashboard-map">
            <FloorPlan2D
              building={building.config}
              devices={devices}
              activeFloor={activeFloor}
              rooms={rooms}
              sensorsByRoom={sensorsByRoom}
              telemetryTick={telemetryTick}
              selectedId={inspectedId}
              placementMode={false}
              readOnly
              coverageVisible={false}
              onSelect={setInspectedId}
            />
          </div>
        )}

        <aside className="dashboard-detail">
          {inspectedDevice && inspectedModel ? (
            <DeviceDetail
              device={inspectedDevice}
              model={inspectedModel}
              tick={telemetryTick}
              onClose={() => setInspectedId(null)}
            />
          ) : (
            <p className="dashboard-detail-empty">
              Todos os sensores mostram os dados na propria cena — seleciona um para mais detalhe (RSSI, ligacao, notas).
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

function KpiSummary({ devices, telemetryTick }: { devices: DeviceItem[]; telemetryTick: number }) {
  const stats = useMemo(() => {
    let gateways = 0
    let sensors = 0
    let alerts = 0
    for (const device of devices) {
      if (device.type === 'gateway') gateways += 1
      if (device.type !== 'sensor') continue
      sensors += 1
      const model = resolveModel(device.modelId)
      const reading = model ? primaryReading(model, device.id, telemetryTick) : null
      if (reading && readingStatus(reading.measurement, reading.value) === 'mau') alerts += 1
    }
    return { total: devices.length, gateways, sensors, alerts }
  }, [devices, telemetryTick])

  return (
    <div className="dashboard-kpis">
      <div className="kpi-tile">
        <LayersIcon size={18} className="kpi-icon" />
        <div className="kpi-text">
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Dispositivos</div>
        </div>
      </div>
      <div className="kpi-tile">
        <GatewayIcon size={18} className="kpi-icon" />
        <div className="kpi-text">
          <div className="kpi-value">{stats.gateways}</div>
          <div className="kpi-label">Gateways</div>
        </div>
      </div>
      <div className="kpi-tile">
        <SensorIcon size={18} className="kpi-icon" />
        <div className="kpi-text">
          <div className="kpi-value">{stats.sensors}</div>
          <div className="kpi-label">Sensores</div>
        </div>
      </div>
      <div className={stats.alerts > 0 ? 'kpi-tile alert' : 'kpi-tile'}>
        <AlertIcon size={18} className="kpi-icon" />
        <div className="kpi-text">
          <div className="kpi-value">{stats.alerts}</div>
          <div className="kpi-label">Alertas</div>
        </div>
      </div>
    </div>
  )
}

function DeviceDetail({
  device,
  model,
  tick,
  onClose,
}: {
  device: DeviceItem
  model: DeviceModel
  tick: number
  onClose: () => void
}) {
  const real = modoDados(device.id) === 'real'
  const entrada = entradaDeDispositivo(device.id)

  return (
    <div className="dashboard-detail-panel">
      <div className="dashboard-detail-header">
        <div>
          <div className="dashboard-detail-title">{device.name}</div>
          <div className="dashboard-detail-sub">
            {model.brand} {model.model} &middot; {categoryLabels[model.category]}
          </div>
        </div>
        <button type="button" className="dashboard-detail-close" onClick={onClose} aria-label="Fechar">
          &times;
        </button>
      </div>

      <div className="dashboard-detail-section leitura-topo">
        <span className={real ? 'leitura-etiqueta ao-vivo' : 'leitura-etiqueta'}>
          {real ? 'Dados reais' : 'Simulado'}
        </span>
        {entrada && <span className="leitura-tempo">{haQuanto(entrada.at)}</span>}
      </div>

      <div className="leitura-valores dashboard-detail-section">
        {model.measures.map((m) => {
          const value = sensorReading(m, device.id, tick)
          return (
            <span key={m} className="leitura-chip">
              <span className="leitura-status-dot" style={{ background: readingStatusColors[readingStatus(m, value)] }} />
              <span className="leitura-chip-nome">{measurementLabels[m]}</span>
              <strong>{formatReading(m, value)}</strong>
            </span>
          )
        })}
        {model.measures.length === 0 && <span className="leitura-chip vazio">sem medidas</span>}
      </div>

      {entrada && (entrada.rssi !== undefined || entrada.snr !== undefined || entrada.sf !== undefined) && (
        <div className="leitura-radio dashboard-detail-section">
          {entrada.rssi !== undefined && <span>RSSI {Math.round(entrada.rssi)} dBm</span>}
          {entrada.snr !== undefined && <span>SNR {entrada.snr.toFixed(1)} dB</span>}
          {entrada.sf !== undefined && <span>SF{entrada.sf}</span>}
        </div>
      )}

      <p className="dashboard-detail-meta">
        {mountLabels[device.mount]}
        {typeof device.floor === 'number' ? ` · Piso ${device.floor}` : ''}
      </p>
    </div>
  )
}
