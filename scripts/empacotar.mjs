#!/usr/bin/env node
/**
 * Builds the Windows installer.
 *
 *   npm run app:build        instalador + portable
 *   npm run app:dir          so a pasta descompactada (mais rapido, para testar)
 *
 * Why the output does not live in the project: on Windows, special folders
 * such as Desktop and Documents carry the ReadOnly attribute, and
 * electron-builder's final "rename win-unpacked.tmp -> win-unpacked" fails with
 * EPERM underneath them. Building into %LOCALAPPDATA% avoids it entirely.
 * Override with:  npm run app:build -- --saida "D:/algures"
 */
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const argv = process.argv.slice(2)

function argumento(nome) {
  const i = argv.indexOf(`--${nome}`)
  if (i === -1) return undefined
  const valor = argv[i + 1]
  argv.splice(i, 2)
  return valor
}

const saidaPedida = argumento('saida')
const saida = resolve(
  saidaPedida ??
    (process.platform === 'win32'
      ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'maqo-build')
      : join(homedir(), 'maqo-build')),
)

// VS Code exports this to child processes; inherited, it makes the electron
// binary boot as plain Node and the build misbehaves.
const ambiente = { ...process.env }
delete ambiente.ELECTRON_RUN_AS_NODE

const args = ['electron-builder', '--win', ...argv, `--config.directories.output=${saida}`]

console.log(`\nA empacotar para: ${saida}\n`)

const resultado = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: ambiente,
})

if (resultado.status !== 0) process.exit(resultado.status ?? 1)

console.log(`\n────────────────────────────────────────────────`)
console.log(`  Pronto. Os ficheiros estao em:`)
console.log(`  ${saida}`)
console.log(`────────────────────────────────────────────────`)
console.log(`  Maqo-<versao>-x64.exe        instalador (e o que envias)`)
console.log(`  Maqo-<versao>-portable.exe   corre sem instalar`)
console.log(`  win-unpacked\\Maqo.exe        versao solta, para testes\n`)
