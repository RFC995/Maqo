#!/usr/bin/env node
/**
 * Creates the Ed25519 key pair that licences are signed with. Run this ONCE.
 *
 *   npm run licenca:iniciar
 *
 * The private key is written to `chave-privada.pem` at the repo root and is
 * gitignored and excluded from the packaged app. Back it up somewhere safe:
 * lose it and you can never issue another key that existing installs accept;
 * leak it and anyone can mint their own licences.
 */
import { generateKeyPairSync } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { caminhoPrivada, caminhoPublica, conteudoChavePublica } from './chaves.mjs'

if (existsSync(caminhoPrivada) && !process.argv.includes('--forcar')) {
  console.error('\nJa existe uma chave-privada.pem.')
  console.error('Gerar outra invalida TODAS as licencas ja distribuidas.')
  console.error('Se e mesmo isso que queres, corre outra vez com --forcar.\n')
  process.exit(1)
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519')

const pemPrivada = privateKey.export({ type: 'pkcs8', format: 'pem' })
const pemPublica = publicKey.export({ type: 'spki', format: 'pem' })

writeFileSync(caminhoPrivada, pemPrivada, 'utf8')
writeFileSync(caminhoPublica, conteudoChavePublica(pemPublica), 'utf8')

console.log('\nPar de chaves criado.')
console.log(`  privada -> ${caminhoPrivada}   (GUARDA ISTO, nunca partilhes)`)
console.log(`  publica -> ${caminhoPublica}   (vai dentro da app)`)
console.log('\nJa podes emitir licencas com:')
console.log('  npm run licenca -- --nome "Empresa X" --expira 2027-12-31\n')
