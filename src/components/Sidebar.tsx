import { useEffect, useState, type ReactNode } from 'react'
import { buildingStyleLabels, type BuildingConfig, type BuildingStyle } from '../types'
import { BuildingIcon, LayersIcon, SignalIcon } from './icons'

type TabId = 'edificio' | 'rede' | 'salas'

interface SidebarProps {
  building: BuildingConfig
  onUpdateBuilding: (patch: Partial<BuildingConfig>) => void
  onRegenerateVariant: () => void
  /** network analysis section */
  network: ReactNode
  /** room editor, absent unless a real floor is selected */
  rooms: ReactNode
}

/**
 * Left rail. The three sections are tabbed rather than stacked: together they
 * are far taller than the viewport, and stacking them buried the building
 * controls under a scroll.
 */
export function Sidebar({ building, onUpdateBuilding, onRegenerateVariant, network, rooms }: SidebarProps) {
  const [tab, setTab] = useState<TabId>('edificio')

  // the rooms tab only exists while a floor is selected
  useEffect(() => {
    if (tab === 'salas' && !rooms) setTab('edificio')
  }, [rooms, tab])

  return (
    <aside className="sidebar">
      <nav className="sidebar-tabs" role="tablist">
        <SidebarTab id="edificio" active={tab} onSelect={setTab} icon={<BuildingIcon size={14} />} label="Edificio" />
        <SidebarTab id="rede" active={tab} onSelect={setTab} icon={<SignalIcon size={14} />} label="Rede" />
        <SidebarTab
          id="salas"
          active={tab}
          onSelect={setTab}
          icon={<LayersIcon size={14} />}
          label="Salas"
          disabled={!rooms}
          title={rooms ? undefined : 'Seleciona um piso para editar as salas'}
        />
      </nav>

      <div className="sidebar-scroll">
        {tab === 'edificio' && (
          <section className="panel">
            <label>
              Nome
              <input
                type="text"
                value={building.name}
                onChange={(event) => onUpdateBuilding({ name: event.target.value })}
              />
            </label>

            <label>
              Estilo
              <select
                value={building.style}
                onChange={(event) => onUpdateBuilding({ style: event.target.value as BuildingStyle })}
              >
                {(Object.keys(buildingStyleLabels) as BuildingStyle[]).map((key) => (
                  <option key={key} value={key}>
                    {buildingStyleLabels[key]}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-grid">
              <label>
                Largura (m)
                <input
                  type="number"
                  min={8}
                  max={90}
                  value={building.width}
                  onChange={(event) => onUpdateBuilding({ width: Number(event.target.value) })}
                />
              </label>
              <label>
                Profundidade (m)
                <input
                  type="number"
                  min={8}
                  max={90}
                  value={building.depth}
                  onChange={(event) => onUpdateBuilding({ depth: Number(event.target.value) })}
                />
              </label>
              <label>
                Pisos
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={building.floors}
                  onChange={(event) => onUpdateBuilding({ floors: Math.round(Number(event.target.value)) })}
                />
              </label>
              <label>
                P&eacute; direito (m)
                <input
                  type="number"
                  min={2.4}
                  max={6}
                  step={0.1}
                  value={building.floorHeight}
                  onChange={(event) => onUpdateBuilding({ floorHeight: Number(event.target.value) })}
                />
              </label>
            </div>

            <button type="button" className="secondary" onClick={onRegenerateVariant}>
              Gerar nova variante
            </button>
          </section>
        )}

        {tab === 'rede' && network}
        {tab === 'salas' && rooms}
      </div>
    </aside>
  )
}

function SidebarTab({
  id,
  active,
  onSelect,
  icon,
  label,
  disabled,
  title,
}: {
  id: TabId
  active: TabId
  onSelect: (id: TabId) => void
  icon: ReactNode
  label: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === id}
      className={active === id ? 'sidebar-tab active' : 'sidebar-tab'}
      onClick={() => onSelect(id)}
      disabled={disabled}
      title={title}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
