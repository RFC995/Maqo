import { useRef } from 'react'
import type { TimeOfDay } from './Scene3D'
import type { AppView } from '../types'
import { MaqoLogo } from './Logo'
import {
  DownloadIcon,
  UploadIcon,
  SunIcon,
  DuskIcon,
  MoonIcon,
  TargetIcon,
  PlusIcon,
  ReportIcon,
  BuildingIcon,
  SignalIcon,
} from './icons'

interface TopBarProps {
  projectName: string
  onRename: (name: string) => void
  view: AppView
  onViewChange: (view: AppView) => void
  timeOfDay: TimeOfDay
  onTimeOfDay: (value: TimeOfDay) => void
  tema: 'light' | 'dark'
  onToggleTema: () => void
  onExport: () => void
  onImport: (file: File) => void
  onNewProject: () => void
  onResetView: () => void
  onRelatorio: () => void
  savedLabel: string
}

const timeOptions: { key: TimeOfDay; label: string; icon: typeof SunIcon }[] = [
  { key: 'day', label: 'Dia', icon: SunIcon },
  { key: 'dusk', label: 'Entardecer', icon: DuskIcon },
  { key: 'night', label: 'Noite', icon: MoonIcon },
]

export function TopBar({
  projectName,
  onRename,
  view,
  onViewChange,
  timeOfDay,
  onTimeOfDay,
  tema,
  onToggleTema,
  onExport,
  onImport,
  onNewProject,
  onResetView,
  onRelatorio,
  savedLabel,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <MaqoLogo size={30} subtitle="LoRaWAN Planner" />
        <span className="topbar-sep" aria-hidden="true" />
        <input
          className="project-name-input"
          value={projectName}
          onChange={(event) => onRename(event.target.value)}
          spellCheck={false}
        />
        <span className="saved-indicator">{savedLabel}</span>
      </div>

      <div className="topbar-center">
        <button
          type="button"
          className="icon-btn view-toggle"
          onClick={() => onViewChange(view === 'planeamento' ? 'dashboard' : 'planeamento')}
          title={view === 'planeamento' ? 'Ver dashboard' : 'Voltar ao planeamento'}
        >
          {view === 'planeamento' ? <SignalIcon size={16} /> : <BuildingIcon size={16} />}
          <span>{view === 'planeamento' ? 'Dashboard' : 'Planeamento'}</span>
        </button>

        {view === 'planeamento' && (
          <div className="time-toggle">
            {timeOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={timeOfDay === key ? 'time-btn active' : 'time-btn'}
                onClick={() => onTimeOfDay(key)}
                title={label}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={onToggleTema}
          title={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          aria-label={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {tema === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          <span>{tema === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>
        <button type="button" className="icon-btn" onClick={onResetView} title="Repor vista">
          <TargetIcon size={16} />
          <span>Vista</span>
        </button>
        <button type="button" className="icon-btn" onClick={onRelatorio} title="Gerar relatorio de proposta">
          <ReportIcon size={16} />
          <span>Relatorio</span>
        </button>

        <button type="button" className="icon-btn" onClick={onExport} title="Exportar projeto (.json)">
          <DownloadIcon size={16} />
          <span>Exportar</span>
        </button>
        <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Importar projeto">
          <UploadIcon size={16} />
          <span>Importar</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onImport(file)
            event.target.value = ''
          }}
        />
        <button type="button" className="icon-btn primary" onClick={onNewProject} title="Novo projeto">
          <PlusIcon size={16} />
          <span>Novo</span>
        </button>
      </div>
    </header>
  )
}
