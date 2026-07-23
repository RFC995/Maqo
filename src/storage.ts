import type { Project, Room } from './types'

const STORAGE_KEY = 'maqo.project.v1'

export function createDefaultProject(): Project {
  return {
    version: 2,
    id: crypto.randomUUID(),
    buildings: [
      {
        id: crypto.randomUUID(),
        config: {
          name: 'Edificio Sede',
          style: 'office',
          width: 28,
          depth: 18,
          floors: 5,
          floorHeight: 3.4,
        },
        site: { x: 0, z: 0 },
      },
    ],
    devices: [],
    seed: 1,
    updatedAt: new Date().toISOString(),
  }
}

export function isValidProjectFile(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.devices)) return false
  if (r.version === 1) return !!r.building
  if (r.version === 2) return Array.isArray(r.buildings)
  return false
}

/**
 * Brings a project of any known version up to the current shape. Devices/
 * rooms of a v1 (single-building) project all belonged to that one building,
 * so they are tagged with its freshly-minted id; nothing is lost.
 */
export function migrateProject(raw: unknown): Project {
  const r = raw as any
  if (r.version === 2) return r as Project

  const buildingId = crypto.randomUUID()
  return {
    version: 2,
    id: r.id,
    buildings: [{ id: buildingId, config: r.building, site: { x: 0, z: 0 } }],
    devices: (r.devices ?? []).map((d: any) => ({ ...d, buildingId })),
    rooms: r.rooms
      ? (Object.fromEntries(
          Object.entries(r.rooms).map(([floor, rs]) => [`${buildingId}:${floor}`, rs]),
        ) as Record<string, Room[]>)
      : undefined,
    seed: r.seed,
    updatedAt: r.updatedAt,
  }
}

export function loadProject(): Project | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isValidProjectFile(parsed)) return null
    return migrateProject(parsed)
  } catch {
    return null
  }
}

export function saveProject(project: Project) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch {
    // storage unavailable (private mode, quota, etc.) - ignore silently
  }
}

export function exportProjectFile(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName =
    (project.buildings[0]?.config.name ?? 'maquete').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'maquete'
  a.href = url
  a.download = `maqo-${safeName}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importProjectFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isValidProjectFile(parsed)) {
          reject(new Error('Ficheiro de projeto invalido'))
          return
        }
        resolve(migrateProject(parsed))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha a ler o ficheiro'))
    reader.readAsText(file)
  })
}
