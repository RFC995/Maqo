import type { ReactNode } from 'react'
import type { BuildingConfig, DeviceItem, FloorSelector } from '../types'
import { LayersIcon, RoofIcon, GroundIcon } from './icons'

interface FloorTabsProps {
  building: BuildingConfig
  devices: DeviceItem[]
  activeFloor: FloorSelector
  onChange: (floor: FloorSelector) => void
}

export function FloorTabs({ building, devices, activeFloor, onChange }: FloorTabsProps) {
  function countFor(key: FloorSelector) {
    if (key === 'all') return devices.length
    if (key === 'roof') return devices.filter((d) => d.mount === 'roof').length
    if (key === 'ground') return devices.filter((d) => d.mount === 'ground').length
    return devices.filter((d) => d.mount === 'interior' && d.floor === key).length
  }

  const floorKeys: FloorSelector[] = Array.from({ length: building.floors }, (_, i) => i)

  return (
    <div className="floor-tabs">
      <TabButton active={activeFloor === 'all'} onClick={() => onChange('all')}>
        <LayersIcon size={14} />
        Vista geral
      </TabButton>

      <div className="floor-tabs-divider" />

      {floorKeys.map((key) => {
        const n = key as number
        const count = countFor(key)
        return (
          <TabButton key={n} active={activeFloor === n} onClick={() => onChange(n)}>
            {n === 0 ? 'Res-do-chao' : `Piso ${n}`}
            {count > 0 && <span className="tab-badge">{count}</span>}
          </TabButton>
        )
      })}

      <div className="floor-tabs-divider" />

      <TabButton active={activeFloor === 'roof'} onClick={() => onChange('roof')}>
        <RoofIcon size={14} />
        Cobertura
        {countFor('roof') > 0 && <span className="tab-badge">{countFor('roof')}</span>}
      </TabButton>
      <TabButton active={activeFloor === 'ground'} onClick={() => onChange('ground')}>
        <GroundIcon size={14} />
        Exterior
        {countFor('ground') > 0 && <span className="tab-badge">{countFor('ground')}</span>}
      </TabButton>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={active ? 'floor-tab active' : 'floor-tab'} onClick={onClick}>
      {children}
    </button>
  )
}
