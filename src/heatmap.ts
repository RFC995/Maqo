import type { BuildingConfig, DeviceItem } from './types'
import { avaliarPonto, sensitivityDbm, type Propagation, type SpreadingFactor } from './rf'

/**
 * Coverage heatmap: sample a grid over a floor, ask the RF engine what a
 * generic node would hear at each point, and paint it.
 *
 * This turns the link budget from numbers in a panel into the answer to the
 * question the planner actually has — "is this floor covered?" — before a
 * single sensor is placed.
 */

/** Sampling step in metres. Fine enough to read, cheap enough to be instant. */
const PASSO_M = 0.6

/** Above this margin the link is comfortable; below zero there is no link. */
const MARGEM_OTIMA = 25

export interface MapaCalor {
  /** samples across and down */
  colunas: number
  linhas: number
  passo: number
  /** link margin in dB at each sample, row-major; -999 where nothing reaches */
  margens: Float32Array
  sfs: Int8Array
  /** share of the floor with a usable link */
  coberturaPct: number
  /** share that only closes at SF11/SF12 — works, but slowly and noisily */
  limitePct: number
  piorMargemDb: number
}

/**
 * Colour ramp from comfortable to dead. Deliberately not a rainbow: green to
 * red reads instantly as good-to-bad, and the grey tail makes "no coverage"
 * obviously different in kind from "weak", not just further along a scale.
 */
export function corDaMargem(margemDb: number, sf: SpreadingFactor | null): [number, number, number] {
  if (sf === null || margemDb < 0) return [70, 78, 92]
  const t = Math.max(0, Math.min(1, margemDb / MARGEM_OTIMA))
  if (t > 0.55) {
    // yellow -> green
    const k = (t - 0.55) / 0.45
    return [Math.round(234 - 200 * k), Math.round(179 + 18 * k), Math.round(8 + 86 * k)]
  }
  // red -> yellow
  const k = t / 0.55
  return [Math.round(239 - 5 * k), Math.round(68 + 111 * k), Math.round(68 - 60 * k)]
}

export function calcularMapaCalor(
  building: BuildingConfig,
  floorIndex: number,
  devices: DeviceItem[],
  propagation: Propagation,
): MapaCalor {
  const gateways = devices.filter((d) => d.type === 'gateway')
  const colunas = Math.max(2, Math.ceil(building.width / PASSO_M))
  const linhas = Math.max(2, Math.ceil(building.depth / PASSO_M))

  const margens = new Float32Array(colunas * linhas)
  const sfs = new Int8Array(colunas * linhas)

  let cobertos = 0
  let noLimite = 0
  let pior = Infinity

  for (let linha = 0; linha < linhas; linha += 1) {
    // sample at cell centres so the edges are not over-represented
    const z = -building.depth / 2 + ((linha + 0.5) / linhas) * building.depth
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      const x = -building.width / 2 + ((coluna + 0.5) / colunas) * building.width
      const ponto = avaliarPonto(x, z, floorIndex, gateways, building, propagation)
      const i = linha * colunas + coluna

      margens[i] = ponto.sf === null ? -999 : ponto.marginDb
      sfs[i] = ponto.sf ?? 0

      if (ponto.sf !== null) {
        cobertos += 1
        if (ponto.sf >= 11) noLimite += 1
        pior = Math.min(pior, ponto.marginDb)
      }
    }
  }

  const total = colunas * linhas
  return {
    colunas,
    linhas,
    passo: PASSO_M,
    margens,
    sfs,
    coberturaPct: (cobertos / total) * 100,
    limitePct: (noLimite / total) * 100,
    piorMargemDb: pior === Infinity ? -999 : pior,
  }
}

/**
 * Paints the map to a canvas at one pixel per sample. Drawn small and scaled up
 * with smoothing by whoever displays it, which gives a soft field instead of
 * visible cells — and costs nothing.
 */
export function desenharMapaCalor(mapa: MapaCalor, opacidade = 0.72): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = mapa.colunas
  canvas.height = mapa.linhas
  const ctx = canvas.getContext('2d')!
  const imagem = ctx.createImageData(mapa.colunas, mapa.linhas)

  for (let i = 0; i < mapa.margens.length; i += 1) {
    const sf = mapa.sfs[i] === 0 ? null : (mapa.sfs[i] as SpreadingFactor)
    const [r, g, b] = corDaMargem(mapa.margens[i], sf)
    const p = i * 4
    imagem.data[p] = r
    imagem.data[p + 1] = g
    imagem.data[p + 2] = b
    imagem.data[p + 3] = Math.round(opacidade * 255)
  }

  ctx.putImageData(imagem, 0, 0)
  return canvas
}

export function mapaCalorParaDataUrl(mapa: MapaCalor, opacidade?: number): string {
  return desenharMapaCalor(mapa, opacidade).toDataURL('image/png')
}

/** Legend stops, for the UI. */
export const escalaMapaCalor = [
  { rotulo: 'Folgado', margem: MARGEM_OTIMA },
  { rotulo: 'Bom', margem: MARGEM_OTIMA * 0.7 },
  { rotulo: 'Justo', margem: MARGEM_OTIMA * 0.35 },
  { rotulo: 'No limite', margem: 2 },
  { rotulo: 'Sem cobertura', margem: -1 },
].map((parada) => ({
  ...parada,
  cor: `rgb(${corDaMargem(parada.margem, parada.margem < 0 ? null : 9).join(',')})`,
}))

export { sensitivityDbm }
