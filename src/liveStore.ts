import type { Measurement } from './catalog'
import type { DeviceItem } from './types'
import { normalizarDevEui, type Provedor, type UplinkNormalizado } from './integracao'

/**
 * The live-data store. It sits between the network-server uplinks (fed in from
 * the Electron bridge) and the rest of the app, holding the latest real reading
 * per DevEUI plus the device<->DevEUI bindings.
 *
 * telemetry.ts consults it on every read: a device bound to a DevEUI shows its
 * real uplinks while the link is live, and falls back to the simulation when it
 * is not bound or the link is down — so the demo experience is never broken.
 */

export type EstadoLigacao = 'desligado' | 'a-ligar' | 'ligado' | 'erro'

export interface EstadoIntegracao {
  estado: EstadoLigacao
  provedor?: Provedor
  mensagem?: string
  /** epoch millis the current state started */
  desde: number
}

export interface EntradaAoVivo {
  devEui: string
  deviceId?: string
  valores: Partial<Record<Measurement, number>>
  bruto: Record<string, unknown>
  rssi?: number
  snr?: number
  sf?: number
  fcnt?: number
  at: number
  /** how many uplinks this DevEUI has sent since the app opened */
  contagem: number
}

const MAX_HISTORICO = 60

// --------------------------------------------------------------- module state

const porDevEui = new Map<string, EntradaAoVivo>()
/** deviceId -> canonical DevEUI, rebuilt whenever the project's devices change */
const bindings = new Map<string, string>()
const historico: UplinkNormalizado[] = []
let estadoAtual: EstadoIntegracao = { estado: 'desligado', desde: Date.now() }

let versaoAtual = 0
const ouvintes = new Set<() => void>()

function notificar() {
  versaoAtual += 1
  for (const fn of ouvintes) fn()
}

// ----------------------------------------------------------------- ingestion

export function registarUplink(u: UplinkNormalizado) {
  const anterior = porDevEui.get(u.devEui)
  porDevEui.set(u.devEui, {
    devEui: u.devEui,
    deviceId: u.deviceId ?? anterior?.deviceId,
    // last-known-value merge: a device that splits fields across uplinks (or
    // different f_ports) keeps every field it has ever reported
    valores: { ...anterior?.valores, ...u.valores },
    bruto: { ...anterior?.bruto, ...u.bruto },
    rssi: u.rssi ?? anterior?.rssi,
    snr: u.snr ?? anterior?.snr,
    sf: u.sf ?? anterior?.sf,
    fcnt: u.fcnt ?? anterior?.fcnt,
    at: u.at,
    contagem: (anterior?.contagem ?? 0) + 1,
  })

  historico.unshift(u)
  if (historico.length > MAX_HISTORICO) historico.length = MAX_HISTORICO

  notificar()
}

export function definirEstado(estado: EstadoIntegracao) {
  estadoAtual = estado
  notificar()
}

export function estadoIntegracao(): EstadoIntegracao {
  return estadoAtual
}

export function ligada(): boolean {
  return estadoAtual.estado === 'ligado'
}

// ------------------------------------------------------------------ bindings

/** Rebuilds the deviceId -> DevEUI map from the project's devices. */
export function atualizarBindings(devices: DeviceItem[]) {
  bindings.clear()
  for (const d of devices) {
    const eui = normalizarDevEui(d.devEui)
    if (eui) bindings.set(d.id, eui)
  }
  // no notify: bindings change as a side effect of project edits, which already
  // trigger a render; notifying here could loop with a subscribing effect
}

export function temBinding(deviceId: string): boolean {
  return bindings.has(deviceId)
}

/**
 * Whether a device should read from real uplinks or from the simulation. Only
 * a bound device on a live link reads real data; everything else simulates, so
 * disconnecting cleanly returns the whole scene to the demo.
 */
export function modoDados(deviceId: string): 'real' | 'simulado' {
  return ligada() && bindings.has(deviceId) ? 'real' : 'simulado'
}

// -------------------------------------------------------------------- reads

export function entradaDe(devEui: string): EntradaAoVivo | undefined {
  return porDevEui.get(normalizarDevEui(devEui))
}

export function entradaDeDispositivo(deviceId: string): EntradaAoVivo | undefined {
  const eui = bindings.get(deviceId)
  return eui ? porDevEui.get(eui) : undefined
}

/**
 * The real value for a bound device, or null when it has not reported that
 * measurement yet. telemetry.ts only calls this once modoDados === 'real'.
 */
export function valorPorDispositivo(deviceId: string, measurement: Measurement): number | null {
  const entrada = entradaDeDispositivo(deviceId)
  if (!entrada) return null
  const v = entrada.valores[measurement]
  return v === undefined ? null : v
}

/** Recent uplinks across all devices, newest first — drives the live log. */
export function listaUplinks(): UplinkNormalizado[] {
  return historico
}

/** Every DevEUI heard since the app opened, newest activity first. */
export function listaDevEuis(): EntradaAoVivo[] {
  return [...porDevEui.values()].sort((a, b) => b.at - a.at)
}

// ------------------------------------------------------------- subscription

export function subscrever(fn: () => void): () => void {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

export function versao(): number {
  return versaoAtual
}
