import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../types'
import { batteryLabel, measurementLabels, powerLabels } from '../catalog'
import { EU868, linkQualityColors, linkQualityLabels, sfColors, type Propagation } from '../rf'
import { propagationPresets } from '../rf'
import {
  areaConstruida,
  dataPortuguesa,
  dispositivosPorPiso,
  listaDeMaterial,
  orcamentoDeLigacoes,
  resumoDaRede,
} from '../relatorio'

interface RelatorioProps {
  project: Project
  propagation: Propagation
  propagationPreset: string
  uplinkMinutes: number
  /** PNG data URL of the 3D view, when one could be captured */
  imagem3D: string | null
  onFechar: () => void
  onImprimir: () => void
  aGerarPdf: boolean
}

/**
 * The deliverable: bill of materials, per-floor placement and the link budget,
 * laid out for A4. Everything here is derived from the project, so the numbers
 * always match what the planner sees on screen.
 */
export function Relatorio({
  project,
  propagation,
  propagationPreset,
  uplinkMinutes,
  imagem3D,
  onFechar,
  onImprimir,
  aGerarPdf,
}: RelatorioProps) {
  const building = project.building

  const material = useMemo(() => listaDeMaterial(project.devices), [project.devices])
  const pisos = useMemo(() => dispositivosPorPiso(project), [project])
  const ligacoes = useMemo(() => orcamentoDeLigacoes(project, propagation), [project, propagation])
  const resumo = useMemo(
    () => resumoDaRede(project, propagation, uplinkMinutes),
    [project, propagation, uplinkMinutes],
  )

  const totalUnidades = material.reduce((s, l) => s + l.quantidade, 0)
  const problemas = ligacoes.filter((l) => l.link.sf === null || l.link.quality === 'marginal')

  /*
   * Rendered into <body> rather than inside the app tree: it is a full-screen
   * fixed layer, and the print stylesheet hides #root wholesale — nested inside
   * it, the report was being hidden along with everything else and the PDF came
   * out blank.
   */
  return createPortal(
    <div className="relatorio-overlay">
      <div className="relatorio-barra">
        <span className="relatorio-barra-titulo">Relatorio de proposta</span>
        <div className="relatorio-barra-accoes">
          <button type="button" className="secondary" onClick={onFechar}>
            Fechar
          </button>
          <button type="button" className="primary" onClick={onImprimir} disabled={aGerarPdf}>
            {aGerarPdf ? 'A gerar...' : 'Guardar PDF / Imprimir'}
          </button>
        </div>
      </div>

      <div className="relatorio-scroll">
        <article className="folha">
          {/* ------------------------------------------------ capa / resumo */}
          <header className="folha-cabecalho">
            <div>
              <span className="folha-etiqueta">Proposta de instalacao LoRaWAN</span>
              <h1>{building.name}</h1>
              <p className="folha-subtitulo">
                {building.floors} piso{building.floors > 1 ? 's' : ''} &middot; {building.width} &times;{' '}
                {building.depth} m &middot; {areaConstruida(building).toLocaleString('pt-PT')} m&sup2; de area bruta
              </p>
            </div>
            <div className="folha-marca">
              <span className="folha-marca-nome">Maqo</span>
              <span className="folha-data">{dataPortuguesa()}</span>
            </div>
          </header>

          {imagem3D && (
            <figure className="folha-figura">
              <img src={imagem3D} alt={`Vista 3D de ${building.name}`} />
              <figcaption>Vista da maquete com os dispositivos posicionados.</figcaption>
            </figure>
          )}

          <section className="folha-seccao">
            <h2>Resumo da solucao</h2>
            <div className="folha-cartoes">
              <Cartao valor={String(totalUnidades)} rotulo="Equipamentos" />
              <Cartao valor={String(resumo.gateways)} rotulo="Gateways" />
              <Cartao valor={String(resumo.nos)} rotulo="Nos LoRaWAN" />
              <Cartao
                valor={String(resumo.semCobertura)}
                rotulo="Sem cobertura"
                tom={resumo.semCobertura > 0 ? 'mau' : 'bom'}
              />
            </div>
            {resumo.semCobertura === 0 && resumo.marginais === 0 ? (
              <p className="folha-nota bom">
                Todos os nos fecham o link com margem confortavel para o modelo de propagacao considerado.
              </p>
            ) : (
              <p className="folha-nota aviso">
                {resumo.semCobertura > 0 && `${resumo.semCobertura} no(s) sem cobertura. `}
                {resumo.marginais > 0 && `${resumo.marginais} ligacao(oes) marginal(is). `}
                Ver o capitulo &ldquo;Pontos a rever&rdquo;.
              </p>
            )}
          </section>

          {/* --------------------------------------------------- material */}
          <section className="folha-seccao quebra-antes">
            <h2>Lista de material</h2>
            <table className="folha-tabela">
              <thead>
                <tr>
                  <th className="col-qtd">Qt.</th>
                  <th>Modelo</th>
                  <th>Descricao</th>
                  <th>Alimentacao</th>
                  <th>Protecao</th>
                </tr>
              </thead>
              <tbody>
                {material.map((linha) => (
                  <tr key={linha.model.id}>
                    <td className="col-qtd">{linha.quantidade}</td>
                    <td>
                      <strong>{linha.model.model}</strong>
                      <span className="col-marca">{linha.model.brand}</span>
                    </td>
                    <td>
                      {linha.model.name.replace(`${linha.model.model} `, '')}
                      {linha.model.measures.length > 0 && (
                        <span className="col-medidas">
                          {linha.model.measures.map((m) => measurementLabels[m]).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {linha.model.power.map((p) => powerLabels[p]).join(' / ')}
                      {linha.model.battery && <span className="col-bateria">{batteryLabel(linha.model)}</span>}
                    </td>
                    <td>{linha.model.ip}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="col-qtd">{totalUnidades}</td>
                  <td colSpan={4}>Total de equipamentos</td>
                </tr>
              </tfoot>
            </table>
            <p className="folha-rodape-nota">
              Precos nao incluidos. Cablagem, alimentacao e mao de obra a orcamentar separadamente.
            </p>
          </section>

          {/* ------------------------------------------------- por piso */}
          <section className="folha-seccao quebra-antes">
            <h2>Localizacao por piso</h2>
            {pisos.map((grupo) => (
              <div key={grupo.piso} className="folha-piso">
                <h3>
                  {grupo.piso} <span className="folha-piso-contagem">{grupo.devices.length} equipamento(s)</span>
                </h3>
                <table className="folha-tabela compacta">
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Identificacao</th>
                      <th>Espaco</th>
                      <th className="col-num">X (m)</th>
                      <th className="col-num">Z (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.devices.map(({ device, model, sala }) => (
                      <tr key={device.id}>
                        <td>
                          <strong>{model?.model ?? '—'}</strong>
                        </td>
                        <td>{device.name}</td>
                        <td>{sala}</td>
                        <td className="col-num">{device.x.toFixed(1)}</td>
                        <td className="col-num">{device.z.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>

          {/* -------------------------------------------- pontos a rever */}
          {problemas.length > 0 && (
            <section className="folha-seccao quebra-antes">
              <h2>Pontos a rever</h2>
              <p className="folha-intro">
                Nos cujo link nao fecha, ou fecha sem margem suficiente para variacoes de ocupacao e mobiliario.
              </p>
              <table className="folha-tabela compacta">
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th>Local</th>
                    <th className="col-num">Dist.</th>
                    <th className="col-num">Lajes</th>
                    <th className="col-num">RSSI</th>
                    <th>SF</th>
                    <th className="col-num">Margem</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {problemas.map(({ device, local, link }) => (
                    <tr key={device.id}>
                      <td>{device.name}</td>
                      <td>{local}</td>
                      <td className="col-num">{link.distance.toFixed(1)} m</td>
                      <td className="col-num">{link.floorsCrossed}</td>
                      <td className="col-num">{Math.round(link.rssiDbm)} dBm</td>
                      <td style={{ color: link.sf ? sfColors[link.sf] : undefined }}>
                        {link.sf ? `SF${link.sf}` : '—'}
                      </td>
                      <td className="col-num">{Math.round(link.marginDb)} dB</td>
                      <td style={{ color: linkQualityColors[link.quality] }}>{linkQualityLabels[link.quality]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ------------------------------------------ ligacoes completas */}
          <section className="folha-seccao quebra-antes">
            <h2>Orcamento de ligacao</h2>
            <table className="folha-tabela compacta">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Gateway</th>
                  <th className="col-num">Dist.</th>
                  <th className="col-num">Obstaculos</th>
                  <th className="col-num">RSSI</th>
                  <th className="col-num">SNR</th>
                  <th>SF</th>
                  <th className="col-num">Airtime</th>
                </tr>
              </thead>
              <tbody>
                {ligacoes.map(({ device, link }) => (
                  <tr key={device.id}>
                    <td>{device.name}</td>
                    <td>{link.gatewayName ?? '—'}</td>
                    <td className="col-num">{link.distance.toFixed(1)} m</td>
                    <td className="col-num">{Math.round(link.obstacleDb)} dB</td>
                    <td className="col-num">{Math.round(link.rssiDbm)}</td>
                    <td className="col-num">{Math.round(link.snrDb)}</td>
                    <td style={{ color: link.sf ? sfColors[link.sf] : undefined }}>
                      {link.sf ? `SF${link.sf}` : 'fora'}
                    </td>
                    <td className="col-num">{link.airtimeMs.toFixed(0)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ------------------------------------------ metodologia */}
          <section className="folha-seccao">
            <h2>Parametros do estudo</h2>
            <table className="folha-tabela compacta">
              <tbody>
                <tr>
                  <th>Banda</th>
                  <td>
                    EU868 &middot; {EU868.bandwidthHz / 1000} kHz &middot; limite ERP {EU868.maxErpDbm} dBm &middot;
                    ciclo de servico {EU868.dutyCycle * 100}%
                  </td>
                </tr>
                <tr>
                  <th>Ambiente</th>
                  <td>{propagationPresets[propagationPreset]?.label ?? propagationPreset}</td>
                </tr>
                <tr>
                  <th>Modelo</th>
                  <td>
                    Log-distancia n={propagation.exponent} &middot; margem de desvanecimento{' '}
                    {propagation.fadeMarginDb} dB &middot; {propagation.floorSlabDb} dB por laje &middot;{' '}
                    {propagation.interiorWallDb} dB por divisoria &middot; {propagation.facadeDb} dB na fachada
                  </td>
                </tr>
                <tr>
                  <th>Reporte</th>
                  <td>{uplinkMinutes} minutos entre uplinks</td>
                </tr>
                <tr>
                  <th>Ocupacao do canal</th>
                  <td>
                    {(resumo.cargaCanal * 100).toFixed(1)}% no gateway mais carregado
                    {resumo.foraDoCicloDeServico > 0 &&
                      ` · ${resumo.foraDoCicloDeServico} no(s) acima do ciclo de servico permitido`}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="folha-rodape-nota">
              Estimativa por modelo de propagacao, nao substitui levantamento no local. Sensibilidades por spreading
              factor conforme o chipset SX1302; tempos de emissao pela formula de time-on-air LoRa.
            </p>
          </section>
        </article>
      </div>
    </div>,
    document.body,
  )
}

function Cartao({ valor, rotulo, tom = 'neutro' }: { valor: string; rotulo: string; tom?: 'neutro' | 'bom' | 'mau' }) {
  return (
    <div className={`folha-cartao ${tom}`}>
      <span className="folha-cartao-valor">{valor}</span>
      <span className="folha-cartao-rotulo">{rotulo}</span>
    </div>
  )
}
