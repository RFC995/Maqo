/**
 * Lets the report grab the current 3D view. The scene registers a capture
 * function while it is mounted; the report calls it and gets a PNG data URL, or
 * null when the 3D view is not up (its chunk still loading, for instance).
 */

type Capturador = () => string | null

let capturador: Capturador | null = null

export function registarCaptura(fn: Capturador | null) {
  capturador = fn
}

export function capturarVista3D(): string | null {
  try {
    return capturador?.() ?? null
  } catch {
    return null
  }
}
