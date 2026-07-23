#!/usr/bin/env node
/**
 * Issues a licence key for one customer.
 *
 *   npm run licenca -- --nome "Camara de Aveiro" --expira 2027-12-31
 *   npm run licenca -- --nome "Cliente Piloto" --expira 2026-12-31 --notas "projeto piloto"
 *   npm run licenca -- --nome "Uso interno"            (sem validade)
 *
 * Prints the key to paste into the customer's activation screen.
 */
import { createPrivateKey, randomUUID, sign } from 'node:crypto'
import { existsSync, readFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const caminhoPrivada = join(raiz, 'chave-privada.pem')
const registo = join(raiz, 'licencas-emitidas.log')

try {
  process.loadEnvFile(join(raiz, '.env'))
} catch {
  // .env opcional — sem ele so falha o registo remoto, nao a emissao da chave
}

if (!existsSync(caminhoPrivada)) {
  console.error('\nFalta a chave-privada.pem. Corre primeiro:\n  npm run licenca:iniciar\n')
  process.exit(1)
}

function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}

const nome = argumento('nome')
const expira = argumento('expira')
const notas = argumento('notas')

if (!nome) {
  console.error('\nFalta --nome. Exemplo:')
  console.error('  npm run licenca -- --nome "Empresa X" --expira 2027-12-31\n')
  process.exit(1)
}

if (expira && !/^\d{4}-\d{2}-\d{2}$/.test(expira)) {
  console.error('\n--expira tem de ser uma data AAAA-MM-DD, por exemplo 2027-12-31.\n')
  process.exit(1)
}

const dados = {
  v: 1,
  id: randomUUID().slice(0, 8),
  nome,
  emitida: new Date().toISOString().slice(0, 10),
  ...(expira ? { expira } : {}),
  ...(notas ? { notas } : {}),
}

const payload = Buffer.from(JSON.stringify(dados), 'utf8')
const chavePrivada = createPrivateKey(readFileSync(caminhoPrivada, 'utf8'))
const assinatura = sign(null, payload, chavePrivada)

const chave = `${payload.toString('base64url')}.${assinatura.toString('base64url')}`

// wrap for readability; the app strips whitespace before verifying
const emLinhas = chave.match(/.{1,48}/g).join('\n')

console.log('\n────────────────────────────────────────────────')
console.log(`  Licenca Maqo para: ${nome}`)
console.log(`  ID: ${dados.id}   Validade: ${expira ?? 'sem limite'}`)
console.log('────────────────────────────────────────────────\n')
console.log(emLinhas)
console.log('\n────────────────────────────────────────────────')
console.log('Envia este bloco ao cliente. Ele cola-o no ecra de ativacao.\n')

try {
  appendFileSync(registo, `${JSON.stringify({ ...dados, chave })}\n`, 'utf8')
  console.log(`Registado em ${registo}\n`)
} catch {
  // logging is a convenience, not a requirement
}

await registarNoSupabase(dados)

/**
 * Regista a licenca na tabela remota para que possa vir a ser revogada.
 * Sem isto a chave continua a funcionar (a verificacao local nao muda) mas
 * fica invisivel para o painel de gestao e o servidor trata-a como "nao
 * encontrada" -> nunca revogada.
 */
async function registarNoSupabase(dadosLicenca) {
  const url = process.env.SUPABASE_URL
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chaveServico) {
    console.log('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta (ver .env.example) — licenca nao registada para revogacao remota.\n')
    return
  }

  try {
    const resposta = await fetch(`${url}/rest/v1/licencas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: chaveServico,
        Authorization: `Bearer ${chaveServico}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: dadosLicenca.id,
        nome: dadosLicenca.nome,
        emitida: dadosLicenca.emitida,
        expira: dadosLicenca.expira ?? null,
        notas: dadosLicenca.notas ?? null,
      }),
    })
    if (!resposta.ok) {
      console.error(`Aviso: falha a registar no Supabase (${resposta.status} ${await resposta.text()}).\n`)
      return
    }
    console.log('Registado no Supabase (revogavel a partir do painel).\n')
  } catch (erro) {
    console.error(`Aviso: falha a registar no Supabase: ${erro.message}\n`)
  }
}
