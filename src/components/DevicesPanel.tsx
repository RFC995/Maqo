import type { CSSProperties } from 'react'
import {
  deviceColors,
  deviceDefaultRadius,
  deviceLabels,
  mountLabels,
  type BuildingConfig,
  type DeviceItem,
  type DeviceType,
  type FloorSelector,
  type MountType,
} from '../types'
import { planPresets, type PlanPreset } from '../planPresets'
import { catalogById, modelsForType } from '../catalog'
import { GatewayIcon, SensorIcon, CameraIcon, RepeaterIcon, TrashIcon, LayersIcon } from './icons'

const deviceIcons: Record<DeviceType, typeof GatewayIcon> = {
  gateway: GatewayIcon,
  sensor: SensorIcon,
  camera: CameraIcon,
  repeater: RepeaterIcon,
}

interface DevicesPanelProps {
  building: BuildingConfig
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
}

export function DevicesPanel({
  building,
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
}: DevicesPanelProps) {
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null

  return (
    <>
      <div className="panel-block">
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
          <label className="model-picker">
            Modelo do {deviceLabels[placementType].toLowerCase()}
            <select value={placementModelId} onChange={(event) => onSelectModel(event.target.value)}>
              {modelsForType(placementType).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.brand} &middot; {model.name}
                </option>
              ))}
            </select>
            {catalogById[placementModelId] && (
              <span className="model-desc">{catalogById[placementModelId].description}</span>
            )}
          </label>
        )}
        {activeFloor === 'all' && (
          <p className="panel-hint warn">Seleciona um piso, a cobertura ou o exterior para colocar dispositivos.</p>
        )}
        {placementType && activeFloor !== 'all' && (
          <p className="panel-hint accent">Modo colocacao ativo &mdash; clica na planta. Escape para sair.</p>
        )}
      </div>

      <div className="panel-block">
        <div className="panel-header-row">
          <h3>
            <LayersIcon size={14} /> Planos de instalacao
          </h3>
        </div>
        <p className="panel-hint">
          Modelos prontos: aplicam automaticamente uma instalacao completa ajustada as dimensoes do edificio.
        </p>
        <div className="plan-list">
          {planPresets.map((preset) => (
            <div key={preset.id} className="plan-card">
              <div className="plan-card-info">
                <span className="plan-card-name">{preset.name}</span>
                <span className="plan-card-desc">{preset.description}</span>
              </div>
              <button type="button" className="plan-apply-btn" onClick={() => onApplyPlan(preset)}>
                Aplicar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block coverage-panel">
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
          <span className="zone-chip strong">Sinal forte</span>
          <span className="zone-chip medium">Medio</span>
          <span className="zone-chip weak">Fraco</span>
        </div>
      </div>

      <div className="panel-block device-list-panel">
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
              return (
                <li key={device.id} className="device-row-item">
                  <button
                    type="button"
                    className={device.id === selectedDeviceId ? 'device-row active' : 'device-row'}
                    onClick={() => onSelectDevice(device.id)}
                  >
                    <Icon size={15} className="device-row-icon" style={{ color: deviceColors[device.type] }} />
                    <span className="device-row-text">
                      <span className="device-row-name">{device.name}</span>
                      {device.modelId && catalogById[device.modelId] && (
                        <span className="device-row-model">{catalogById[device.modelId].name}</span>
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
  onUpdate,
  onDelete,
  onFocusFloor,
}: {
  device: DeviceItem
  building: BuildingConfig
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
        <select
          value={device.modelId ?? ''}
          onChange={(event) => {
            const model = catalogById[event.target.value]
            if (model) onUpdate({ modelId: model.id, radius: model.radius })
          }}
        >
          {modelsForType(device.type).map((model) => (
            <option key={model.id} value={model.id}>
              {model.brand} &middot; {model.name}
            </option>
          ))}
        </select>
      </label>

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
      <button type="button" className="link-btn" onClick={() => onUpdate({ radius: deviceDefaultRadius[device.type] })}>
        Repor raio predefinido
      </button>

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
