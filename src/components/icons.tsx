import type { CSSProperties } from 'react'
import type { CatalogCategory } from '../catalog'

type IconProps = { size?: number; className?: string; style?: CSSProperties }

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function GatewayIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 2v6" />
      <path d="M8.5 5.5a5 5 0 0 0 0 7M15.5 5.5a5 5 0 0 1 0 7" />
      <path d="M5.5 3a9 9 0 0 0 0 12M18.5 3a9 9 0 0 1 0 12" />
      <rect x="6" y="12" width="12" height="9" rx="1.5" />
      <path d="M9 16h6M9 19h3" />
    </svg>
  )
}

export function SensorIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
    </svg>
  )
}

export function CameraIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.2-1.6A2 2 0 0 1 9.8 3.6h4.4a2 2 0 0 1 1.6.8L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  )
}

export function RepeaterIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 20v-7" />
      <path d="M9 13a3 3 0 0 1 6 0" />
      <path d="M6 9a7 7 0 0 1 12 0" />
      <path d="M3.5 5.5a11 11 0 0 1 17 0" />
      <circle cx="12" cy="20.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function RoofIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M9 20v-5h6v5" />
    </svg>
  )
}

export function GroundIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M3 20h18" />
      <path d="M8 20V9l4-4 4 4v11" />
      <path d="M12 20v-6" />
    </svg>
  )
}

export function LayersIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  )
}

export function DownloadIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  )
}

export function UploadIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M4 19h16" />
    </svg>
  )
}

export function PlusIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TrashIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function SunIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

export function DuskIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M4 17h16" />
      <circle cx="12" cy="13" r="4" />
      <path d="M12 6V4M6.5 8.5 5 7M17.5 8.5 19 7" />
      <path d="M2 20h20" />
    </svg>
  )
}

export function MoonIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

export function TargetIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BuildingIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" strokeWidth={2.4} />
    </svg>
  )
}

export function SignalIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M4 20v-4M9 20v-8M14 20V8M19 20V4" />
    </svg>
  )
}

export function BatteryIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <rect x="2" y="8" width="16" height="9" rx="2" />
      <path d="M21 11v3" />
      <path d="M5.5 11v3M9 11v3" />
    </svg>
  )
}

export function ReportIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  )
}

export function ParkingIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9.5 16V8h3.2a2.4 2.4 0 0 1 0 4.8H9.5" />
    </svg>
  )
}

export function LeafIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M4 20c0-8 6-14 16-14 0 10-6 14-14 14a5 5 0 0 1-2 0Z" />
      <path d="M5 19c4-5 8-7 12-8" />
    </svg>
  )
}

export function CityIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M3 21h18" />
      <path d="M5 21V9l5-3v15" />
      <path d="M10 21V11l6-3v13" />
      <path d="M16 21V13l3-1.5V21" />
      <path d="M7.5 12h.01M7.5 15h.01M12.5 14h.01M12.5 17h.01" strokeWidth={2.2} />
    </svg>
  )
}

export function CloudIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 .5 6.98" />
      <path d="M9 21l1.5-2.5M12 21l1.5-2.5M15 21l1.5-2.5" />
    </svg>
  )
}

/** Water-leak alert marker. Color (not shape) conveys wet vs. dry — pass it via `style.color`. */
export function LeakIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 3c-3.4 4.4-6.4 8.5-6.4 11.8a6.4 6.4 0 0 0 12.8 0C18.4 11.5 15.4 7.4 12 3Z" />
      <path d="M12 10.3v3.2" strokeWidth={2.2} />
      <circle cx="12" cy="16.2" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Tank / fill-level marker. `level` (0-100) sets how full the inner fill sits. */
export function TankIcon({ size, className, style, level = 0 }: IconProps & { level?: number }) {
  const pct = Math.max(0, Math.min(100, level)) / 100
  const fillH = 14 * pct
  const fillY = 19 - fillH
  return (
    <svg {...base(size)} className={className} style={style}>
      <rect x="5" y="4" width="14" height="15" rx="2" />
      <path d="M8 4V2.5h8V4" />
      {pct > 0 && <rect x="6.4" y={fillY} width="11.2" height={fillH} rx="1" fill="currentColor" stroke="none" opacity={0.8} />}
      {pct > 0 && <path d={`M6.4 ${fillY}h11.2`} strokeWidth={1.4} />}
    </svg>
  )
}

/** Air-quality marker (IAQ panels: CO2/TVOC/PM/HCHO/O3). */
export function IaqIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M3 8h11a3 3 0 1 0-2.4-4.8" />
      <path d="M3 12.5h15a3 3 0 1 1-2.4 4.8" />
      <path d="M3 17h8a2.4 2.4 0 1 1-2 3.8" />
    </svg>
  )
}

/** Ambient temperature/humidity marker. */
export function ThermometerIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 3a2.4 2.4 0 0 0-2.4 2.4v9.3a4 4 0 1 0 4.8 0V5.4A2.4 2.4 0 0 0 12 3Z" />
      <circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 8v6" strokeWidth={1.6} />
    </svg>
  )
}

/** Occupancy / presence / door-contact marker. */
export function PresenceIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="12" cy="7" r="3" />
      <path d="M5.5 20.5c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5" />
    </svg>
  )
}

/** People-counting marker. */
export function CountIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="9" cy="7" r="2.6" />
      <path d="M3.8 20c0-3.2 2.3-5.4 5.2-5.4s5.2 2.2 5.2 5.4" />
      <circle cx="17" cy="7.5" r="2.1" />
      <path d="M15.8 14.9c2.4 0.3 4.2 2.3 4.2 5.1" />
    </svg>
  )
}

/** Energy / power marker. */
export function EnergyIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M13 2 4.5 13.5h5.8L11 22l8.5-11.5h-5.8Z" />
    </svg>
  )
}

/** Control / relay / I-O marker. */
export function ControlIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <circle cx="15.5" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SparklesIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6Z" />
      <path d="M18 4.5v3M19.5 6h-3M5 16v2.5M6.25 17.25h-2.5" />
    </svg>
  )
}

/** Alert / warning marker, used by the dashboard's KPI summary. */
export function AlertIcon({ size, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 3.5 22 20H2Z" />
      <path d="M12 10v4.4" strokeWidth={2.2} />
      <circle cx="12" cy="17.2" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** One representative marker icon per catalog category, for the dashboard's sensor markers. */
export const categoryIcons: Record<CatalogCategory, typeof GatewayIcon> = {
  gateway: GatewayIcon,
  iaq: IaqIcon,
  ambiente: ThermometerIcon,
  ocupacao: PresenceIcon,
  contagem: CountIcon,
  agua: LeakIcon,
  nivel: TankIcon,
  energia: EnergyIcon,
  controlo: ControlIcon,
  exterior: CloudIcon,
  generico: SensorIcon,
}

