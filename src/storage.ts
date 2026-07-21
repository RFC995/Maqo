import type { Project } from './types'

const STORAGE_KEY = 'maqo.project.v1'

export function createDefaultProject(): Project {
  return {
    version: 1,
    id: crypto.randomUUID(),
    building: {
      name: 'Edificio Sede',
      style: 'office',
      width: 28,
      depth: 18,
      floors: 5,
      floorHeight: 3.4,
    },
    devices: [],
    seed: 1,
    updatedAt: new Date().toISOString(),
  }
}

export function loadProject(): Project | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Project
    if (!parsed || parsed.version !== 1 || !parsed.building) return null
    return parsed
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
  const safeName = project.building.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'maquete'
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
        const parsed = JSON.parse(String(reader.result)) as Project
        if (!parsed || parsed.version !== 1 || !parsed.building || !Array.isArray(parsed.devices)) {
          reject(new Error('Ficheiro de projeto invalido'))
          return
        }
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha a ler o ficheiro'))
    reader.readAsText(file)
  })
}
