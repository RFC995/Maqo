import { buildingStyleLabels, type BuildingConfig, type BuildingStyle } from '../types'
import { BuildingIcon } from './icons'

interface SidebarProps {
  building: BuildingConfig
  onUpdateBuilding: (patch: Partial<BuildingConfig>) => void
  onRegenerateVariant: () => void
}

export function Sidebar({ building, onUpdateBuilding, onRegenerateVariant }: SidebarProps) {
  return (
    <aside className="sidebar">
      <section className="panel">
        <h2>
          <BuildingIcon size={15} /> Edificio
        </h2>
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
    </aside>
  )
}
