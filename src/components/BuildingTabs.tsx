import type { Building, DeviceItem } from '../types'
import { BuildingIcon, PlusIcon, TrashIcon } from './icons'

interface BuildingTabsProps {
  buildings: Building[]
  devices: DeviceItem[]
  activeBuildingId: string
  onChange: (id: string) => void
  onAdd?: () => void
  onDelete?: (id: string) => void
  readOnly?: boolean
}

export function BuildingTabs({
  buildings,
  devices,
  activeBuildingId,
  onChange,
  onAdd,
  onDelete,
  readOnly = false,
}: BuildingTabsProps) {
  function countFor(buildingId: string) {
    return devices.filter((d) => d.buildingId === buildingId).length
  }

  return (
    <div className="floor-tabs building-tabs">
      <BuildingIcon size={14} className="building-tabs-icon" />

      {buildings.map((b) => {
        const count = countFor(b.id)
        const active = b.id === activeBuildingId
        return (
          <button
            key={b.id}
            type="button"
            className={active ? 'floor-tab active' : 'floor-tab'}
            onClick={() => onChange(b.id)}
          >
            {b.config.name}
            {count > 0 && <span className="tab-badge">{count}</span>}
            {!readOnly && onDelete && buildings.length > 1 && (
              <span
                role="button"
                tabIndex={-1}
                className="building-tab-remove"
                title="Remover edificio"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(b.id)
                }}
              >
                <TrashIcon size={11} />
              </span>
            )}
          </button>
        )
      })}

      {!readOnly && onAdd && (
        <button type="button" className="floor-tab" onClick={onAdd} title="Adicionar edificio">
          <PlusIcon size={14} />
          Novo edificio
        </button>
      )}
    </div>
  )
}
