import { useState } from 'react'
import type { DeviceModel } from '../catalog'

/**
 * Product artwork.
 *
 * Milesight's own product photos are not bundled (the app stays offline and the
 * photos are theirs), so each product family is drawn to its real form factor —
 * an AM panel reads as a square e-ink wall panel, a UG67 as a cylinder with two
 * antennas, a VS133 as a ceiling ToF unit, and so on.
 *
 * To use the real catalogue photos instead, drop them in `public/devices/`
 * named after the model (e.g. `public/devices/AM319.png`) and they are picked
 * up automatically; the drawing stays as the fallback.
 */

export type ArtworkKind =
  | 'gateway-indoor'
  | 'gateway-outdoor'
  | 'gateway-solar'
  | 'panel-eink'
  | 'box-sensor'
  | 'box-probe'
  | 'distance'
  | 'pir'
  | 'contact'
  | 'leak'
  | 'scene-panel'
  | 'din'
  | 'thermostat'
  | 'radiator'
  | 'ct-clamp'
  | 'ceiling-vision'
  | 'ceiling-puck'
  | 'tracker'
  | 'weather'
  | 'generic'

/** Maps a catalog entry to the drawing that matches its physical shape. */
export function artworkFor(model: DeviceModel): ArtworkKind {
  const id = model.id
  if (id === 'ms-ug67') return 'gateway-outdoor'
  if (id === 'ms-sg50') return 'gateway-solar'
  if (model.type === 'gateway') return 'gateway-indoor'

  if (id.startsWith('ms-am')) return 'panel-eink'
  if (id === 'ms-ws202' || id === 'ms-ws203') return 'pir'
  if (id === 'ms-ws301' || id === 'ms-em300-mcs') return 'contact'
  if (id === 'ms-ws303' || id === 'ms-em300-sld' || id === 'ms-em300-zld') return 'leak'
  if (id === 'ms-ws156') return 'scene-panel'
  if (id === 'ms-uc100' || id === 'ms-uc300' || id === 'ms-ws558') return 'din'
  if (id === 'ms-wt201') return 'thermostat'
  if (id === 'ms-wt101') return 'radiator'
  if (id === 'ms-ct103') return 'ct-clamp'
  if (id === 'ms-vs121' || id === 'ms-vs125' || id === 'ms-vs133' || id === 'ms-vs135') return 'ceiling-vision'
  if (id.startsWith('ms-vs') || id === 'ms-gs301' || id === 'ms-ws302') return 'ceiling-puck'
  if (id.startsWith('ms-em400') || id === 'ms-ws201') return 'distance'
  if (id === 'ms-at101') return 'tracker'
  if (id === 'ms-wts506') return 'weather'
  if (id.startsWith('ms-em500') || id === 'ms-ts201') return 'box-probe'
  if (id.startsWith('ms-em3')) return 'box-sensor'
  return 'generic'
}

const SHELL = '#f4f6fa'
const SHELL_EDGE = '#c3ccdb'
const DARK = '#1e2a3d'
const SCREEN = '#dfe5ee'

/**
 * Falls back to the drawn artwork if no photo has been dropped into
 * public/devices/ for this model.
 */
