import type { BuildingConfig, DeviceItem, DeviceType } from './types'
import { catalogById, type DeviceModel } from './catalog'
import { generateRooms, type Room, type RoomKind } from './rooms'

export interface PlanPreset {
  id: string
  name: string
  description: string
  /** the models the preset deploys, for the card's bill of materials */
  models: string[]
  generate: (building: BuildingConfig, seed: number) => DeviceItem[]
}

interface Draft {
  model: DeviceModel
  mount: DeviceItem['mount']
  floor: number | null
  x: number
  z: number
  /** where it goes, appended to the device name */
  place: string
  notes?: string
  radius?: number
}

function model(id: string): DeviceModel {
  const found = catalogById[id]
  if (!found) throw new Error(`Modelo desconhecido no plano: ${id}`)
  return found
}

function materialize(drafts: Draft[]): DeviceItem[] {
  const counters = new Map<string, number>()
  return drafts.map((d) => {
    const count = (counters.get(d.model.id) ?? 0) + 1
    counters.set(d.model.id, count)
    return {
      id: crypto.randomUUID(),
      name: `${d.model.model} · ${d.place}`,
      type: d.model.type as DeviceType,
      modelId: d.model.id,
      mount: d.mount,
      floor: d.floor,
      x: d.x,
      z: d.z,
      radius: d.radius ?? d.model.radius,
      notes: d.notes ?? '',
    }
  })
}

function floorName(index: number) {
  return index === 0 ? 'R/C' : `Piso ${index}`
}

/** Rooms per floor, so presets drop sensors inside real rooms and not on the corridor. */
function floorsWithRooms(building: BuildingConfig, seed: number): { floor: number; rooms: Room[] }[] {
  return Array.from({ length: building.floors }, (_, floor) => ({
    floor,
    rooms: generateRooms(building, floor, seed),
  }))
}

/** Rooms where people gather and CO2 actually matters. */
const occupiedKinds: RoomKind[] = ['openspace', 'reuniao', 'escritorio', 'direcao', 'rececao', 'refeitorio']

