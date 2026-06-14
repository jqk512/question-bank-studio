export interface BackgroundSettings {
  enabled: boolean
  presetId: string
  speed: number
  opacity: number
  soundEnabled: boolean
}

export const DEFAULT_SETTINGS: BackgroundSettings = {
  enabled: true,
  presetId: 'neon',
  speed: 1,
  opacity: 1,
  soundEnabled: true,
}

const STORAGE_KEY = 'bg-settings-v1'

export function loadSettings(): BackgroundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(s: BackgroundSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export interface ColorPreset {
  id: string
  name: string
  colors: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]]
  base: [number, number, number]
  swatch: [string, string]
}

export const PRESETS: ColorPreset[] = [
  {
    id: 'neon',
    name: '霓虹极光',
    colors: [
      [0.13, 0.90, 1.00],
      [0.08, 0.18, 1.00],
      [1.00, 0.34, 0.08],
      [1.00, 0.96, 0.18],
    ],
    base: [0.018, 0.028, 0.16],
    swatch: ['#21e6ff', '#ff5714'],
  },
  {
    id: 'deep-sea',
    name: '深海幽灵',
    colors: [
      [0.02, 0.85, 0.82],
      [0.12, 0.08, 0.72],
      [0.55, 0.10, 0.90],
      [0.90, 0.50, 1.00],
    ],
    base: [0.008, 0.02, 0.12],
    swatch: ['#05d9d1', '#8c1ae6'],
  },
  {
    id: 'lava',
    name: '熔岩暮光',
    colors: [
      [1.00, 0.15, 0.10],
      [1.00, 0.45, 0.00],
      [0.65, 0.08, 0.50],
      [1.00, 0.85, 0.20],
    ],
    base: [0.12, 0.02, 0.02],
    swatch: ['#ff2619', '#ffd933'],
  },
  {
    id: 'jade',
    name: '翡翠碧波',
    colors: [
      [0.20, 1.00, 0.60],
      [0.08, 0.65, 0.45],
      [0.10, 0.90, 1.00],
      [0.85, 1.00, 0.20],
    ],
    base: [0.02, 0.10, 0.06],
    swatch: ['#33ff99', '#d9ff33'],
  },
  {
    id: 'rose',
    name: '玫瑰晨曦',
    colors: [
      [1.00, 0.35, 0.65],
      [0.70, 0.15, 0.80],
      [1.00, 0.55, 0.30],
      [1.00, 0.90, 0.50],
    ],
    base: [0.12, 0.04, 0.10],
    swatch: ['#ff5aa6', '#ff8c4d'],
  },
  {
    id: 'night',
    name: '极夜静谧',
    colors: [
      [0.40, 0.50, 0.80],
      [0.25, 0.30, 0.60],
      [0.50, 0.45, 0.70],
      [0.60, 0.65, 0.85],
    ],
    base: [0.04, 0.04, 0.10],
    swatch: ['#6680cc', '#99a6d9'],
  },
]

export const SPEED_STEPS = [
  { value: 0.25, label: '缓' },
  { value: 1,    label: '中' },
  { value: 2.5,  label: '快' },
  { value: 6,    label: '疾' },
]
