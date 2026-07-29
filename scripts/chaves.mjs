#!/usr/bin/env node
/**
 * Single source of truth for the licence key pair.
 *
 * The private key (`chave-privada.pem`, gitignored) is what signs licences. The
 * app ships only the PUBLIC half (`electron/chave-publica.cjs`) to verify them.
 * Those two MUST come from the same pair — if the shipped public key ever drifts
 * from the private one (e.g. a stale committed copy), every issued licence reads
 * as "chave invalida".
 *
 * To make that impossible, the public key is treated as a *derived artifact*:
 * this module rewrites it from the private key, and it runs automatically before
 * issuing a licence, before `npm run app`, and before packaging. Never edit
 * `chave-publica.cjs` by hand — it is regenerated.
 */
import { createPrivateKey, createPublicKey } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
export const caminhoPrivada = join(raiz, 'chave-privada.pem')
export const caminhoPublica = join(raiz, 'electron', 'chave-publica.cjs')

/** The exact contents of electron/chave-publica.cjs for a given public PEM. */
export function conteudoChavePublica(pemPublica) {
  return `// GERADO automaticamente a partir de chave-privada.pem (scripts/chaves.mjs).
// NAO editar a mao — e reescrito ao emitir licencas, ao correr e ao empacotar.
// Esta e a metade PUBLICA: verifica licencas, nunca as emite.
const CHAVE_PUBLICA = \`${pemPublica.trim()}\`

module.exports = { CHAVE_PUBLICA }
`
}

/**
 * Rewrites electron/chave-publica.cjs from the private key so the app can never
 * verify with a public key that does not match the signer. Idempotent: only
 * writes when missing or out of date.
 * Returns { existe, alterada }.
 */
export function sincronizarChavePublica({ silencioso = false } = {}) {
  if (!existsSync(caminhoPrivada)) return { existe: false, alterada: false }

  const privada = createPrivateKey(readFileSync(caminhoPrivada, 'utf8'))
  const pemPublica = createPublicKey(privada).export({ type: 'spki', format: 'pem' }).trim()
  const novo = conteudoChavePublica(pemPublica)
  const atual = existsSync(caminhoPublica) ? readFileSync(caminhoPublica, 'utf8') : ''

  if (atual.trim() === novo.trim()) return { existe: true, alterada: false }

  writeFileSync(caminhoPublica, novo, 'utf8')
  if (!silencioso) console.log('chave-publica.cjs sincronizada com a chave-privada.pem.')
  return { existe: true, alterada: true }
}

// Permite correr diretamente:  node scripts/chaves.mjs
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/chaves.mjs')) {
  const r = sincronizarChavePublica()
  if (!r.existe) {
    console.error('\nFalta a chave-privada.pem. Corre primeiro:  npm run licenca:iniciar\n')
    process.exit(1)
  }
  console.log(r.alterada ? 'Pronto.' : 'Ja estava sincronizada.')
}
