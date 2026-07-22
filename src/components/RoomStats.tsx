import { roomClimateFromSensors, statusColors, type Room, type SensorSource } from '../rooms'
import { measurementLabels } from '../catalog'
import { formatReading, readingStatusColors } from '../telemetry'

interface RoomStatsProps {
  rooms: Room[]
  telemetryTick: number
  sensorsByRoom: Map<string, SensorSource[]>
  floorLabel: string
}

export function RoomStats({ rooms, telemetryTick, sensorsByRoom, floorLabel }: RoomStatsProps) {
  const monitored = rooms.filter((r) => (sensorsByRoom.get(r.id)?.length ?? 0) > 0)

  return (
    <div className="room-stats">
      <div className="room-stats-header">
        <span>Ambiente &middot; {floorLabel}</span>
        <span className="room-stats-note">
          {monitored.length > 0
            ? `${monitored.length} sala(s) monitorizada(s) · valores simulados`
            : 'coloca sensores nas salas para ver dados'}
        </span>
      </div>
      <div className="room-stats-track">
        {rooms.map((room) => {
          const sources = sensorsByRoom.get(room.id) ?? []
          const climate = roomClimateFromSensors(sources, telemetryTick)
          const color = statusColors[climate.status]
          return (
            <div key={room.id} className={climate.hasData ? 'room-card' : 'room-card empty'} style={{ borderColor: color }}>
              <div className="room-card-name">{room.name}</div>
              {climate.hasData ? (
                <div className="room-card-body">
                  <Gauge value={climate.temperature!} color={color} />
                  <div className="room-card-metrics">
                    {climate.readings
                      .filter((r) => r.measurement !== 'temperatura')
                      .map((reading) => (
                        <span key={reading.measurement} className="metric-line">
                          <span
                            className="metric-dot"
                            style={{ background: readingStatusColors[reading.status] }}
                            title={`Estado: ${reading.status}`}
                          />
                          {measurementLabels[reading.measurement]}:{' '}
                          <strong>{formatReading(reading.measurement, reading.value)}</strong>
                        </span>
                      ))}
                    <span className="metric-line live">
                      {climate.sensorCount} sensor{climate.sensorCount > 1 ? 'es' : ''} &middot; min{' '}
                      {climate.min24!.toFixed(1)} / max {climate.max24!.toFixed(1)} &deg;C
                    </span>
                  </div>
                </div>
              ) : (
                <div className="room-card-empty">
                  <span className="empty-dash">—</span>
                  <span className="empty-text">sem sensor</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Gauge({ value, color }: { value: number; color: string }) {
  const min = 14
  const max = 32
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = 26
  const circumference = 2 * Math.PI * r
  const arc = 0.78
  const dashTotal = circumference * arc
  const dashFilled = dashTotal * frac
  const rotation = 90 + (360 * (1 - arc)) / 2

  return (
    <div className="gauge">
      <svg viewBox="0 0 64 64" width={70} height={70}>
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeDasharray={`${dashTotal} ${circumference}`}
          transform={`rotate(${rotation} 32 32)`}
        />
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeDasharray={`${dashFilled} ${circumference}`}
          transform={`rotate(${rotation} 32 32)`}
        />
      </svg>
      <div className="gauge-value">
        {value.toFixed(1)}
        <span className="gauge-unit">&deg;C</span>
      </div>
    </div>
  )
}
