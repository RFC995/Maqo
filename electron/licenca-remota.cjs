const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./supabase-config.cjs')
const { lerEstadoBruto, atualizarLicenca } = require('./licenca.cjs')

/** Dias que a app continua a funcionar sem conseguir contactar o servidor. */
const TOLERANCIA_DIAS = 7
/** Frequencia da verificacao em segundo plano enquanto a app esta aberta. */
const INTERVALO_VERIFICACAO_MS = 6 * 60 * 60 * 1000

const FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/verificar-licenca` : null

function caminhoDeviceId(userDataPath) {
  return path.join(userDataPath, 'device-id.txt')
}

/** Identificador aleatorio da instalacao, gerado uma vez e reutilizado. Nao identifica o utilizador, so a maquina. */
function obterOuCriarDeviceId(userDataPath) {
  const caminho = caminhoDeviceId(userDataPath)
  try {
    const existente = fs.readFileSync(caminho, 'utf8').trim()
    if (existente) return existente
  } catch {
    // primeira vez
  }
  const id = crypto.randomUUID()
  try {
    fs.mkdirSync(userDataPath, { recursive: true })
    fs.writeFileSync(caminho, id, 'utf8')
  } catch {
    // se nao conseguir gravar, usa-se so nesta sessao
  }
  return id
}

/**
 * Pergunta ao servidor se a licenca `id` continua valida.
 * `ok: false` significa "nao foi possivel perguntar" (sem rede, servidor em
 * baixo, etc.) — nunca "revogada". So um `ok: true` com `revogada: true` deve
 * bloquear a app.
 */
async function perguntarServidor(id, deviceId) {
  if (!FUNCTION_URL) return { ok: false }

  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), 8000)
  try {
    const resposta = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ id, deviceId }),
      signal: controlador.signal,
    })
    if (!resposta.ok) return { ok: false }
    const corpo = await resposta.json()
    return { ok: true, revogada: !!corpo.revogada }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(temporizador)
  }
}

/**
 * Verificacao completa de uma licenca ja validada localmente (assinatura +
 * expiry ja confirmadas pelo chamador via `licencaGuardada`/`verificarChave`).
 * Devolve um de: 'ativa' | 'revogada' | 'bloqueada-sem-rede', mais detalhe.
 */
async function verificarRevogacaoComTolerancia(userDataPath, id) {
  const deviceId = obterOuCriarDeviceId(userDataPath)
  const resultado = await perguntarServidor(id, deviceId)

  if (resultado.ok) {
    if (resultado.revogada) return { estado: 'revogada' }
    atualizarLicenca(userDataPath, { ultimaVerificacaoOk: new Date().toISOString() })
    return { estado: 'ativa' }
  }

  // sem resposta do servidor: tolera ate TOLERANCIA_DIAS desde a ultima vez
  // que conseguimos confirmar (ou desde a ativacao, se nunca confirmou).
  const guardado = lerEstadoBruto(userDataPath)
  const referencia = guardado?.ultimaVerificacaoOk ?? guardado?.ativadaEm
  const diasSemContacto = referencia ? (Date.now() - new Date(referencia).getTime()) / 86_400_000 : Infinity

  if (diasSemContacto <= TOLERANCIA_DIAS) {
    return { estado: 'ativa', offline: true, diasRestantes: Math.max(0, Math.ceil(TOLERANCIA_DIAS - diasSemContacto)) }
  }
  return { estado: 'bloqueada-sem-rede' }
}

module.exports = {
  TOLERANCIA_DIAS,
  INTERVALO_VERIFICACAO_MS,
  obterOuCriarDeviceId,
  perguntarServidor,
  verificarRevogacaoComTolerancia,
}
