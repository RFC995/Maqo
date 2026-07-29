import { useRef, type ComponentType, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Cenario } from '../types'
import { cenarioMeta, ordemCenarios } from '../cenarios'
import { MaqoLogo } from './Logo'
import { BuildingIcon, ParkingIcon, LeafIcon, CityIcon, SparklesIcon, UploadIcon } from './icons'

interface OnboardingProps {
  onEscolher: (cenario: Cenario) => void
  onImportar: (file: File) => void
  /** absent on first run, so there is nothing to go back to */
  onCancelar?: () => void
}

const cenarioIcons: Record<Cenario, ComponentType<{ size?: number }>> = {
  parking: ParkingIcon,
  edificios: BuildingIcon,
  agricultura: LeafIcon,
  cidade: CityIcon,
  livre: SparklesIcon,
}

/**
 * The startup template picker. Rendered over everything via a portal (like the
 * report) so it does not have to live inside the dashboard layout. Choosing a
 * card seeds a fresh project for that scenario.
 */
export function Onboarding({ onEscolher, onImportar, onCancelar }: OnboardingProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return createPortal(
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Escolher cenario">
      <div className="onboarding-panel">
        <header className="onboarding-head">
          <div className="onboarding-head-text">
            <MaqoLogo size={34} subtitle="LoRaWAN Planner" />
            <h1>O que vamos planear?</h1>
            <p>Escolhe um cenário para começar. Cada um vem com equipamento Milesight real e uma rede pré-dimensionada — podes trocar a qualquer momento em "Novo".</p>
          </div>
          {onCancelar && (
            <button type="button" className="onboarding-close" onClick={onCancelar} aria-label="Fechar">
              ×
            </button>
          )}
        </header>

        <div className="onboarding-grid">
          {ordemCenarios.map((cenario) => {
            const meta = cenarioMeta[cenario]
            const Icon = cenarioIcons[cenario]
            return (
              <button
                key={cenario}
                type="button"
                className="cenario-card"
                style={{ '--accent': meta.accent } as CSSProperties}
                onClick={() => onEscolher(cenario)}
              >
                <span className="cenario-card-icon">
                  <Icon size={26} />
                </span>
                <span className="cenario-card-title">{meta.label}</span>
                <span className="cenario-card-tag">{meta.tagline}</span>
                <span className="cenario-card-blurb">{meta.blurb}</span>
                <ul className="cenario-card-list">
                  {meta.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="cenario-card-cta">Começar →</span>
              </button>
            )
          })}
        </div>

        <footer className="onboarding-foot">
          <button type="button" className="onboarding-open" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon size={15} />
            Abrir projeto existente…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onImportar(file)
              event.target.value = ''
            }}
          />
        </footer>
      </div>
    </div>,
    document.body,
  )
}
