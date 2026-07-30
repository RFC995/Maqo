import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  deviceColors,
  deviceDefaultRadius,
  deviceLabels,
  mountLabels,
  type BuildingConfig,
  type Cenario,
  type DeviceItem,
  type DeviceType,
  type FloorSelector,
  type MountType,
} from '../types'
import { presetsForScenario, type PlanPreset } from '../planPresets'
import { measurementLabels, resolveModel, type Measurement } from '../catalog'
import { entradaDe, estadoIntegracao, listaDevEuis } from '../liveStore'
import { haQuanto, normalizarDevEui } from '../integracao'
import { formatReading } from '../telemetry'
import { useLiveVersion } from '../useLive'
import {
  analyseLink,
  defaultPropagation,
  estimateBattery,
  linkQualityColors,
  linkQualityLabels,
  sfColors,
  type Propagation,
} from '../rf'
import { ModelGallery, ModelPicker, ModelSpecSheet } from './ModelSpecs'
import { perfisDeQualidade, type Qualidade } from '../qualidade'
import { calcularMapaCalor, escalaMapaCalor } from '../heatmap'
import { DeviceArtwork } from './DeviceArtwork'
import type { LnsDispositivo } from '../desktop'
import type { LnsReadingEntry } from '../lns'
import {
  GatewayIcon,
  SensorIcon,
  CameraIcon,
  RepeaterIcon,
  TrashIcon,
  LayersIcon,
  SignalIcon,
  BatteryIcon,
} from './icons'

type PanelTab = 'colocar' | 'planos' | 'lista' | 'vista'

const panelTabLabels: Record<PanelTab, string> = {
  colocar: 'Colocar',
  planos: 'Planos',
  lista: 'Lista',
  vista: 'Vista',
}

const deviceIcons: Record<DeviceType, typeof GatewayIcon> = {
  gateway: GatewayIcon,
  sensor: SensorIcon,
  camera: CameraIcon,
  repeater: RepeaterIcon,
}

interface DevicesPanelProps {
  building: BuildingConfig
  scenario: Cenario
  devices: DeviceItem[]
  activeFloor: FloorSelector
  onChangeFloor: (floor: FloorSelector) => void
  placementType: DeviceType | null
  onArm: (type: DeviceType) => void
  placementModelId: string
  onSelectModel: (modelId: string) => void
  selectedDeviceId: string | null
  onSelectDevice: (id: string | null) => void
  onUpdateDevice: (id: string, patch: Partial<DeviceItem>) => void
  onDeleteDevice: (id: string) => void
  coverageVisible: boolean
  onToggleCoverage: () => void
  coverageOpacity: number
  onCoverageOpacity: (value: number) => void
  labelsVisible: boolean
  onToggleLabels: () => void
  onApplyPlan: (preset: PlanPreset) => void
  onClearAll: () => void
  propagation?: Propagation
  uplinkMinutes?: number
  qualidade?: Qualidade
  onQualidade?: (q: Qualidade) => void
  mapaCalorVisivel?: boolean
  onToggleMapaCalor?: () => void
  lnsDispositivos?: LnsDispositivo[]
  lnsReadings?: Map<string, LnsReadingEntry>
}

