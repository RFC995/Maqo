import { useState } from 'react'
import { configPronta, haQuanto, provedorLabels, type ConfigIntegracao, type Provedor } from '../integracao'
import { listaDevEuis, type EstadoIntegracao } from '../liveStore'
import { useLiveVersion } from '../useLive'
import { measurementLabels, type Measurement } from '../catalog'
import { formatReading } from '../telemetry'
import { CloudIcon } from './icons'

interface IntegracaoPanelProps {
  suportado: boolean
  config: ConfigIntegracao
  onConfig: (c: ConfigIntegracao) => void
  estado: EstadoIntegracao
  onLigar: () => void
  onDesligar: () => void
}

const estadoTexto: Record<EstadoIntegracao['estado'], string> = {
  desligado: 'Desligado',
  'a-ligar': 'A ligar...',
  ligado: 'Ligado',
  erro: 'Erro',
}

export function IntegracaoPanel({ suportado, config, onConfig, estado, onLigar, onDesligar }: IntegracaoPanelProps) {
  useLiveVersion() // re-render as uplinks land
  const [ajudaAberta, setAjudaAberta] = useState(false)

  if (!suportado) {
    return (
      <section className="panel">
        <h2>
          <CloudIcon size={15} /> TTN / ChirpStack
        </h2>
        <p className="panel-hint warn">
          A ligacao em tempo real ao The Things Network e ao ChirpStack so esta disponivel na aplicacao de ambiente de
          trabalho (Maqo desktop), porque o browser nao consegue abrir a ligacao MQTT ao servidor de rede.
        </p>
      </section>
    )
  }

  const provedor = config.provedor
  const ocupado = estado.estado === 'a-ligar'
  const ligado = estado.estado === 'ligado'
  const pronto = configPronta(config)
  const detetados = listaDevEuis()

  function definirProvedor(p: Provedor) {
    onConfig({ ...config, provedor: p })
  }
  function patchTTN(patch: Partial<ConfigIntegracao['ttn']>) {
    onConfig({ ...config, ttn: { ...config.ttn, ...patch } })
  }
  function patchChirp(patch: Partial<ConfigIntegracao['chirpstack']>) {
    onConfig({ ...config, chirpstack: { ...config.chirpstack, ...patch } })
  }

  return (
    <section className="panel integracao-panel">
      <h2>
        <CloudIcon size={15} /> TTN / ChirpStack
      </h2>

      <div className={`integracao-estado estado-${estado.estado}`}>
        <span className="estado-ponto" />
        <span className="estado-nome">{estadoTexto[estado.estado]}</span>
        {estado.provedor && <span className="estado-provedor">{provedorLabels[estado.provedor]}</span>}
      </div>
      {estado.mensagem && <p className={`panel-hint ${estado.estado === 'erro' ? 'warn' : ''}`}>{estado.mensagem}</p>}

      <label>
        Servidor de rede
        <select value={provedor} onChange={(e) => definirProvedor(e.target.value as Provedor)} disabled={ocupado}>
          {(Object.keys(provedorLabels) as Provedor[]).map((p) => (
            <option key={p} value={p}>
              {provedorLabels[p]}
            </option>
          ))}
        </select>
      </label>

      {provedor === 'ttn' ? (
        <>
          <label>
            Cluster (host)
            <input
              type="text"
              value={config.ttn.host}
              placeholder="eu1.cloud.thethings.network"
              onChange={(e) => patchTTN({ host: e.target.value.trim() })}
              disabled={ocupado}
            />
          </label>
          <div className="field-grid">
            <label>
              Application ID
              <input
                type="text"
                value={config.ttn.appId}
                placeholder="a-minha-app"
                onChange={(e) => patchTTN({ appId: e.target.value.trim() })}
                disabled={ocupado}
              />
            </label>
            <label>
              Tenant
              <input
                type="text"
                value={config.ttn.tenant}
                placeholder="ttn"
                onChange={(e) => patchTTN({ tenant: e.target.value.trim() })}
                disabled={ocupado}
              />
            </label>
          </div>
          <label>
            API key
            <input
              type="password"
              value={config.ttn.apiKey}
              placeholder="NNSXS...."
              onChange={(e) => patchTTN({ apiKey: e.target.value.trim() })}
              disabled={ocupado}
              autoComplete="off"
            />
          </label>
        </>
      ) : (
        <>
          <div className="field-grid">
            <label>
              Host do broker
              <input
                type="text"
                value={config.chirpstack.host}
                placeholder="chirpstack.exemplo.pt"
                onChange={(e) => patchChirp({ host: e.target.value.trim() })}
                disabled={ocupado}
              />
            </label>
            <label>
              Porta
              <input
                type="number"
                value={config.chirpstack.porta}
                onChange={(e) => patchChirp({ porta: Number(e.target.value) })}
                disabled={ocupado}
              />
            </label>
          </div>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={config.chirpstack.tls}
              onChange={(e) => patchChirp({ tls: e.target.checked, porta: e.target.checked ? 8883 : 1883 })}
              disabled={ocupado}
            />
            Ligacao TLS (porta 8883)
          </label>
          <label>
            Application ID (opcional)
            <input
              type="text"
              value={config.chirpstack.appId}
              placeholder="todas se vazio"
              onChange={(e) => patchChirp({ appId: e.target.value.trim() })}
              disabled={ocupado}
            />
          </label>
          <div className="field-grid">
            <label>
              Utilizador
              <input
                type="text"
                value={config.chirpstack.utilizador}
                onChange={(e) => patchChirp({ utilizador: e.target.value })}
                disabled={ocupado}
                autoComplete="off"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={config.chirpstack.password}
                onChange={(e) => patchChirp({ password: e.target.value })}
                disabled={ocupado}
                autoComplete="off"
              />
            </label>
          </div>
        </>
      )}

      <label className="switch-row">
        <input
          type="checkbox"
          checked={config.ligarAoIniciar}
          onChange={(e) => onConfig({ ...config, ligarAoIniciar: e.target.checked })}
        />
        Ligar automaticamente ao abrir
      </label>

      <div className="integracao-acoes">
        {ligado || ocupado ? (
          <button type="button" className="secondary" onClick={onDesligar}>
            Desligar
          </button>
        ) : (
          <button type="button" onClick={onLigar} disabled={!pronto}>
            Ligar
          </button>
        )}
      </div>
      {!pronto && !ligado && (
        <p className="panel-hint">Preenche os campos acima para ligar ao servidor de rede.</p>
      )}

      <div className="integracao-detetados">
        <span className="block-title">
          Dispositivos detetados {detetados.length > 0 && `(${detetados.length})`}
        </span>
        {detetados.length === 0 ? (
          <p className="panel-hint">
            {ligado
              ? 'A aguardar o primeiro uplink. Os sensores LoRaWAN so reportam de tempos a tempos (ex.: a cada 10 min).'
              : 'Liga-te ao servidor para ver os sensores que estao a reportar.'}
          </p>
        ) : (
          <ul className="detetado-list">
            {detetados.map((d) => {
              const medidas = Object.keys(d.valores) as Measurement[]
              return (
                <li key={d.devEui} className="detetado-item">
                  <div className="detetado-topo">
                    <code className="detetado-eui">{d.devEui}</code>
                    <span className="detetado-tempo">{haQuanto(d.at)}</span>
                  </div>
                  {d.deviceId && <span className="detetado-nome">{d.deviceId}</span>}
                  <div className="detetado-valores">
                    {medidas.slice(0, 4).map((m) => (
                      <span key={m} className="detetado-chip">
                        {measurementLabels[m]}: {formatReading(m, d.valores[m] ?? null)}
                      </span>
                    ))}
                    {medidas.length === 0 && <span className="detetado-chip vazio">sem campos descodificados</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="panel-hint">
          Copia o DevEUI para um sensor em <strong>Dispositivos &rarr; Lista</strong>, no campo DevEUI, para o
          dashboard passar a mostrar os dados reais desse sensor.
        </p>
      </div>

      <button type="button" className="link-btn" onClick={() => setAjudaAberta((v) => !v)}>
        {ajudaAberta ? 'Ocultar' : 'Como ligar?'}
      </button>
      {ajudaAberta && (
        <div className="integracao-ajuda">
          {provedor === 'ttn' ? (
            <ol>
              <li>Na consola do The Things Stack, abre a tua Application.</li>
              <li>
                Vai a <em>API keys</em> &rarr; <em>Add API key</em> e concede{' '}
                <em>Read application traffic (uplink and downlink)</em>. Copia a chave (comeca por NNSXS.).
              </li>
              <li>
                O host e o cluster da tua aplicacao (ex.: <code>eu1.cloud.thethings.network</code>) e o tenant e{' '}
                <code>ttn</code> na rede comunitaria.
              </li>
              <li>Preenche acima e liga. Os uplinks aparecem aqui a medida que os sensores reportam.</li>
              <li>
                Para veres valores descodificados (temperatura, CO2...), o dispositivo tem de ter um{' '}
                <em>payload formatter</em> configurado na TTN (os modelos Milesight ja trazem um no repositorio).
              </li>
            </ol>
          ) : (
            <ol>
              <li>Usa o host e a porta do broker MQTT do teu servidor ChirpStack (1883, ou 8883 com TLS).</li>
              <li>Se o broker exigir autenticacao, preenche utilizador e password.</li>
              <li>
                Deixa o Application ID vazio para ouvir todas as aplicacoes, ou indica um id para filtrar. O Maqo
                subscreve <code>application/+/device/+/event/up</code>.
              </li>
              <li>
                Os valores descodificados vem do <em>device profile codec</em> configurado no ChirpStack.
              </li>
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
