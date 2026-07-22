import { roomKindLabels, type BuildingConfig, type Room, type RoomKind } from '../types'
import { LayersIcon, PlusIcon, TrashIcon } from './icons'

interface RoomEditorProps {
  building: BuildingConfig
  rooms: Room[]
  floorLabel: string
  customised: boolean
  selectedRoomId: string | null
  onSelectRoom: (id: string | null) => void
  onUpdateRoom: (id: string, patch: Partial<Room>) => void
  onAddRoom: () => void
  onDeleteRoom: (id: string) => void
  onResetFloor: () => void
}

/**
 * Floor plan editor: rename rooms, change what they are used for, resize and
 * reposition them. Editing any room turns the floor from procedural into a
 * hand-made layout that survives reseeding the building.
 */
export function RoomEditor({
  building,
  rooms,
  floorLabel,
  customised,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoom,
  onAddRoom,
  onDeleteRoom,
  onResetFloor,
}: RoomEditorProps) {
  const selected = rooms.find((r) => r.id === selectedRoomId) ?? null

  return (
    <section className="panel room-editor">
      <h2>
        <LayersIcon size={15} /> Salas &middot; {floorLabel}
      </h2>

      <p className="panel-hint">
        Clica numa sala na planta 2D para a editar, ou arrasta-a para a mudar de sitio.
        {customised ? ' Este piso tem uma planta personalizada.' : ' Planta gerada automaticamente.'}
      </p>

      <ul className="room-list">
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              className={room.id === selectedRoomId ? 'room-list-row active' : 'room-list-row'}
              onClick={() => onSelectRoom(room.id)}
            >
              <span className="room-list-name">{room.name}</span>
              <span className="room-list-size">
                {room.width.toFixed(1)} &times; {room.depth.toFixed(1)} m
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="room-actions">
        <button type="button" className="secondary" onClick={onAddRoom}>
          <PlusIcon size={13} /> Nova sala
        </button>
        {customised && (
          <button type="button" className="link-btn" onClick={onResetFloor}>
            Repor planta automatica
          </button>
        )}
      </div>

      {selected && (
        <div className="inspector room-inspector">
          <div className="panel-header-row">
            <h3>Sala selecionada</h3>
            <button
              type="button"
              className="icon-only-btn"
              title="Remover sala"
              onClick={() => onDeleteRoom(selected.id)}
            >
              <TrashIcon size={15} />
            </button>
          </div>

          <label>
            Nome
            <input
              type="text"
              value={selected.name}
              onChange={(event) => onUpdateRoom(selected.id, { name: event.target.value })}
            />
          </label>

          <label>
            Tipo de espaco
            <select
              value={selected.kind}
              onChange={(event) => {
                const kind = event.target.value as RoomKind
                // keep a hand-typed name, but follow along if it was still the default
                const wasDefault = selected.name.startsWith(roomKindLabels[selected.kind])
                onUpdateRoom(selected.id, wasDefault ? { kind, name: roomKindLabels[kind] } : { kind })
              }}
            >
              {(Object.keys(roomKindLabels) as RoomKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {roomKindLabels[kind]}
                </option>
              ))}
            </select>
          </label>

          <div className="field-grid">
            <label>
              Largura (m)
              <input
                type="number"
                min={1.5}
                max={building.width}
                step={0.1}
                value={Number(selected.width.toFixed(1))}
                onChange={(event) => onUpdateRoom(selected.id, { width: Number(event.target.value) })}
              />
            </label>
            <label>
              Profundidade (m)
              <input
                type="number"
                min={1.5}
                max={building.depth}
                step={0.1}
                value={Number(selected.depth.toFixed(1))}
                onChange={(event) => onUpdateRoom(selected.id, { depth: Number(event.target.value) })}
              />
            </label>
            <label>
              X (m)
              <input
                type="number"
                step={0.1}
                value={Number(selected.x.toFixed(1))}
                onChange={(event) => onUpdateRoom(selected.id, { x: Number(event.target.value) })}
              />
            </label>
            <label>
              Z (m)
              <input
                type="number"
                step={0.1}
                value={Number(selected.z.toFixed(1))}
                onChange={(event) => onUpdateRoom(selected.id, { z: Number(event.target.value) })}
              />
            </label>
          </div>

          <label>
            Porta virada para
            <select
              value={String(selected.doorSide)}
              onChange={(event) => onUpdateRoom(selected.id, { doorSide: Number(event.target.value) as 1 | -1 })}
            >
              <option value="1">Norte (-Z)</option>
              <option value="-1">Sul (+Z)</option>
            </select>
          </label>

          <p className="panel-hint">
            Area util <strong>{(selected.width * selected.depth).toFixed(1)} m&sup2;</strong>. Os sensores colocados
            dentro desta area passam a alimentar as leituras da sala.
          </p>
        </div>
      )}
    </section>
  )
}
