/**
 * Cliente REST para o ChirpStack v4.
 *
 * O ChirpStack v4 nao embute REST — a API nativa e gRPC. O que aqui se chama
 * e o gateway oficial `chirpstack-rest-api` (projeto separado, porta 8090 por
 * omissao) que traduz gRPC para REST/JSON. E um pre-requisito do lado do
 * cliente ter esse gateway ligado; o Maqo nao o gere.
 *
 * Endpoints e formas de mensagem confirmados contra o .proto oficial
 * (chirpstack/chirpstack, api/proto/api/device.proto e
 * api/proto/common/common.proto) — nao adivinhados:
 *   GET /api/devices?applicationId=..&limit=..
 *   GET /api/devices/{devEui}/metrics?start=..&end=..&aggregation=MINUTE
 * Autenticacao: header Authorization: Bearer <api-token>.
 *
 * GetMetrics so devolve dados quando o device-profile no ChirpStack tem um
 * codec configurado que decodifica o payload e regista os campos como
 * "measurements" — isso e responsabilidade da configuracao do ChirpStack do
 * cliente, nao algo que o Maqo controle.
 */

/**
 * Nomes de campo tipicos dos codecs Milesight/ChirpStack (ingles) -> chave de
 * Measurement do Maqo (src/catalog.ts). Melhor esforco: o nome exato do campo
 * depende de qual codec foi carregado no device-profile, por isso esta lista
 * pode precisar de ser estendida para um modelo/firmware concreto.
 */
const MAPA_MEDICOES = {
  temperature: 'temperatura',
  temp: 'temperatura',
  humidity: 'humidade',
  co2: 'co2',
  tvoc: 'tvoc',
  pressure: 'pressao',
  barometric_pressure: 'pressao',
  pm2_5: 'pm25',
  pm2p5: 'pm25',
  pm10: 'pm10',
  hcho: 'hcho',
  formaldehyde: 'hcho',
  o3: 'o3',
  ozone: 'o3',
  illumination: 'luz',
  light_level: 'luz',
  light: 'luz',
  noise: 'ruido',
  noise_db: 'ruido',
  sound: 'ruido',
  distance: 'distancia',
  water_leak: 'fuga',
  people_number: 'contagem',
  people_counting: 'contagem',
  current: 'corrente',
  power_consumption: 'consumo',
  energy: 'consumo',
  tilt_angle: 'inclinacao',
  soil_moisture: 'solo',
  soil_conductivity: 'solo',
  fill_level: 'nivel',
}

function mapearMedicoes(metrics) {
  /** @type {Record<string, number>} */
  const medidas = {}
  for (const [chave, metrica] of Object.entries(metrics || {})) {
    const alvo = MAPA_MEDICOES[chave] ?? MAPA_MEDICOES[chave.toLowerCase()]
    if (!alvo) continue
    const valor = ultimoValorValido(metrica)
    if (valor !== null) medidas[alvo] = valor
  }
  return medidas
}

/**
 * Percorre o dataset mais recente do fim para o inicio e devolve o primeiro
 * valor que nao e nulo/NaN. Um "buraco" na serie (sem uplink nesse minuto)
 * pode aparecer como null ou NaN consoante a versao do ChirpStack — ainda por
 * confirmar contra uma instancia real (ver plano). Um 0 legitimo so e
 * descartado se for o unico ponto da janela pedida.
 */
function ultimoValorValido(metrica) {
  const dataset = metrica?.datasets?.[0]
  if (!dataset?.data?.length) return null
  for (let i = dataset.data.length - 1; i >= 0; i -= 1) {
    const v = dataset.data[i]
    if (v !== null && v !== undefined && !Number.isNaN(v)) return v
  }
  return null
}

function cabecalhos(ligacao) {
  return { Authorization: `Bearer ${ligacao.apiToken}`, Accept: 'application/json' }
}

/** Classifica a resposta HTTP num motivo legivel, em vez de so "falhou". */
async function pedir(ligacao, caminho) {
  let resposta
  try {
    resposta = await fetch(`${ligacao.baseUrl.replace(/\/+$/, '')}${caminho}`, { headers: cabecalhos(ligacao) })
  } catch (erro) {
    throw new Error(`Sem resposta do servidor (${erro.message ?? erro}). Confirma o URL e se o REST gateway esta ativo.`)
  }
  if (resposta.status === 401 || resposta.status === 403) {
    throw new Error('Token invalido ou sem permissoes.')
  }
  if (resposta.status === 404) {
    throw new Error('Nao encontrado (confirma o Application ID e o URL base).')
  }
  if (!resposta.ok) {
    throw new Error(`O servidor respondeu ${resposta.status}.`)
  }
  return resposta.json()
}

async function testarLigacao(ligacao) {
  try {
    const dados = await pedir(ligacao, `/api/devices?applicationId=${encodeURIComponent(ligacao.applicationId)}&limit=1`)
    return { ok: true, totalDispositivos: dados.totalCount ?? 0 }
  } catch (erro) {
    return { ok: false, motivo: String(erro.message ?? erro) }
  }
}

async function listarDispositivos(ligacao) {
  const dados = await pedir(ligacao, `/api/devices?applicationId=${encodeURIComponent(ligacao.applicationId)}&limit=100`)
  return (dados.result ?? []).map((d) => ({ devEui: d.devEui, nome: d.name, ultimaVezVisto: d.lastSeenAt ?? null }))
}

async function metricasDoDispositivo(ligacao, devEui) {
  const agora = new Date()
  const inicio = new Date(agora.getTime() - 30 * 60 * 1000)
  const params = new URLSearchParams({ start: inicio.toISOString(), end: agora.toISOString(), aggregation: 'MINUTE' })
  const dados = await pedir(ligacao, `/api/devices/${encodeURIComponent(devEui)}/metrics?${params}`)
  return mapearMedicoes(dados.metrics)
}

/** Corre `tarefa` para cada item de `itens`, no maximo `limite` em simultaneo. */
async function comConcorrenciaLimitada(itens, limite, tarefa) {
  const resultados = new Array(itens.length)
  let indice = 0
  async function trabalhador() {
    while (indice < itens.length) {
      const i = indice
      indice += 1
      resultados[i] = await tarefa(itens[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador))
  return resultados
}

/**
 * Le as metricas mais recentes de cada devEui. Um erro num dispositivo nao
 * aborta o lote inteiro — fica reportado so nesse item.
 */
async function obterLeituras(ligacao, devEuis) {
  return comConcorrenciaLimitada(devEuis, 4, async (devEui) => {
    try {
      const medidas = await metricasDoDispositivo(ligacao, devEui)
      return { devEui, medidas, recebidoEm: new Date().toISOString() }
    } catch (erro) {
      return { devEui, medidas: {}, recebidoEm: new Date().toISOString(), erro: String(erro.message ?? erro) }
    }
  })
}

module.exports = { testarLigacao, listarDispositivos, obterLeituras }