export function DevicesPanel({
  building,
  scenario,
  devices,
  activeFloor,
  onChangeFloor,
  placementType,
  onArm,
  placementModelId,
  onSelectModel,
  selectedDeviceId,
  onSelectDevice,
  onUpdateDevice,
  onDeleteDevice,
  coverageVisible,
  onToggleCoverage,
  coverageOpacity,
  onCoverageOpacity,
  labelsVisible,
  onToggleLabels,
  onApplyPlan,
  onClearAll,
  propagation = defaultPropagation,
  uplinkMinutes = 10,
  qualidade = 'equilibrado',
  onQualidade,
  mapaCalorVisivel = false,
  onToggleMapaCalor,
  lnsDispositivos = [],
  lnsReadings,
}: DevicesPanelProps) {
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null
  const [tab, setTab] = useState<PanelTab>('colocar')
  const presets = useMemo(() => presetsForScenario(scenario), [scenario])

  // the picture is persuasive, but a proposal needs the number
  const coberturaDoPiso = useMemo(() => {
    if (!mapaCalorVisivel || typeof activeFloor !== 'number') return null
    return calcularMapaCalor(building, activeFloor, devices, propagation)
  }, [mapaCalorVisivel, activeFloor, building, devices, propagation])

  // arming a type or picking a device is a request to see that section
  useEffect(() => {
    if (placementType) setTab('colocar')
  }, [placementType])
  useEffect(() => {
    if (selectedDeviceId) setTab('lista')
  }, [selectedDeviceId])

  return (
    <>
      <nav className="panel-tabs" role="tablist">
        {(Object.keys(panelTabLabels) as PanelTab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'panel-tab active' : 'panel-tab'}
            onClick={() => setTab(id)}
          >
            {panelTabLabels[id]}
            {id === 'lista' && devices.length > 0 && <span className="panel-tab-badge">{devices.length}</span>}
          </button>
        ))}
      </nav>

      <div className="panel-block" hidden={tab !== 'colocar'}>
        <p className="panel-hint">
          Escolhe um tipo e clica na planta 2D ou no modelo 3D para colocar. O piso ativo define a montagem.
        </p>
        <div className="device-palette">
          {(Object.keys(deviceLabels) as DeviceType[]).map((type) => {
            const Icon = deviceIcons[type]
            const armed = placementType === type
            return (
              <button
                key={type}
                type="button"
                className={armed ? 'palette-btn active' : 'palette-btn'}
                style={{ '--accent': deviceColors[type] } as CSSProperties}
                onClick={() => onArm(type)}
                disabled={activeFloor === 'all'}
              >
                <Icon size={18} />
                <span>{deviceLabels[type]}</span>
              </button>
            )
          })}
        </div>
        {placementType && (
          <div className="model-picker">
            <span className="model-picker-title">Modelo do {deviceLabels[placementType].toLowerCase()}</span>
            <ModelGallery type={placementType} value={placementModelId} onChange={onSelectModel} />
            <ModelSpecSheet modelId={placementModelId} />
          </div>
        )}
        {activeFloor === 'all' && (
          <p className="panel-hint warn">Seleciona um piso, a cobertura ou o exterior para colocar dispositivos.</p>
        )}
        {placementType && activeFloor !== 'all' && (
          <p className="panel-hint accent">Modo colocacao ativo &mdash; clica na planta. Escape para sair.</p>
        )}
      </div>

      <div className="panel-block" hidden={tab !== 'planos'}>
        <div className="panel-header-row">
          <h3>
            <LayersIcon size={14} /> Planos de instalacao
          </h3>
        </div>
        <p className="panel-hint">
          Instalacoes completas com equipamento Milesight real, dimensionadas ao edificio e colocadas dentro das salas
          geradas.
        </p>
        <div className="plan-list">
          {presets.map((preset) => (
            <div key={preset.id} className="plan-card">
              <div className="plan-card-info">
                <span className="plan-card-name">{preset.name}</span>
                <span className="plan-card-desc">{preset.description}</span>
                <span className="plan-card-bom">
                  {preset.models.map((m) => (
                    <span key={m} className="bom-chip">
                      {m}
                    </span>
                  ))}
                </span>
              </div>
              <button type="button" className="plan-apply-btn" onClick={() => onApplyPlan(preset)}>
                Aplicar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block coverage-panel" hidden={tab !== 'vista'}>
        {onQualidade && (
          <div className="qualidade-bloco">
            <span className="block-title">Qualidade grafica</span>
            <div className="qualidade-opcoes">
              {(Object.keys(perfisDeQualidade) as Qualidade[]).map((chave) => (
                <button
                  key={chave}
                  type="button"
                  className={chave === qualidade ? 'qualidade-btn active' : 'qualidade-btn'}
                  onClick={() => onQualidade(chave)}
                >
                  {perfisDeQualidade[chave].rotulo}
                </button>
              ))}
            </div>
            <p className="panel-hint">{perfisDeQualidade[qualidade].nota}</p>
          </div>
        )}
        {onToggleMapaCalor && (
          <div className="mapa-calor-bloco">
            <label className="switch-row">
              <input type="checkbox" checked={mapaCalorVisivel} onChange={onToggleMapaCalor} />
              Mapa de calor de cobertura
            </label>
            {mapaCalorVisivel && (
              <>
                <div className="escala-calor">
                  {escalaMapaCalor.map((p) => (
                    <span key={p.rotulo} className="escala-calor-parada">
                      <span className="escala-calor-cor" style={{ background: p.cor }} />
                      {p.rotulo}
                    </span>
                  ))}
                </div>
                {coberturaDoPiso ? (
                  <div className="cobertura-resumo">
                    <div className="cobertura-numero">
                      <strong>{coberturaDoPiso.coberturaPct.toFixed(0)}%</strong>
                      <span>do piso com ligacao</span>
                    </div>
                    {coberturaDoPiso.limitePct > 1 && (
                      <span className="cobertura-nota">
                        {coberturaDoPiso.limitePct.toFixed(0)}% so fecha a SF11/SF12 — lento e sujeito a colisoes
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="panel-hint">
                    Sinal que um no generico ouviria em cada ponto do piso ativo. Seleciona um piso para o ver.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        <label className="switch-row">
          <input type="checkbox" checked={coverageVisible} onChange={onToggleCoverage} />
          Mostrar cobertura de sinal
        </label>
        <label className="range-row">
          Opacidade
          <input
            type="range"
            min={0.03}
            max={0.35}
            step={0.01}
            value={coverageOpacity}
            onChange={(event) => onCoverageOpacity(Number(event.target.value))}
            disabled={!coverageVisible}
          />
        </label>
        <label className="switch-row">
          <input type="checkbox" checked={labelsVisible} onChange={onToggleLabels} />
          Mostrar etiquetas dos dispositivos
        </label>
        <div className="zone-legend">
          <span className="zone-chip" style={{ '--zone': sfColors[7] } as CSSProperties}>
            SF7 rapido
          </span>
          <span className="zone-chip" style={{ '--zone': sfColors[9] } as CSSProperties}>
            SF9
          </span>
          <span className="zone-chip" style={{ '--zone': sfColors[12] } as CSSProperties}>
            SF12 alcance
          </span>
        </div>
      </div>

      <div className="panel-block device-list-panel" hidden={tab !== 'lista'}>
        <div className="panel-header-row">
          <h3>Lista de dispositivos ({devices.length})</h3>
          {devices.length > 0 && (
            <button type="button" className="link-btn" onClick={onClearAll}>
              Limpar tudo
            </button>
          )}
        </div>

        {devices.length === 0 ? (
          <p className="panel-hint">Ainda nao ha dispositivos neste projeto.</p>
        ) : (
          <ul className="device-list">
            {devices.map((device) => {
              const Icon = deviceIcons[device.type]
              const rowModel = resolveModel(device.modelId)
              return (
                <li key={device.id} className="device-row-item">
                  <button
                    type="button"
                    className={device.id === selectedDeviceId ? 'device-row active' : 'device-row'}
                    onClick={() => onSelectDevice(device.id)}
                  >
                    {rowModel ? (
                      <span className="device-row-thumb" style={{ borderColor: deviceColors[device.type] }}>
                        <DeviceArtwork model={rowModel} size={22} />
                      </span>
                    ) : (
                      <Icon size={15} className="device-row-icon" style={{ color: deviceColors[device.type] }} />
                    )}
                    <span className="device-row-text">
                      <span className="device-row-name">{device.name}</span>
                      {resolveModel(device.modelId) && (
                        <span className="device-row-model">{resolveModel(device.modelId)!.name}</span>
                      )}
                    </span>
                    <span className="device-row-mount">{locationLabel(device)}</span>
                  </button>
                  <button
                    type="button"
                    className="device-row-delete"
                    title={`Apagar ${device.name}`}
                    aria-label={`Apagar ${device.name}`}
                    onClick={() => onDeleteDevice(device.id)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {selectedDevice && (
          <DeviceInspector
            device={selectedDevice}
            building={building}
            devices={devices}
            propagation={propagation}
            uplinkMinutes={uplinkMinutes}
            lnsDispositivos={lnsDispositivos}
            lnsReadings={lnsReadings}
            onUpdate={(patch) => onUpdateDevice(selectedDevice.id, patch)}
            onDelete={() => onDeleteDevice(selectedDevice.id)}
            onFocusFloor={onChangeFloor}
          />
        )}
      </div>
    </>
  )
}

function locationLabel(device: DeviceItem) {
  if (device.mount === 'roof') return 'Cobertura'
  if (device.mount === 'ground') return 'Exterior'
  return device.floor === 0 ? 'Res-do-chao' : `Piso ${device.floor}`
}

function DeviceInspector({
  device,
  building,
  devices,
  propagation,
  uplinkMinutes,
  lnsDispositivos = [],
  lnsReadings,
  onUpdate,
  onDelete,
  onFocusFloor,
}: {
  device: DeviceItem
  building: BuildingConfig
  devices: DeviceItem[]
  propagation: Propagation
  uplinkMinutes: number
  lnsDispositivos?: LnsDispositivo[]
  lnsReadings?: Map<string, LnsReadingEntry>
  onUpdate: (patch: Partial<DeviceItem>) => void
  onDelete: () => void
  onFocusFloor: (floor: FloorSelector) => void
}) {
  function handleMountChange(mount: MountType) {
    if (mount === 'interior') {
      onUpdate({ mount, floor: device.floor ?? 0 })
    } else {
      onUpdate({ mount, floor: null })
    }
  }

  return (
    <div className="inspector">
      <div className="panel-header-row">
        <h3>Dispositivo selecionado</h3>
        <button type="button" className="icon-only-btn" onClick={onDelete} title="Remover">
          <TrashIcon size={15} />
        </button>
      </div>

      <label>
        Nome
        <input type="text" value={device.name} onChange={(event) => onUpdate({ name: event.target.value })} />
      </label>

      <label>
        Modelo
        <ModelPicker
          type={device.type}
          value={resolveModel(device.modelId)?.id ?? ''}
          onChange={(modelId) => {
            const model = resolveModel(modelId)
            if (model) onUpdate({ modelId: model.id, radius: model.radius })
          }}
        />
      </label>

      <ModelSpecSheet modelId={device.modelId} />

      {device.type !== 'gateway' && <LigacaoReal device={device} onUpdate={onUpdate} />}

      <LinkBudget
        device={device}
        building={building}
        devices={devices}
        propagation={propagation}
        uplinkMinutes={uplinkMinutes}
      />

      <div className="field-grid">
        <label>
          Montagem
          <select value={device.mount} onChange={(event) => handleMountChange(event.target.value as MountType)}>
            {(Object.keys(mountLabels) as MountType[]).map((m) => (
              <option key={m} value={m}>
                {mountLabels[m]}
              </option>
            ))}
          </select>
        </label>
        {device.mount === 'interior' && (
          <label>
            Piso
            <select
              value={device.floor ?? 0}
              onChange={(event) => {
                const floor = Number(event.target.value)
                onUpdate({ floor })
                onFocusFloor(floor)
              }}
            >
              {Array.from({ length: building.floors }, (_, i) => i).map((i) => (
                <option key={i} value={i}>
                  {i === 0 ? 'Res-do-chao' : `Piso ${i}`}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="field-grid">
        <label>
          X (m)
          <input
            type="number"
            step={0.1}
            value={Number(device.x.toFixed(2))}
            onChange={(event) => onUpdate({ x: Number(event.target.value) })}
          />
        </label>
        <label>
          Z (m)
          <input
            type="number"
            step={0.1}
            value={Number(device.z.toFixed(2))}
            onChange={(event) => onUpdate({ z: Number(event.target.value) })}
          />
        </label>
      </div>

      <label>
        Raio de cobertura (m)
        <input
          type="number"
          min={2}
          max={300}
          value={device.radius}
          onChange={(event) => onUpdate({ radius: Number(event.target.value) })}
        />
      </label>
      <button
        type="button"
        className="link-btn"
        onClick={() => onUpdate({ radius: resolveModel(device.modelId)?.radius ?? deviceDefaultRadius[device.type] })}
      >
        Repor raio do modelo
      </button>

      {device.type === 'sensor' && (
        <>
          <label>
            DevEUI (LNS)
            <input
              type="text"
              value={device.devEui ?? ''}
              onChange={(event) => onUpdate({ devEui: event.target.value.trim() || undefined })}
              placeholder="Ex: 24e124126c123456"
            />
          </label>
          {lnsDispositivos.length > 0 && (
            <label>
              Escolher dispositivo descoberto
              <select value="" onChange={(event) => event.target.value && onUpdate({ devEui: event.target.value })}>
                <option value="">Selecionar...</option>
                {lnsDispositivos.map((d) => (
                  <option key={d.devEui} value={d.devEui}>
                    {d.nome} — {d.devEui}
                  </option>
                ))}
              </select>
            </label>
          )}
          {device.devEui && (
            <p className="panel-hint">
              <span
                className="metric-dot"
                style={{ background: lnsReadings?.has(device.devEui) ? '#22c55e' : '#5b6472' }}
              />
              {lnsReadings?.has(device.devEui) ? 'Dados em tempo real' : 'Sem leitura recente do LNS'}
            </p>
          )}
        </>
      )}

      <label>
        Notas
        <textarea
          rows={2}
          value={device.notes}
          onChange={(event) => onUpdate({ notes: event.target.value })}
          placeholder="Ex: cobre armazem norte, instalar a 3m de altura..."
        />
      </label>
    </div>
  )
}

/**
 * Binds a device marker to a real LoRaWAN sensor by its DevEUI and shows the
 * last uplink received for it. Once bound and the link is live, the whole
 * dashboard reads this sensor's real data instead of the simulation.
 */
function LigacaoReal({
  device,
  onUpdate,
}: {
  device: DeviceItem
  onUpdate: (patch: Partial<DeviceItem>) => void
}) {
  useLiveVersion() // refresh as uplinks land
  const estado = estadoIntegracao()
  const ligado = estado.estado === 'ligado'
  const eui = device.devEui ?? ''
  const euiNorm = normalizarDevEui(eui)
  const entrada = euiNorm ? entradaDe(euiNorm) : undefined
  const detetados = listaDevEuis()
  const medidas = entrada ? (Object.keys(entrada.valores) as Measurement[]) : []

  return (
    <div className="ligacao-real">
      <div className="lb-head">
        <SignalIcon size={13} /> Sensor real (LoRaWAN)
      </div>
      <label>
        DevEUI
        <input
          type="text"
          list="deveuis-detetados"
          value={eui}
          placeholder="ex.: 24E124..."
          onChange={(event) => onUpdate({ devEui: event.target.value.trim() || undefined })}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <datalist id="deveuis-detetados">
        {detetados.map((d) => (
          <option key={d.devEui} value={d.devEui}>
            {d.deviceId ?? d.devEui}
          </option>
        ))}
      </datalist>

      {detetados.length > 0 && (
        <label>
          Associar a um sensor detetado
          <select value="" onChange={(event) => event.target.value && onUpdate({ devEui: event.target.value })}>
            <option value="">Selecionar...</option>
            {detetados.map((d) => (
              <option key={d.devEui} value={d.devEui}>
                {d.deviceId ?? d.devEui} — {d.devEui}
              </option>
            ))}
          </select>
        </label>
      )}

      {!euiNorm ? (
        <p className="panel-hint">
          Associa o DevEUI do sensor real para o dashboard mostrar os dados vindos da TTN / ChirpStack em vez dos
          valores simulados.
        </p>
      ) : entrada ? (
        <div className={`leitura-real ${ligado ? 'ao-vivo' : 'inativa'}`}>
          <div className="leitura-topo">
            <span className="leitura-etiqueta">{ligado ? 'Ao vivo' : 'Ultima leitura'}</span>
            <span className="leitura-tempo">{haQuanto(entrada.at)}</span>
          </div>
          <div className="leitura-valores">
            {medidas.map((m) => (
              <span key={m} className="leitura-chip">
                <span className="leitura-chip-nome">{measurementLabels[m]}</span>
                <strong>{formatReading(m, entrada.valores[m] ?? null)}</strong>
              </span>
            ))}
            {medidas.length === 0 && <span className="leitura-chip vazio">sem campos descodificados</span>}
          </div>
          {(entrada.rssi !== undefined || entrada.sf !== undefined) && (
            <div className="leitura-radio">
              {entrada.rssi !== undefined && <span>RSSI {Math.round(entrada.rssi)} dBm</span>}
              {entrada.snr !== undefined && <span>SNR {entrada.snr.toFixed(1)} dB</span>}
              {entrada.sf !== undefined && <span>SF{entrada.sf}</span>}
              {entrada.fcnt !== undefined && <span>#{entrada.fcnt}</span>}
            </div>
          )}
          {!ligado && (
            <p className="panel-hint">Ligacao inativa — a mostrar simulacao. Liga na aba "Ligar" para dados reais.</p>
          )}
        </div>
      ) : (
        <p className="panel-hint warn">
          {ligado
            ? 'Ligado, mas ainda sem uplinks deste DevEUI. Os sensores LoRaWAN reportam de tempos a tempos — aguarda.'
            : 'DevEUI associado. Liga-te ao servidor na aba "Ligar" para receber os dados deste sensor.'}
        </p>
      )}
    </div>
  )
}

/**
 * Per-device RF read-out: which gateway hears it, through how much concrete,
 * at what spreading factor, and what that costs in airtime and battery.
 */
function LinkBudget({
  device,
  building,
  devices,
  propagation,
  uplinkMinutes,
}: {
  device: DeviceItem
  building: BuildingConfig
  devices: DeviceItem[]
  propagation: Propagation
  uplinkMinutes: number
}) {
  const gateways = devices.filter((d) => d.type === 'gateway')
  const model = resolveModel(device.modelId)

  if (device.type === 'gateway') {
    const nodes = devices.filter((d) => d.type !== 'gateway').length
    const capacity = model?.gateway?.maxNodes ?? 0
    return (
      <div className="link-budget">
        <div className="lb-head">
          <SignalIcon size={13} /> Gateway
        </div>
        <div className="spec-grid">
          <div className="spec-row">
            <span className="spec-key">Nos no projeto</span>
            <span className="spec-value">
              {nodes} {capacity > 0 && `de ${capacity.toLocaleString('pt-PT')}`}
            </span>
          </div>
          <div className="spec-row">
            <span className="spec-key">Ambiente</span>
            <span className="spec-value">
              {model?.gateway?.environment === 'outdoor' ? 'Exterior (IP67)' : 'Interior'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (gateways.length === 0) {
    return (
      <div className="link-budget">
        <p className="panel-hint warn">Sem gateway no projeto — nao ha ligacao para analisar.</p>
      </div>
    )
  }

  const link = analyseLink(device, gateways, building, propagation)
  const battery = estimateBattery(model, link.sf, uplinkMinutes, link.payloadBytes)
  const uplinksNeeded = 60 / Math.max(1, uplinkMinutes)
  const overDuty = link.maxUplinksPerHour > 0 && uplinksNeeded > link.maxUplinksPerHour

  return (
    <div className="link-budget">
      <div className="lb-head">
        <SignalIcon size={13} /> Orcamento de ligacao
        <span className="lb-quality" style={{ background: linkQualityColors[link.quality] }}>
          {linkQualityLabels[link.quality]}
        </span>
      </div>

      <div className="spec-grid">
        <div className="spec-row">
          <span className="spec-key">Gateway</span>
          <span className="spec-value">{link.gatewayName ?? '—'}</span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Distancia</span>
          <span className="spec-value">{link.distance.toFixed(1)} m</span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Obstaculos</span>
          <span className="spec-value">
            {link.floorsCrossed} laje(s) + {link.wallsCrossed} divisoria(s) = {Math.round(link.obstacleDb)} dB
          </span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Perda total</span>
          <span className="spec-value">{Math.round(link.pathLossDb)} dB</span>
        </div>
        <div className="spec-row">
          <span className="spec-key">RSSI / SNR</span>
          <span className="spec-value">
            {Math.round(link.rssiDbm)} dBm / {Math.round(link.snrDb)} dB
          </span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Spreading factor</span>
          <span className="spec-value">
            {link.sf ? (
              <>
                <strong style={{ color: sfColors[link.sf] }}>SF{link.sf}</strong> · margem{' '}
                {Math.round(link.marginDb)} dB
              </>
            ) : (
              <strong style={{ color: linkQualityColors['sem-cobertura'] }}>fora de alcance</strong>
            )}
          </span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Uplink</span>
          <span className="spec-value">
            {link.payloadBytes} B · {link.airtimeMs.toFixed(0)} ms no ar
          </span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Limite de 1%</span>
          <span className={overDuty ? 'spec-value bad' : 'spec-value'}>
            {link.maxUplinksPerHour} msg/h (usa {uplinksNeeded.toFixed(0)})
          </span>
        </div>
      </div>

      {battery && (
        <div className="battery-row">
          <BatteryIcon size={14} />
          <span>
            Custo do radio: <strong>{battery.years.toFixed(1)} anos</strong> a {uplinkMinutes} min
          </span>
          {battery.datasheetYears && (
            <span className="battery-ref">
              datasheet: {battery.datasheetYears[0]}-{battery.datasheetYears[1]} anos
            </span>
          )}
          <span className="battery-note">
            So conta a energia das transmissoes — o consumo do proprio sensor (NDIR, ToF, radar) nao entra, por isso o
            valor do datasheet e sempre o mais baixo. Serve para comparar intervalos de reporte e spreading factors.
          </span>
        </div>
      )}

      {link.sf === null && (
        <p className="panel-hint warn">
          Nenhum SF fecha o link com a margem definida. Aproxima o no do gateway, sobe-o de piso ou acrescenta um
          gateway intermedio.
        </p>
      )}
      {overDuty && (
        <p className="panel-hint warn">
          Este intervalo de reporte excede o ciclo de servico permitido a SF{link.sf}.
        </p>
      )}
    </div>
  )
}
