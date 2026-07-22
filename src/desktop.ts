import type { Project } from './types'

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
  aoAbrirProjeto: (cb: (payload: { caminho: string; conteudo: string }) => void) => () => void
  aoPedirParaGuardar: (cb: (payload: { comoNovo: boolean }) => void) => () => void
  aoNovoProjeto: (cb: () => void) => () => void
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

/** Filename suggested in the Save dialog, derived from the building name. */
export function nomeSugerido(project: Project): string {
  const base = project.building.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return base || 'maquete'
}
