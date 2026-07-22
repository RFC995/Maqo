import { useMemo } from 'react'
import type { BuildingConfig, DeviceItem } from '../types'
import { resolveModel } from '../catalog'
import {
  EU868,
  SPREADING_FACTORS,
  coverageRings,
  dataRate,
  propagationPresets,
  sfColors,
  summariseNetwork,
  type Propagation,
} from '../rf'
import { SignalIcon } from './icons'

interface NetworkPanelProps {
  building: BuildingConfig
  devices: DeviceItem[]
  propagation: Propagation
  propagationPreset: string
  onPropagationPreset: (key: string) => void
  uplinkMinutes: number
  onUplinkMinutes: (minutes: number) => void
  onSelectDevice: (id: string) => void
}

/**
 * Network-level read-out: capacity, coverage gaps, spreading-factor spread and
 * duty-cycle headroom. These are the four things that actually decide whether a
 * LoRaWAN deployment works before anyone climbs a ladder.
 */
export function NetworkPanel({
  building,
  devices,
  propagation,
  propagationPreset,
  onPropagationPreset,
  uplinkMinutes,
  onUplinkMinutes,
  onSelectDevice,
}: NetworkPanelProps) {
  const summary = useMemo(
    () => summariseNetwork(devices, building, propagation, uplinkMinutes),
    [devices, building, propagation, uplinkMinutes],
  )

  const primaryGateway = devices.find((d) => d.type === 'gateway')
  const rings = primaryGateway ? coverageRings(primaryGateway, propagation, [...SPREADING_FACTORS]) : []
  const maxSf = Math.max(1, ...SPREADING_FACTORS.map((sf) => summary.sfHistogram[sf]))
  // above roughly 10% occupancy an ALOHA channel starts losing uplinks to collisions
  const loadPct = summary.channelLoad * 100
  const loadTone = loadPct > 10 ? 'bad' : loadPct > 5 ? 'warn' : 'ok'
  const indoorGateway = primaryGateway && primaryGateway.mount !== 'ground'

  return (
    <section className="panel network-panel">
      <h2>
        <SignalIcon size={15} /> Analise de rede
      </h2>

      <label>
        Ambiente de propagacao
        <select value={propagationPreset} onChange={(event) => onPropagationPreset(event.target.value)}>
          {Object.entries(propagationPresets).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <p className="panel-hint">{propagationPresets[propagationPreset]?.hint}</p>

      <label className="range-row">
        Intervalo de reporte
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={uplinkMinutes}
          onChange={(event) => onUplinkMinutes(Number(event.target.value))}
        />
        <span className="range-value">{uplinkMinutes} min</span>
      </label>

      <div className="net-stats">
        <Stat label="Gateways" value={String(summary.gateways)} />
        <Stat
          label="Nos"
          value={`${summary.endDevices}`}
          sub={summary.capacity > 0 ? `de ${summary.capacity.toLocaleString('pt-PT')}` : 'sem gateway'}
          tone={summary.capacity > 0 && summary.endDevices > summary.capacity ? 'bad' : 'ok'}
        />
        <Stat
          label="Sem cobertura"
          value={String(summary.uncovered)}
          tone={summary.uncovered > 0 ? 'bad' : 'ok'}
        />
        <Stat label="Ligacoes marginais" value={String(summary.marginal)} tone={summary.marginal > 0 ? 'warn' : 'ok'} />
      </div>

      <div className="duty-block">
        <div className="duty-head">
          <span>Ocupacao do canal no gateway mais carregado</span>
          <strong className={loadTone}>{loadPct.toFixed(1)}%</strong>
        </div>
        <div className="duty-bar">
          <span className={loadTone} style={{ width: `${Math.min(100, loadPct * 6)}%` }} />
        </div>
        <p className="panel-hint">
          Airtime recebido, dividido pelos canais do gateway. Acima de ~10% as colisoes comecam a fazer perder uplinks —
          o limite ETSI de {EU868.dutyCycle * 100}% e por emissor e vem indicado em cada dispositivo.
        </p>
        {summary.overDutyCycle > 0 && (
          <p className="panel-hint warn">
            {summary.overDutyCycle} no(s) reportam mais vezes do que o ciclo de servico de {EU868.dutyCycle * 100}%
            permite ao seu spreading factor. Aumenta o intervalo de reporte.
          </p>
        )}
      </div>

      {summary.linked > 0 && (
        <div className="sf-block">
          <span className="block-title">Distribuicao por spreading factor</span>
          <div className="sf-bars">
            {SPREADING_FACTORS.map((sf) => {
              const count = summary.sfHistogram[sf]
              return (
                <div key={sf} className="sf-bar-col" title={`${count} nos a SF${sf} (${dataRate[sf].bps} bps)`}>
                  <div className="sf-bar-track">
                    <span
                      className="sf-bar-fill"
                      style={{ height: `${(count / maxSf) * 100}%`, background: sfColors[sf] }}
                    />
                  </div>
                  <span className="sf-bar-label">SF{sf}</span>
                  <span className="sf-bar-count">{count}</span>
                </div>
              )
            })}
          </div>
          <p className="panel-hint">
            SF baixo é rápido e barato em airtime; SF12 alcança mais longe mas ocupa a banda ~20x mais tempo.
          </p>
        </div>
      )}

      {rings.length > 0 && (
        <div className="range-table">
          <span className="block-title">
            Alcance calculado por SF {indoorGateway ? '(no interior do edificio)' : '(percurso limpo, exterior)'}
          </span>
          <ul>
            {rings.map((ring) => (
              <li key={ring.sf}>
                <span className="range-sf" style={{ color: ring.color }}>
                  SF{ring.sf}
                </span>
                <span className="range-dist">
                  {ring.radius >= 1000 ? `${(ring.radius / 1000).toFixed(2)} km` : `${Math.round(ring.radius)} m`}
                </span>
                <span className="range-bps">{(ring.bps / 1000).toFixed(2)} kbps</span>
              </li>
            ))}
          </ul>
          <p className="panel-hint">
            Modelo log-distancia n={propagation.exponent}, margem de desvanecimento {propagation.fadeMarginDb} dB,{' '}
            {propagation.floorSlabDb} dB por laje e {propagation.interiorWallDb} dB por divisoria
            {indoorGateway ? ' atravessada (uma a cada ~6 m no interior).' : '.'}
          </p>
        </div>
      )}

      {summary.uncovered > 0 && summary.worstDeviceId && (
        <button type="button" className="secondary" onClick={() => onSelectDevice(summary.worstDeviceId!)}>
          Ver o no com pior ligacao
        </button>
      )}

      {summary.gateways === 0 && devices.length > 0 && (
        <p className="panel-hint warn">Nenhum gateway colocado — os sensores nao tem para onde enviar.</p>
      )}
      {primaryGateway && (
        <p className="panel-hint">
          Gateway de referencia: {resolveModel(primaryGateway.modelId)?.model ?? 'generico'}.
        </p>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  sub,
  tone = 'ok',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'ok' | 'warn' | 'bad'
}) {
  return (
    <div className={`net-stat ${tone}`}>
      <span className="net-stat-value">{value}</span>
      {sub && <span className="net-stat-sub">{sub}</span>}
      <span className="net-stat-label">{label}</span>
    </div>
  )
}
