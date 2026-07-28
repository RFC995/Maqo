/**
 * Maqo brand lockup. The mark is a coverage-ring glyph — a node broadcasting
 * two rings — which is exactly what the product plans: LoRaWAN devices and their
 * radio coverage. Rendered as inline SVG so it stays crisp and offline.
 */

let contadorGrad = 0

export function MaqoMark({ size = 28, className }: { size?: number; className?: string }) {
  // unique gradient id per instance so multiple marks on a page don't collide
  const id = `maqo-grad-${(contadorGrad += 1)}`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f9bff" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill={`url(#${id})`} />
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill="#fff" fillOpacity="0.04" />
      <circle cx="16" cy="16" r="10" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.5" fill="#fff" />
    </svg>
  )
}

export function MaqoLogo({
  size = 26,
  subtitle,
  className,
}: {
  size?: number
  /** small caption under the wordmark, e.g. "LoRaWAN Planner" */
  subtitle?: string
  className?: string
}) {
  return (
    <span className={className ? `maqo-logo ${className}` : 'maqo-logo'}>
      <MaqoMark size={size} />
      <span className="maqo-logo-text">
        <span className="maqo-wordmark">Maqo</span>
        {subtitle && <span className="maqo-subtitle">{subtitle}</span>}
      </span>
    </span>
  )
}
