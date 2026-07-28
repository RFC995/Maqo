import { useCallback, useEffect, useRef, useState } from 'react'
import { desktop } from './desktop'
import { carregarConfig, configPronta, guardarConfig, normalizarUplink, type ConfigIntegracao } from './integracao'
import { definirEstado, estadoIntegracao, registarUplink, type EstadoIntegracao } from './liveStore'

export interface Integracao {
  /** the MQTT bridge is a desktop-only feature */
  suportado: boolean
  config: ConfigIntegracao
  definirConfig: (c: ConfigIntegracao) => void
  estado: EstadoIntegracao
  ligar: () => Promise<void>
  desligar: () => Promise<void>
}

function carimbar(e: EstadoIntegracao): EstadoIntegracao {
  return { ...e, desde: e.desde ?? Date.now() }
}

/**
 * Owns the TTN / ChirpStack connection lifecycle from the renderer side: keeps
 * the config, mirrors the bridge's connection state, and funnels every decoded
 * uplink into the live store. `onDados` is called whenever new data lands so
 * the caller can refresh the 3D/2D scene.
 */
export function useIntegracao(onDados: () => void): Integracao {
  const shell = desktop()
  const suportado = shell != null
  const [config, setConfig] = useState<ConfigIntegracao>(() => carregarConfig())
  const [estado, setEstado] = useState<EstadoIntegracao>(() => estadoIntegracao())

  const onDadosRef = useRef(onDados)
  onDadosRef.current = onDados
  const configRef = useRef(config)
  configRef.current = config

  const aplicarEstado = useCallback((e: EstadoIntegracao) => {
    const carimbado = carimbar(e)
    definirEstado(carimbado)
    setEstado(carimbado)
  }, [])

  // subscribe to the bridge once
  useEffect(() => {
    if (!shell) return
    const offUplink = shell.aoUplinkIntegracao(({ provedor, mensagem }) => {
      try {
        const u = normalizarUplink(provedor, JSON.parse(mensagem))
        if (u) {
          registarUplink(u)
          onDadosRef.current()
        }
      } catch {
        // malformed payload — skip it
      }
    })
    const offEstado = shell.aoEstadoIntegracao((e) => {
      aplicarEstado(e)
      onDadosRef.current()
    })
    shell.integracaoEstado().then(aplicarEstado)
    return () => {
      offUplink()
      offEstado()
    }
  }, [shell, aplicarEstado])

  const ligar = useCallback(async () => {
    const s = desktop()
    const c = configRef.current
    if (!s || !configPronta(c)) return
    aplicarEstado({ estado: 'a-ligar', provedor: c.provedor, desde: Date.now() })
    const r = await s.integracaoLigar(c)
    if (!r.ok) {
      aplicarEstado({ estado: 'erro', provedor: c.provedor, mensagem: r.motivo, desde: Date.now() })
    }
  }, [aplicarEstado])

  const desligar = useCallback(async () => {
    const s = desktop()
    if (!s) return
    await s.integracaoDesligar()
    aplicarEstado({ estado: 'desligado', desde: Date.now() })
  }, [aplicarEstado])

  const definirConfig = useCallback((c: ConfigIntegracao) => {
    setConfig(c)
    guardarConfig(c)
  }, [])

  // reconnect automatically on open when a saved config asks for it
  const jaTentouAuto = useRef(false)
  useEffect(() => {
    if (!shell || jaTentouAuto.current) return
    jaTentouAuto.current = true
    const c = configRef.current
    if (c.ligarAoIniciar && configPronta(c)) ligar()
  }, [shell, ligar])

  return { suportado, config, definirConfig, estado, ligar, desligar }
}
