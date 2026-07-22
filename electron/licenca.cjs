const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { CHAVE_PUBLICA } = require('./chave-publica.cjs')

/**
 * Licence keys.
 *
 * A key is `base64url(payload) . base64url(ed25519 signature)`. Only the holder
 * of the private key can issue one, and the private key never ships — the app
 * carries the public half and can therefore verify but not forge.
 *
 * What this does and does not buy you: forging a key is cryptographically
 * infeasible, so a customer cannot mint their own or extend their own expiry.
 * It does NOT make the app tamper-proof — anyone can unpack app.asar and delete
 * the check. That is true of every client-side licence system; the goal here is
 * to stop keys being invented or casually passed around, not to beat a
 * reverse engineer.
 */

const FICHEIRO_LICENCA = 'licenca.json'

function decodeBase64Url(text) {
  return Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** Strips the formatting we add for readability before verifying. */
function normalizar(chave) {
  return String(chave || '')
    .trim()
    .replace(/\s+/g, '')
}

/**
 * Verifies a key's signature and expiry.
 * Returns { valida, motivo, dados }.
 */
function verificarChave(chaveBruta) {
  const chave = normalizar(chaveBruta)
  if (!chave) return { valida: false, motivo: 'Introduz uma chave.' }

  const partes = chave.split('.')
  if (partes.length !== 2) {
    return { valida: false, motivo: 'Formato de chave invalido.' }
  }

  let payload
  let assinatura
  try {
    payload = decodeBase64Url(partes[0])
    assinatura = decodeBase64Url(partes[1])
  } catch {
    return { valida: false, motivo: 'Formato de chave invalido.' }
  }

  let assinaturaOk = false
  try {
    assinaturaOk = crypto.verify(null, payload, CHAVE_PUBLICA, assinatura)
  } catch {
    assinaturaOk = false
  }
  if (!assinaturaOk) {
    return { valida: false, motivo: 'Chave invalida ou adulterada.' }
  }

  let dados
  try {
    dados = JSON.parse(payload.toString('utf8'))
  } catch {
    return { valida: false, motivo: 'Chave corrompida.' }
  }

  if (dados.expira) {
    // compare at day granularity so a key is valid throughout its last day
    const limite = new Date(`${dados.expira}T23:59:59Z`).getTime()
    if (Number.isNaN(limite)) {
      return { valida: false, motivo: 'Chave com validade ilegivel.' }
    }
    if (Date.now() > limite) {
      return { valida: false, motivo: `Licenca expirada em ${dados.expira}.`, dados }
    }
  }

  return { valida: true, dados }
}

function caminhoLicenca(userDataPath) {
  return path.join(userDataPath, FICHEIRO_LICENCA)
}

function guardarLicenca(userDataPath, chave, dados) {
  try {
    fs.mkdirSync(userDataPath, { recursive: true })
    fs.writeFileSync(
      caminhoLicenca(userDataPath),
      JSON.stringify({ chave: normalizar(chave), dados, ativadaEm: new Date().toISOString() }, null, 2),
      'utf8',
    )
    return true
  } catch {
    return false
  }
}

/**
 * Re-verifies the stored key on every launch rather than trusting a saved
 * "activated" flag, so an expired licence stops working on its own.
 */
function licencaGuardada(userDataPath) {
  try {
    const raw = fs.readFileSync(caminhoLicenca(userDataPath), 'utf8')
    const guardada = JSON.parse(raw)
    const resultado = verificarChave(guardada.chave)
    if (!resultado.valida) return null
    return { chave: guardada.chave, dados: resultado.dados }
  } catch {
    return null
  }
}

function removerLicenca(userDataPath) {
  try {
    fs.unlinkSync(caminhoLicenca(userDataPath))
  } catch {
    // nothing stored
  }
}

module.exports = { verificarChave, guardarLicenca, licencaGuardada, removerLicenca, normalizar }
