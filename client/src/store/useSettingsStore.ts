import { create } from 'zustand'

export type Theme = 'dark' | 'darker'
export type FontSize = 'small' | 'medium' | 'large'
export type UserStatusPref = 'online' | 'away' | 'offline'

interface SettingsStore {
  theme: Theme
  accent: string
  fontSize: FontSize
  compactMode: boolean
  notifSound: boolean
  notifDesktop: boolean
  notifMentionsOnly: boolean
  statusPref: UserStatusPref

  setAll: (s: Partial<SettingsStore>) => void
  apply: () => void
}

const read = <T,>(key: string, fallback: T, coerce?: (raw: string) => T): T => {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  if (!coerce) return raw as unknown as T
  try { return coerce(raw) } catch { return fallback }
}

const THEMES: Record<Theme, Record<string, string>> = {
  dark: {
    '--bg-primary': '#1e1e1e',
    '--bg-secondary': '#252526',
    '--bg-tertiary': '#2d2d2d',
    '--bg-active': '#37373d',
    '--bg-input': '#3c3c3c',
    '--border': '#3c3c3c',
  },
  darker: {
    '--bg-primary': '#0e0e10',
    '--bg-secondary': '#161618',
    '--bg-tertiary': '#1c1c1f',
    '--bg-active': '#26262a',
    '--bg-input': '#222226',
    '--border': '#2a2a2e',
  },
}

const FONT_PX: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '15px',
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  theme: read('ds_theme', 'dark', v => (v === 'darker' ? 'darker' : 'dark')),
  accent: read('ds_accent', '#007acc'),
  fontSize: read('ds_fontsize', 'medium', v =>
    v === 'small' || v === 'large' ? v : 'medium'),
  compactMode: read('ds_compact', false, v => v === 'true'),
  notifSound: read('ds_notif_sound', true, v => v !== 'false'),
  notifDesktop: read('ds_notif_desktop', true, v => v !== 'false'),
  notifMentionsOnly: read('ds_notif_mentions', false, v => v === 'true'),
  statusPref: read('ds_status', 'online', v =>
    v === 'away' || v === 'offline' ? v : 'online'),

  setAll: (partial) => {
    const next = { ...get(), ...partial }
    set(partial)
    localStorage.setItem('ds_theme', next.theme)
    localStorage.setItem('ds_accent', next.accent)
    localStorage.setItem('ds_fontsize', next.fontSize)
    localStorage.setItem('ds_compact', String(next.compactMode))
    localStorage.setItem('ds_notif_sound', String(next.notifSound))
    localStorage.setItem('ds_notif_desktop', String(next.notifDesktop))
    localStorage.setItem('ds_notif_mentions', String(next.notifMentionsOnly))
    localStorage.setItem('ds_status', next.statusPref)
    get().apply()
  },

  apply: () => {
    const { theme, accent, fontSize, compactMode } = get()
    const root = document.documentElement
    const palette = THEMES[theme]
    Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v))
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-hover', accent)
    root.style.setProperty('--accent-bg', `${accent}22`)
    root.style.fontSize = FONT_PX[fontSize]
    root.dataset.compact = compactMode ? 'true' : 'false'
  },
}))

// Som curto sintetizado (sem precisar de arquivo)
let audioCtx: AudioContext | null = null
export function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
    o.start()
    o.stop(ctx.currentTime + 0.25)
  } catch {}
}
