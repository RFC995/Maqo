import {
  batteryLabel,
  categoryLabels,
  groupByCategory,
  measurementLabels,
  modelsForType,
  powerLabels,
  resolveModel,
  type DeviceModel,
} from '../catalog'
import type { DeviceType } from '../types'
import { DeviceArtwork } from './DeviceArtwork'

function optionLabel(model: DeviceModel) {
  return model.brand === 'Generico' ? model.name : `${model.model} — ${model.name.replace(`${model.model} `, '')}`
}

/** Compact dropdown, grouped by product family, for tight spots like the inspector. */
export function ModelPicker({
  type,
  value,
  onChange,
  id,
}: {
  type: DeviceType
  value: string
  onChange: (modelId: string) => void
  id?: string
}) {
  const groups = groupByCategory(modelsForType(type))
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {groups.map(([category, models]) => (
        <optgroup key={category} label={categoryLabels[category]}>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {optionLabel(model)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

/**
 * Visual catalog: each model shown with artwork matching its real form factor,
 * so you pick the device by recognising it rather than by reading a code.
 */
export function ModelGallery({
  type,
  value,
  onChange,
}: {
  type: DeviceType
  value: string
  onChange: (modelId: string) => void
}) {
  const groups = groupByCategory(modelsForType(type))

  return (
    <div className="model-gallery">
      {groups.map(([category, models]) => (
        <div key={category} className="gallery-group">
          <span className="gallery-group-title">{categoryLabels[category]}</span>
          <div className="gallery-grid">
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                className={model.id === value ? 'gallery-card active' : 'gallery-card'}
                onClick={() => onChange(model.id)}
                title={model.description}
              >
                <DeviceArtwork model={model} size={46} />
                <span className="gallery-card-model">{model.model === '—' ? model.name : model.model}</span>
                <span className="gallery-card-tag">
                  {model.measures.length > 0
                    ? `${model.measures.length} medida${model.measures.length > 1 ? 's' : ''}`
                    : model.gateway
                      ? `${model.gateway.channels} canais`
                      : model.ip}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="spec-row">
      <span className="spec-key">{label}</span>
      <span className="spec-value">{value}</span>
    </div>
  )
}

/** Datasheet block: everything published for the model, nothing inferred. */
export function ModelSpecSheet({ modelId }: { modelId: string | undefined }) {
  const model = resolveModel(modelId)
  if (!model) return null

  return (
    <div className="spec-sheet">
      <div className="spec-hero">
        <DeviceArtwork model={model} size={58} />
        <div className="spec-head">
          <span className="spec-brand">{model.brand}</span>
          <span className="spec-model">{model.model}</span>
          <span className="spec-subtitle">{model.name.replace(`${model.model} `, '')}</span>
        </div>
      </div>
      <p className="spec-desc">{model.description}</p>

      {model.measures.length > 0 && (
        <div className="spec-tags">
          {model.measures.map((m) => (
            <span key={m} className="spec-tag">
              {measurementLabels[m]}
            </span>
          ))}
        </div>
      )}

      <div className="spec-grid">
        <Row label="Alimentacao" value={model.power.map((p) => powerLabels[p]).join(' / ')} />
        {model.battery && <Row label="Bateria" value={batteryLabel(model)} />}
        <Row label="Protecao" value={model.ip} />
        <Row label="Montagem" value={model.mounting.join(', ')} />
        <Row label="Temp. de servico" value={`${model.tempRange[0]} a ${model.tempRange[1]} °C`} />
        {model.radio && <Row label="Classe LoRaWAN" value={`Classe ${model.radio.class}`} />}
        {model.gateway && (
          <>
            <Row
              label="Canais"
              value={`${model.gateway.channels} (${model.gateway.duplex === 'half' ? 'half-duplex' : 'half/full-duplex'})`}
            />
            <Row label="Capacidade" value={`${model.gateway.maxNodes.toLocaleString('pt-PT')}+ nos`} />
            <Row label="Antena" value={`${model.gateway.antennaDbi} dBi`} />
            {model.gateway.chipset && <Row label="Chipset" value={model.gateway.chipset} />}
          </>
        )}
        {model.detection && <DetectionRows model={model} />}
      </div>
    </div>
  )
}

function DetectionRows({ model }: { model: DeviceModel }) {
  const d = model.detection!
  return (
    <>
      {d.areaW !== undefined && (
        <Row label="Area coberta" value={d.areaD ? `${d.areaW} x ${d.areaD} m` : `${d.areaW} m de largura`} />
      )}
      {d.rangeM !== undefined && <Row label="Alcance" value={`${d.rangeM} m`} />}
      {d.fovH !== undefined && <Row label="Campo de visao" value={`${d.fovH}° H x ${d.fovV}° V`} />}
      {d.mountHeight && <Row label="Altura de montagem" value={`${d.mountHeight[0]} a ${d.mountHeight[1]} m`} />}
      {d.accuracy && <Row label="Precisao" value={d.accuracy} />}
    </>
  )
}
