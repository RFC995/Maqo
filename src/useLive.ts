import { useSyncExternalStore } from 'react'
import { subscrever, versao } from './liveStore'

/**
 * Re-renders a component whenever the live-data store changes (a new uplink or
 * a connection-state change). Used by the panels that show real readings so
 * they update the moment data lands, independent of the telemetry tick.
 */
export function useLiveVersion(): number {
  return useSyncExternalStore(subscrever, versao, versao)
}
