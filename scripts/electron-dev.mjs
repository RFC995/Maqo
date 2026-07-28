#!/usr/bin/env node
/**
 * One-command dev: starts Vite, waits for it to listen, then launches Electron
 * pointed at the dev server. Avoids pulling in concurrently/wait-on just for
 * this. Killing either side tears the other down.
 */
import { spawn } from 'node:child_process'
import { connect } from 'node:net'
import { sincronizarChavePublica } from './chaves.mjs'

// keep the app's public key in step with the local private key before every run,
// so dev never boots verifying licences against a stale/mismatched key
sincronizarChavePublica()

const ehWindows = process.platform === 'win32'
const npx = ehWindows ? 'npx.cmd' : 'npx'

const vite = spawn(npx, ['vite', '--port', '5173', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'inherit'],
  shell: ehWindows,
})

let url = null
vite.stdout.on('data', (chunk) => {
  const texto = chunk.toString()
  process.stdout.write(texto)
  const encontrado = texto.match(/https?:\/\/localhost:\d+/)
  if (encontrado && !url) url = encontrado[0]
})

function esperarPorta(porta, tentativas = 90) {
  // probe both stacks: on Windows, Vite bound to "localhost" often listens on
  // IPv6 ::1 only, so an IPv4-only probe waits forever and gives up
  const hosts = ['127.0.0.1', '::1']
  return new Promise((resolve, reject) => {
    const tentar = (restantes) => {
      let pendentes = hosts.length
      let ligou = false
      for (const host of hosts) {
        const socket = connect(porta, host)
        socket.once('connect', () => {
          socket.destroy()
          if (!ligou) {
            ligou = true
            resolve()
          }
        })
        socket.once('error', () => {
          socket.destroy()
          pendentes -= 1
          if (pendentes === 0 && !ligou) {
            if (restantes <= 0) reject(new Error(`Vite nao arrancou na porta ${porta}`))
            else setTimeout(() => tentar(restantes - 1), 250)
          }
        })
      }
    }
    tentar(tentativas)
  })
}

let electron = null
let aFechar = false

function terminar(codigo) {
  if (aFechar) return
  aFechar = true
  if (electron && !electron.killed) electron.kill()
  if (vite && !vite.killed) vite.kill()
  process.exit(codigo)
}

try {
  await esperarPorta(5173)

  // VS Code (itself an Electron app) exports ELECTRON_RUN_AS_NODE=1 to its
  // child processes. Inherited, it makes our electron binary boot as plain
  // Node with no app/BrowserWindow APIs, which fails confusingly.
  const ambiente = { ...process.env, VITE_DEV_SERVER_URL: url ?? 'http://localhost:5173' }
  delete ambiente.ELECTRON_RUN_AS_NODE

  electron = spawn(npx, ['electron', '.'], {
    stdio: 'inherit',
    shell: ehWindows,
    env: ambiente,
  })
  electron.on('close', (codigo) => terminar(codigo ?? 0))
} catch (erro) {
  console.error(erro.message)
  terminar(1)
}

vite.on('close', () => terminar(0))
process.on('SIGINT', () => terminar(0))
process.on('SIGTERM', () => terminar(0))
