import { useState } from 'react'
import { PRESETS, SPEED_STEPS, type BackgroundSettings } from '../lib/background-settings'

interface BackgroundPanelProps {
  settings: BackgroundSettings
  onChange: (changes: Partial<BackgroundSettings>) => void
}

export function BackgroundPanel({ settings, onChange }: BackgroundPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-panel-wrap">
      {open && (
        <div className="bg-panel" role="dialog" aria-label="背景设置">
          {/* Header: title + on/off toggle */}
          <div className="bg-panel-header">
            <span className="bg-panel-title">背景设置</span>
            <label className="bg-toggle" aria-label={settings.enabled ? '关闭背景' : '开启背景'}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => onChange({ enabled: e.target.checked })}
              />
              <span className="bg-toggle-track">
                <span className="bg-toggle-thumb" />
              </span>
            </label>
          </div>

          <div className={`bg-panel-body${settings.enabled ? '' : ' bg-panel-body--dim'}`}>
            {/* Color presets */}
            <p className="bg-section-label">主题配色</p>
            <div className="bg-presets">
              {PRESETS.map((preset) => {
                const active = settings.presetId === preset.id
                return (
                  <button
                    key={preset.id}
                    className={`bg-preset-btn${active ? ' active' : ''}`}
                    onClick={() => onChange({ presetId: preset.id })}
                    aria-pressed={active}
                    aria-label={preset.name}
                    title={preset.name}
                  >
                    <span
                      className="bg-swatch"
                      style={{
                        background: `linear-gradient(135deg, ${preset.swatch[0]} 0%, ${preset.swatch[1]} 100%)`
                      }}
                    />
                    <span className="bg-preset-name">{preset.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Flow speed */}
            <p className="bg-section-label">流动速度</p>
            <div className="bg-speed-group">
              {SPEED_STEPS.map((step) => (
                <button
                  key={step.value}
                  className={`bg-speed-btn${settings.speed === step.value ? ' active' : ''}`}
                  onClick={() => onChange({ speed: step.value })}
                  aria-pressed={settings.speed === step.value}
                >
                  {step.label}
                </button>
              ))}
            </div>

            {/* Opacity */}
            <p className="bg-section-label">
              透明度
              <span className="bg-value-label">{Math.round(settings.opacity * 100)}%</span>
            </p>
            <input
              className="bg-slider"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={settings.opacity}
              aria-label="透明度"
              onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            />

            {/* Sound toggle */}
            <label className="bg-option-row">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onChange({ soundEnabled: e.target.checked })}
              />
              <span>点击音效</span>
            </label>
          </div>
        </div>
      )}

      <button
        className={`bg-trigger${open ? ' bg-trigger--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="自定义背景"
      >
        <PaletteIcon />
        <span>自定义背景</span>
        <ChevronIcon className={open ? 'rotated' : ''} />
      </button>
    </div>
  )
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a9 9 0 1 0 0 18 3 3 0 0 0 0-6 3 3 0 0 1 0-6" />
      <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transition: 'transform .2s', transform: className === 'rotated' ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}