export function DeviceArtwork({ model, size = 64 }: { model: DeviceModel; size?: number }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const hasPhotoSlot = model.brand !== 'Generico'

  if (hasPhotoSlot && !photoFailed) {
    return (
      <img
        className="device-photo"
        src={`${import.meta.env.BASE_URL}devices/${model.model}.png`}
        alt={model.name}
        width={size}
        height={size}
        onError={() => setPhotoFailed(true)}
      />
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="device-art" role="img" aria-label={model.name}>
      <Drawing kind={artworkFor(model)} />
    </svg>
  )
}

function Drawing({ kind }: { kind: ArtworkKind }) {
  switch (kind) {
    case 'gateway-indoor':
      return (
        <>
          <rect x="14" y="20" width="36" height="30" rx="4" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="46" y="6" width="4" height="15" rx="2" fill={DARK} />
          <circle cx="21" cy="45" r="1.8" fill="#22c55e" />
          <circle cx="27" cy="45" r="1.8" fill={SHELL_EDGE} />
          <path d="M24 30h16M24 35h11" stroke={SHELL_EDGE} strokeWidth="2" strokeLinecap="round" />
        </>
      )
    case 'gateway-outdoor':
      return (
        <>
          <rect x="20" y="18" width="24" height="34" rx="6" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="22" y="4" width="4" height="15" rx="2" fill={DARK} />
          <rect x="38" y="4" width="4" height="15" rx="2" fill={DARK} />
          <rect x="24" y="26" width="16" height="10" rx="2" fill={SCREEN} />
          <circle cx="32" cy="45" r="2" fill="#22c55e" />
        </>
      )
    case 'gateway-solar':
      return (
        <>
          <path d="M8 20h48l-6 10H14z" fill="#1e3a8a" stroke="#0f2557" strokeWidth="1.2" />
          <path d="M20 20l-3 10M32 20v10M44 20l3 10" stroke="#3b82f6" strokeWidth="1" />
          <rect x="24" y="31" width="16" height="20" rx="4" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="26" y="8" width="3" height="12" rx="1.5" fill={DARK} />
          <rect x="35" y="8" width="3" height="12" rx="1.5" fill={DARK} />
        </>
      )
    case 'panel-eink':
      return (
        <>
          <rect x="12" y="12" width="40" height="40" rx="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="17" y="17" width="30" height="23" rx="2" fill={SCREEN} />
          <path d="M21 24h12M21 29h18M21 34h9" stroke="#8fa0b8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="46" r="2.4" fill="none" stroke={SHELL_EDGE} strokeWidth="1.5" />
        </>
      )
    case 'box-sensor':
      return (
        <>
          <rect x="20" y="10" width="24" height="44" rx="6" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="26" y="18" width="12" height="16" rx="3" fill={SCREEN} />
          <path d="M28 40h8M28 45h5" stroke={SHELL_EDGE} strokeWidth="2" strokeLinecap="round" />
        </>
      )
    case 'box-probe':
      return (
        <>
          <rect x="12" y="14" width="26" height="34" rx="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="17" y="20" width="16" height="12" rx="2" fill={SCREEN} />
          <path d="M38 40c8 0 8-12 14-12" stroke={DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="53" cy="28" r="3" fill={DARK} />
        </>
      )
    case 'distance':
      return (
        <>
          <rect x="18" y="8" width="28" height="26" rx="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <circle cx="32" cy="21" r="6" fill={DARK} />
          <circle cx="32" cy="21" r="2.4" fill="#60a5fa" />
          <path d="M24 40h16M27 47h10M30 54h4" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
        </>
      )
    case 'pir':
      return (
        <>
          <rect x="16" y="14" width="32" height="36" rx="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <path d="M22 34a10 10 0 0 1 20 0z" fill={SCREEN} stroke={SHELL_EDGE} strokeWidth="1.2" />
          <path d="M26 30h12M28 26h8" stroke="#8fa0b8" strokeWidth="1.2" />
          <circle cx="32" cy="43" r="1.8" fill="#22c55e" />
        </>
      )
    case 'contact':
      return (
        <>
          <rect x="12" y="16" width="20" height="32" rx="4" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="38" y="20" width="10" height="24" rx="3" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <circle cx="22" cy="26" r="1.8" fill="#22c55e" />
          <path d="M33 32h4" stroke="#60a5fa" strokeWidth="1.6" strokeDasharray="2 2" />
        </>
      )
    case 'leak':
      return (
        <>
          <rect x="16" y="18" width="32" height="22" rx="8" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <circle cx="32" cy="29" r="4" fill={SCREEN} />
          <path d="M25 40v8M39 40v8" stroke={DARK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 50c2.5 3 4 4.6 4 6.4a4 4 0 0 1-8 0c0-1.8 1.5-3.4 4-6.4z" fill="#38bdf8" />
        </>
      )
    case 'scene-panel':
      return (
        <>
          <rect x="12" y="10" width="40" height="44" rx="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          {[0, 1, 2].map((row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={18 + col * 15}
                y={17 + row * 12}
                width="12"
                height="9"
                rx="2"
                fill={SCREEN}
                stroke={SHELL_EDGE}
                strokeWidth="0.8"
              />
            )),
          )}
        </>
      )
    case 'din':
      return (
        <>
          <rect x="10" y="18" width="44" height="28" rx="3" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="14" y="22" width="16" height="9" rx="1.5" fill={SCREEN} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={13 + i * 8} y="38" width="6" height="5" rx="1" fill={DARK} />
          ))}
          <circle cx="45" cy="26" r="2" fill="#22c55e" />
        </>
      )
    case 'thermostat':
      return (
        <>
          <rect x="12" y="14" width="40" height="36" rx="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <rect x="17" y="19" width="30" height="18" rx="2" fill={SCREEN} />
          <text x="32" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5b6b83">
            21°
          </text>
          <circle cx="24" cy="44" r="2.6" fill="none" stroke={SHELL_EDGE} strokeWidth="1.5" />
          <circle cx="40" cy="44" r="2.6" fill="none" stroke={SHELL_EDGE} strokeWidth="1.5" />
        </>
      )
    case 'radiator':
      return (
        <>
          <rect x="22" y="8" width="20" height="30" rx="10" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <path d="M26 16h12M26 21h12M26 26h12" stroke={SHELL_EDGE} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="26" y="38" width="12" height="8" rx="2" fill={DARK} />
          <rect x="28" y="46" width="8" height="10" rx="1.5" fill={SHELL_EDGE} />
        </>
      )
    case 'ct-clamp':
      return (
        <>
          <circle cx="32" cy="30" r="16" fill="none" stroke={SHELL} strokeWidth="9" />
          <circle cx="32" cy="30" r="16" fill="none" stroke={SHELL_EDGE} strokeWidth="1.2" />
          <circle cx="32" cy="30" r="11" fill="none" stroke={SHELL_EDGE} strokeWidth="1.2" />
          <path d="M32 14v9" stroke={DARK} strokeWidth="2.5" />
          <path d="M28 48h8v8h-8z" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.2" />
        </>
      )
    case 'ceiling-vision':
      return (
        <>
          <path d="M10 14h44v4H10z" fill={SHELL_EDGE} opacity="0.5" />
          <rect x="18" y="18" width="28" height="22" rx="4" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <circle cx="26" cy="29" r="5" fill={DARK} />
          <circle cx="26" cy="29" r="2" fill="#60a5fa" />
          <circle cx="39" cy="29" r="5" fill={DARK} />
          <circle cx="39" cy="29" r="2" fill="#60a5fa" />
          <path d="M20 46l-6 10M44 46l6 10" stroke="#60a5fa" strokeWidth="1.6" opacity="0.6" />
        </>
      )
    case 'ceiling-puck':
      return (
        <>
          <path d="M10 14h44v4H10z" fill={SHELL_EDGE} opacity="0.5" />
          <ellipse cx="32" cy="28" rx="16" ry="11" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <ellipse cx="32" cy="31" rx="6" ry="4" fill={SCREEN} />
          <path d="M22 42q10 9 20 0" stroke="#60a5fa" strokeWidth="1.6" fill="none" opacity="0.7" />
          <path d="M17 48q15 12 30 0" stroke="#60a5fa" strokeWidth="1.4" fill="none" opacity="0.45" />
        </>
      )
    case 'tracker':
      return (
        <>
          <rect x="18" y="12" width="28" height="40" rx="7" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <circle cx="32" cy="27" r="7" fill="none" stroke="#60a5fa" strokeWidth="2" />
          <circle cx="32" cy="27" r="2.5" fill="#60a5fa" />
          <path d="M25 42h14" stroke={SHELL_EDGE} strokeWidth="2" strokeLinecap="round" />
        </>
      )
    case 'weather':
      return (
        <>
          <path d="M32 12v40" stroke={SHELL_EDGE} strokeWidth="3" />
          <circle cx="20" cy="16" r="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.4" />
          <circle cx="44" cy="16" r="5" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.4" />
          <path d="M20 16h24" stroke={SHELL_EDGE} strokeWidth="2" />
          <rect x="24" y="30" width="16" height="14" rx="3" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.4" />
          <path d="M26 52h12" stroke={DARK} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    default:
      return (
        <>
          <rect x="16" y="16" width="32" height="32" rx="6" fill={SHELL} stroke={SHELL_EDGE} strokeWidth="1.5" />
          <path d="M24 32h16M32 24v16" stroke={SHELL_EDGE} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
  }
}
