export type Qualidade = 'rapido' | 'equilibrado' | 'maximo'

export interface PerfilQualidade {
  rotulo: string
  nota: string
  /** shadow map resolution, per side */
  sombras: number
  /** PCSS sample count, or null to skip soft shadows entirely */
  softShadows: number | null
  posProcessamento: boolean
  ambientOcclusion: boolean
  estrelas: boolean
  dpr: [number, number]
}

/**
 * Startup cost is dominated by the graphics driver compiling one shader program
 * per material permutation — profiling showed the main thread parked inside the
 * driver with three's `onFirstUse` on the stack, which no amount of deferring
 * removes. The only real lever is compiling less, so the weight is a setting.
 *
 * This lives outside Scene3D on purpose: the panel that renders the selector is
 * in the main bundle, and importing it from Scene3D would drag three.js back in
 * and undo the code splitting.
 */
export const perfisDeQualidade: Record<Qualidade, PerfilQualidade> = {
  rapido: {
    rotulo: 'Rapido',
    nota: 'Arranque imediato. Sem pos-processamento nem sombras suaves.',
    sombras: 1024,
    softShadows: null,
    posProcessamento: false,
    ambientOcclusion: false,
    estrelas: false,
    dpr: [1, 1.5],
  },
  equilibrado: {
    rotulo: 'Equilibrado',
    nota: 'Bloom e correcao de cor, sombras suaves. Sem oclusao ambiente.',
    sombras: 2048,
    softShadows: 10,
    posProcessamento: true,
    ambientOcclusion: false,
    estrelas: true,
    dpr: [1, 2],
  },
  maximo: {
    rotulo: 'Maximo',
    nota: 'Tudo ligado, incluindo oclusao ambiente. Arranque mais lento.',
    sombras: 2048,
    softShadows: 14,
    posProcessamento: true,
    ambientOcclusion: true,
    estrelas: true,
    dpr: [1, 2],
  },
}
