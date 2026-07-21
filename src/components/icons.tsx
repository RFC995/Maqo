import type { CSSProperties } from 'react'

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