export const planPresets: PlanPreset[] = [
  {
    id: 'escritorio',
    name: 'Escritorio inteligente',
    description:
      'UG65 na cobertura, AM103 (T/H/CO2) em cada sala ocupada, WS202 nas restantes e VS133 a contar pessoas a entrada.',
    models: ['UG65', 'AM103', 'WS202', 'VS133', 'WS301'],
    generate(b, seed) {
      const drafts: Draft[] = [
        {
          model: model('ms-ug65'),
          mount: 'roof',
          floor: null,
          x: 0,
          z: 0,
          place: 'Cobertura',
          notes: 'Gateway principal. Antena vertical, longe de condutas metalicas.',
        },
      ]

      for (const { floor, rooms } of floorsWithRooms(b, seed)) {
        for (const room of rooms) {
          const occupied = occupiedKinds.includes(room.kind)
          drafts.push({
            model: model(occupied ? 'ms-am103' : 'ms-ws202'),
            mount: 'interior',
            floor,
            x: room.x,
            z: room.z,
            place: `${room.name} · ${floorName(floor)}`,
            notes: occupied ? 'A 1,5 m do chao, fora da corrente de ar do AVAC.' : 'Deteccao de presenca e luz.',
          })
        }
      }

      drafts.push({
        model: model('ms-vs133'),
        mount: 'interior',
        floor: 0,
        x: 0,
        z: b.depth / 2 - 1.2,
        place: 'Entrada principal',
        notes: 'Montar no teto sobre a porta, ate 3,5 m de altura.',
      })
      drafts.push({
        model: model('ms-ws301'),
        mount: 'interior',
        floor: 0,
        x: -b.width / 2 + 1.2,
        z: b.depth / 2 - 1.2,
        place: 'Porta de servico',
      })

      return materialize(drafts)
    },
  },
  {
    id: 'qualidade-ar',
    name: 'Qualidade do ar (WELL)',
    description:
      'AM319 9-em-1 nos espacos principais e AM307 nas restantes salas ocupadas. Cobertura completa de IAQ com CO2, TVOC e particulas.',
    models: ['UG65', 'AM319', 'AM307', 'EM300-TH'],
    generate(b, seed) {
      const drafts: Draft[] = [
        { model: model('ms-ug65'), mount: 'roof', floor: null, x: 0, z: 0, place: 'Cobertura' },
      ]

      for (const { floor, rooms } of floorsWithRooms(b, seed)) {
        const occupied = rooms.filter((r) => occupiedKinds.includes(r.kind))
        const flagship = occupied[0]
        for (const room of occupied) {
          drafts.push({
            model: model(room === flagship ? 'ms-am319' : 'ms-am307'),
            mount: 'interior',
            floor,
            x: room.x,
            z: room.z,
            place: `${room.name} · ${floorName(floor)}`,
            notes:
              room === flagship
                ? 'AM319 requer alimentacao USB 5 V permanente — prever tomada.'
                : 'Bateria: 3 a 4 anos com reporte de 10 em 10 minutos.',
          })
        }
        for (const room of rooms.filter((r) => !occupiedKinds.includes(r.kind))) {
          drafts.push({
            model: model('ms-em300-th'),
            mount: 'interior',
            floor,
            x: room.x,
            z: room.z,
            place: `${room.name} · ${floorName(floor)}`,
          })
        }
      }

      return materialize(drafts)
    },
  },
  {
    id: 'industrial',
    name: 'Armazem industrial',
    description:
      'UG56 industrial no interior e UG67 IP67 no exterior, EM300-TH nos cantos, UC300 a ler o PLC e EM300-ZLD na sala tecnica.',
    models: ['UG56', 'UG67', 'EM300-TH', 'UC300', 'EM300-ZLD', 'EM300-MCS'],
    generate(b, seed) {
      const dx = b.width / 2 - 2.5
      const dz = b.depth / 2 - 2.5
      const drafts: Draft[] = [
        {
          model: model('ms-ug56'),
          mount: 'roof',
          floor: null,
          x: 0,
          z: 0,
          place: 'Cobertura',
          notes: 'Cerca de 2 km em zona urbana; atravessa tres pisos em interior.',
        },
        {
          model: model('ms-ug67'),
          mount: 'ground',
          floor: null,
          x: b.width / 2 + 6,
          z: 0,
          place: 'Parque exterior',
          notes: 'IP67 em poste, cobre o parque e o cais de carga.',
        },
      ]

      for (const { floor } of floorsWithRooms(b, seed)) {
        for (const [x, z, corner] of [
          [-dx, -dz, 'canto NO'],
          [dx, -dz, 'canto NE'],
          [-dx, dz, 'canto SO'],
          [dx, dz, 'canto SE'],
        ] as [number, number, string][]) {
          drafts.push({
            model: model('ms-em300-th'),
            mount: 'interior',
            floor,
            x,
            z,
            place: `${corner} · ${floorName(floor)}`,
            notes: 'IP67, 10 anos de autonomia a 10 min de intervalo.',
          })
        }
      }

      drafts.push({
        model: model('ms-uc300'),
        mount: 'interior',
        floor: 0,
        x: -b.width / 4,
        z: -b.depth / 4,
        place: 'Quadro eletrico',
        notes: '4 DI / 2 DO / RS485 — le contadores e PLC existentes.',
      })
      drafts.push({
        model: model('ms-em300-zld'),
        mount: 'interior',
        floor: 0,
        x: b.width / 4,
        z: -b.depth / 4,
        place: 'Sala tecnica',
        notes: 'Cabo de deteccao ao longo do rodape.',
      })
      drafts.push({
        model: model('ms-em300-mcs'),
        mount: 'ground',
        floor: null,
        x: 0,
        z: b.depth / 2 + 1,
        place: 'Portao do cais',
      })

      return materialize(drafts)
    },
  },
  {
    id: 'energia',
    name: 'Eficiencia energetica',
    description:
      'WT201 a controlar o AVAC por sala, CT103 nos quadros, WS558 na iluminacao e VS121 a medir ocupacao real dos postos.',
    models: ['UG65', 'WT201', 'CT103', 'WS558', 'VS121', 'AM103'],
    generate(b, seed) {
      const drafts: Draft[] = [
        { model: model('ms-ug65'), mount: 'roof', floor: null, x: 0, z: 0, place: 'Cobertura' },
      ]

      for (const { floor, rooms } of floorsWithRooms(b, seed)) {
        const occupied = rooms.filter((r) => occupiedKinds.includes(r.kind))
        for (const room of occupied) {
          drafts.push({
            model: model('ms-wt201'),
            mount: 'interior',
            floor,
            x: room.x,
            z: room.z + room.depth * 0.3,
            place: `${room.name} · ${floorName(floor)}`,
            notes: 'Classe C: responde a comandos do servidor sem esperar por uplink.',
          })
        }
        if (occupied[0]) {
          drafts.push({
            model: model('ms-vs121'),
            mount: 'interior',
            floor,
            x: occupied[0].x,
            z: occupied[0].z - occupied[0].depth * 0.25,
            place: `Ocupacao ${occupied[0].name} · ${floorName(floor)}`,
            notes: 'A 3 m de altura cobre 4,8 x 14 m com deteccao multi-zona.',
          })
        }
        drafts.push({
          model: model('ms-ws558'),
          mount: 'interior',
          floor,
          x: -b.width / 2 + 1.5,
          z: 0,
          place: `Iluminacao ${floorName(floor)}`,
        })
        drafts.push({
          model: model('ms-ct103'),
          mount: 'interior',
          floor,
          x: -b.width / 2 + 1.5,
          z: 1.6,
          place: `Quadro ${floorName(floor)}`,
        })
      }

      return materialize(drafts)
    },
  },
  {
    id: 'cobertura-maxima',
    name: 'Cobertura redundante',
    description:
      'Dois UG65 em pisos opostos mais um UG67 exterior: cada uplink e ouvido por mais de um gateway, sem ponto unico de falha.',
    models: ['UG65', 'UG67', 'AM103', 'EM320-TH'],
    generate(b, seed) {
      const topFloor = Math.max(0, b.floors - 1)
      const midFloor = Math.floor(b.floors / 2)
      const drafts: Draft[] = [
        {
          model: model('ms-ug65'),
          mount: 'roof',
          floor: null,
          x: -b.width / 4,
          z: -b.depth / 4,
          place: 'Cobertura norte',
        },
        {
          model: model('ms-ug65'),
          mount: 'interior',
          floor: midFloor,
          x: b.width / 4,
          z: b.depth / 4,
          place: `Piso tecnico ${floorName(midFloor)}`,
          notes: 'Gateway intermedio: reduz as lajes atravessadas pelos pisos inferiores.',
        },
        {
          model: model('ms-ug67'),
          mount: 'ground',
          floor: null,
          x: -b.width / 2 - 6,
          z: b.depth / 4,
          place: 'Poste exterior',
        },
      ]

      for (const { floor, rooms } of floorsWithRooms(b, seed)) {
        for (const room of rooms) {
          drafts.push({
            model: model(floor === topFloor ? 'ms-em320-th' : 'ms-am103'),
            mount: 'interior',
            floor,
            x: room.x,
            z: room.z,
            place: `${room.name} · ${floorName(floor)}`,
          })
        }
      }

      return materialize(drafts)
    },
  },
]
