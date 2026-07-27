import { useEffect, useState } from 'react'
import { desktop, type LnsDispositivo, type LnsLigacaoEstado } from '../desktop'
import type { LnsReadingEntry } from '../lns'
import type { DeviceItem } from '../types'

interface LnsPanelProps {
  devices: DeviceItem[]
  lnsReadings: Map<string, LnsReadingEntry>
  lnsDispositivos: LnsDispositivo[]
  onListarDispositivos: () => Promise<{ ok: boolean; motivo?: string } | undefined>
  onClose: () => void
}

type EstadoTeste = { tipo: 'idle' } | { tipo: 'a-testar' } | { tipo: 'ok'; totalDispositivos?: number } | { tipo: 'erro'; motivo: string }

/**
 * Ecra de ligacao a um LNS (ChirpStack). O URL base, Application ID e token
 * sao guardados por instalacao no processo principal — nunca no ficheiro de
 * projeto — e o token nunca volta a aparecer aqui depois de guardado.
 */
export function LnsPanel({ devices, lnsReadings, lnsDispositivos, onListarDispositivos, onClose }: LnsPanelProps) {
  const [ligacao, setLigacao] = useState<LnsLigacaoEstado | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [teste, setTeste] = useState<EstadoTeste>({ tipo: 'idle' })
  const [aGuardar, setAGuardar] = useState(false)

  useEffect(() => {
    desktop()
      ?.lnsObterLigacao()
      .then((estado) => {
        setLigacao(estado)
        if (estado.configurado) {
          setBaseUrl(estado.baseUrl ?? '')
          setApplicationId(estado.applicationId ?? '')
        }
      })
  }, [])

  async function testar() {
    setTeste({ tipo: 'a-testar' })
    const resultado = await desktop()?.lnsTestarLigacao({ baseUrl, applicationId, apiToken })
    if (resultado?.ok) setTeste({ tipo: 'ok', totalDispositivos: resultado.totalDispositivos })
    else setTeste({ tipo: 'erro', motivo: resultado?.motivo ?? 'Falha desconhecida.' })
  }

  async function guardar() {
    setAGuardar(true)
    try {
      const resultado = await desktop()?.lnsGuardarLigacao({ baseUrl, applicationId, apiToken })
      if (!resultado?.ok) {
        setTeste({ tipo: 'erro', motivo: resultado?.motivo ?? 'Nao foi possivel guardar.' })
        return
      }
      setLigacao((await desktop()?.lnsObterLigacao()) ?? null)
      setApiToken('')
      await onListarDispositivos()
      setTeste({ tipo: 'idle' })
    } finally {
      setAGuardar(false)
    }
  }

  async function remover() {
    await desktop()?.lnsRemoverLigacao()
    setLigacao({ configurado: false })
    setBaseUrl('')
    setApplicationId('')
    setApiToken('')
    setTeste({ tipo: 'idle' })
  }

  const sensoresAssociados = devices.filter((d) => d.type === 'sensor' && d.devEui)

  return (
    <div className="inspector">
      <div className="panel-header-row">
        <h3>Ligacao ao LNS</h3>
        <button type="button" className="link-btn" onClick={onClose}>
          Fechar
        </button>
      </div>

      <p className="panel-hint">
        Le dispositivos e metricas de um ChirpStack v4 atraves do gateway REST oficial (
        <code>chirpstack-rest-api</code>, porta 8090 por omissao — o ChirpStack v4 nao tem REST embutido). O
        device-profile de cada sensor no ChirpStack precisa de um codec com "measurements" configurados, senao{' '}
        <code>/metrics</code> nao devolve valores.
      </p>

      <label>
        URL base
        <input
          type="text"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="http://192.168.1.10:8090"
        />
      </label>
      <label>
        Application ID
        <input
          type="text"
          value={applicationId}
          onChange={(event) => setApplicationId(event.target.value)}
          placeholder="UUID da aplicacao no ChirpStack"
        />
      </label>
      <label>
        API Token
        <input
          type="password"
          value={apiToken}
          onChange={(event) => setApiToken(event.target.value)}
          placeholder={ligacao?.configurado ? 'Guardado — introduz de novo para substituir' : 'Criado em API Keys'}
        />
      </label>

      <div className="field-grid">
        <button type="button" className="link-btn" onClick={testar} disabled={!baseUrl || !applicationId || !apiToken}>
          Testar ligacao
        </button>
        <button type="button" className="link-btn" onClick={guardar} disabled={aGuardar || !baseUrl || !applicationId || !apiToken}>
          {aGuardar ? 'A guardar...' : 'Guardar'}
        </button>
      </div>

      {teste.tipo === 'a-testar' && <p className="panel-hint">A testar...</p>}
      {teste.tipo === 'ok' && (
        <p className="panel-hint" style={{ color: '#22c55e' }}>
          Ligado — {teste.totalDispositivos ?? 0} dispositivo(s) na aplicacao.
        </p>
      )}
      {teste.tipo === 'erro' && (
        <p className="panel-hint" style={{ color: '#ef4444' }}>
          {teste.motivo}
        </p>
      )}

      {ligacao?.configurado && (
        <>
          <p className="panel-hint">
            Ligado a <strong>{ligacao.baseUrl}</strong>.
          </p>
          <button type="button" className="link-btn" onClick={remover}>
            Remover ligacao
          </button>
        </>
      )}

      <div className="panel-header-row">
        <h3>Dispositivos descobertos ({lnsDispositivos.length})</h3>
        <button type="button" className="link-btn" onClick={() => onListarDispositivos()}>
          Atualizar
        </button>
      </div>
      {lnsDispositivos.length === 0 ? (
        <p className="panel-hint">Nenhum ainda — guarda a ligacao e atualiza a lista.</p>
      ) : (
        <ul className="device-list">
          {lnsDispositivos.map((d) => (
            <li key={d.devEui} className="device-row-item">
              <span className="device-row-text">
                <span className="device-row-name">{d.nome}</span>
                <span className="device-row-model">{d.devEui}</span>
              </span>
              <span
                className="metric-dot"
                title={lnsReadings.has(d.devEui) ? 'Com leitura recente' : 'Sem leitura recente'}
                style={{ background: lnsReadings.has(d.devEui) ? '#22c55e' : '#5b6472' }}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="panel-hint">
        {sensoresAssociados.length} sensor(es) colocados na planta com DevEUI associado. Associa cada sensor na sua
        ficha (painel Dispositivos &middot; Lista).
      </p>
    </div>
  )
}
