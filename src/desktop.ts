import type { Project } from './types'
import type { ConfigIntegracao } from './integracao'
import type { EstadoIntegracao } from './liveStore'

/**
 * Bridge to the Electron shell. Every call is a no-op in a plain browser, so
 * the same build runs both as a web app and inside the desktop window.
 */

export interface LicencaInfo {
  id: string
  nome: string
  emitida: string
  expira?: string
  notas?: string
}

/** Ligacao a um LNS (ChirpStack), tal como o renderer a pode ver — nunca inclui o token. */
export interface LnsLigacaoEstado {
  configurado: boolean
  baseUrl?: string
  applicationId?: string
}

export interface LnsLigacaoDados {
  baseUrl: string
  applicationId: string
  apiToken: string
}

export interface LnsDispositivo {
  devEui: string
  nome: string
  ultimaVezVisto: string | null
}

/** Uma leitura de um ciclo de polling. `medidas` usa as chaves de Measurement do catalogo. */
export interface LnsLeitura {
  devEui: string
  medidas: Partial<Record<string, number>>
  recebidoEm: string
  erro?: string
}

interface MaqoDesktop {
  ehDesktop: true
  ativarLicenca: (chave: string) => Promise<{ ok: boolean; motivo?: string; dados?: LicencaInfo }>
  estadoLicenca: () => Promise<LicencaInfo | null>
  guardarProjeto: (
    conteudo: string,
    comoNovo: boolean,
    nomeSugerido: string,
  ) => Promise<{ ok: boolean; caminho?: string }>
  caminhoAtual: () => Promise<string | null>
  guardarRelatorioPdf: (nomeSugerido: string) => Promise<{ ok: boolean; caminho?: string }>

  // LNS (ChirpStack)
  lnsGuardarLigacao: (dados: LnsLigacaoDados) => Promise<{ ok: boolean; motivo?: string }>
  lnsObterLigacao: () => Promise<LnsLigacaoEstado>
  lnsRemoverLigacao: () => Promise<boolean>
  lnsTestarLigacao: (dados?: LnsLigacaoDados) => Promise<{ ok: boolean; motivo?: string; totalDispositivos?: number }>
  lnsListarDispositivos: () => Promise<{ ok: boolean; motivo?: string; dispositivos?: LnsDispositivo[] }>
  lnsDefinirSubscricoes: (devEuis: string[]) => Promise<void>
  aoReceberLeituraLns: (cb: (leituras: LnsLeitura[]) => void) => () => void

  aoAbrirProjeto: (cb: (payload: { caminho: string; conteudo: string }) => void) => () => void
  aoPedirParaGuardar: (cb: (payload: { comoNovo: boolean }) => void) => () => void
  aoNovoProjeto: (cb: () => void) => () => void

  // TTN / ChirpStack integration
  integracaoLigar: (config: ConfigIntegracao) => Promise<{ ok: boolean; motivo?: string }>
  integracaoDesligar: () => Promise<{ ok: boolean }>
  integracaoEstado: () => Promise<EstadoIntegracao>
  aoUplinkIntegracao: (
    cb: (payload: { provedor: 'ttn' | 'chirpstack'; topico: string; mensagem: string }) => void,
  ) => () => void
  aoEstadoIntegracao: (cb: (estado: EstadoIntegracao) => void) => () => void
}

declare global {
  interface Window {
    maqo?: MaqoDesktop
  }
}

export function desktop(): MaqoDesktop | null {
  return typeof window !== 'undefined' && window.maqo ? window.maqo : null
}

export const ehDesktop = () => desktop() !== null

/** Filename suggested in the Save dialog, derived from the first building's name. */
export function nomeSugerido(project: Project): string {
  const base = (project.buildings[0]?.config.name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'maquete'
}
