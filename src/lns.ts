import { useEffect, useMemo, useState } from 'react'
import { desktop, type LnsLeitura } from './desktop'
import type { Measurement } from './catalog'
import type { LiveReadings } from './rooms'

export interface LnsReadingEntry {
  medidas: Partial<Record<Measurement, number>>
  recebidoEm: string
}

/**
 * Subscribes to live LNS readings pushed from the Electron main process and
 * keeps the latest value per devEui. A no-op outside the desktop app (the
 * bridge is absent, so nothing ever arrives — `roomClimateFromSensors` then
 * falls back to the simulation exactly as it always has).
 */
export function useLnsReadings() {
  const [readings, setReadings] = useState<Map<string, LnsReadingEntry>>(() => new Map())

  useEffect(() => {
    const shell = desktop()
    if (!shell) return
    return shell.aoReceberLeituraLns((leituras: LnsLeitura[]) => {
      setReadings((prev) => {
        const next = new Map(prev)
        for (const leitura of leituras) {
          if (leitura.erro) continue
          next.set(leitura.devEui, {
            medidas: leitura.medidas as Partial<Record<Measurement, number>>,
            recebidoEm: leitura.recebidoEm,
          })
        }
        return next
      })
    })
  }, [])

  // the shape rooms.ts actually consumes — devEui -> measurement values, no metadata
  const liveReadings = useMemo<LiveReadings>(() => {
    const map: LiveReadings = new Map()
    for (const [devEui, entry] of readings) map.set(devEui, entry.medidas)
    return map
  }, [readings])

  return { readings, liveReadings }
}
