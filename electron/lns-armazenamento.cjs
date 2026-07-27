const fs = require('node:fs')
const path = require('node:path')

/**
 * Ligacao a um LNS (ChirpStack), guardada por instalacao — nao no ficheiro de
 * projeto, para nao vazar o API token ao exportar/partilhar um projeto, e
 * porque a mesma instalacao pode planear varias redes de clientes diferentes.
 *
 * O token e encriptado em repouso com `safeStorage` (DPAPI no Windows,
 * Keychain no mac, libsecret no Linux). Ao contrario da licenca (guardada em
 * claro em licenca.cjs — nao e um segredo operacional), um token de acesso a
 * uma rede real de um cliente merece esse cuidado extra.
 */

const FICHEIRO_LIGACAO = 'lns.json'

function caminhoLigacao(userDataPath) {
  return path.join(userDataPath, FICHEIRO_LIGACAO)
}

/** @param {import('electron').SafeStorage} safeStorage */
function guardarLigacao(safeStorage, userDataPath, { baseUrl, apiToken, applicationId }) {
  try {
    const tokenEncriptado = safeStorage.encryptString(apiToken).toString('base64')
    fs.mkdirSync(userDataPath, { recursive: true })
    fs.writeFileSync(
      caminhoLigacao(userDataPath),
      JSON.stringify({ baseUrl, applicationId, tokenEncriptado }, null, 2),
      'utf8',
    )
    return true
  } catch {
    return false
  }
}

/** Devolve { baseUrl, applicationId, apiToken } com o token ja desencriptado, ou null. */
function ligacaoGuardada(safeStorage, userDataPath) {
  try {
    const raw = fs.readFileSync(caminhoLigacao(userDataPath), 'utf8')
    const guardada = JSON.parse(raw)
    const apiToken = safeStorage.decryptString(Buffer.from(guardada.tokenEncriptado, 'base64'))
    return { baseUrl: guardada.baseUrl, applicationId: guardada.applicationId, apiToken }
  } catch {
    return null
  }
}

function removerLigacao(userDataPath) {
  try {
    fs.unlinkSync(caminhoLigacao(userDataPath))
  } catch {
    // nada guardado
  }
}

module.exports = { guardarLigacao, ligacaoGuardada, removerLigacao }
