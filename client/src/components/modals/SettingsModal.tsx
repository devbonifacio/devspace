import { useState } from 'react'
import { X, Settings, Bell, Palette, Monitor, Info } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore, type Theme, type FontSize, type UserStatusPref } from '../../store/useSettingsStore'
import { userService } from '../../services/user.service'

type Tab = 'general' | 'appearance' | 'notifications' | 'about'

const ACCENTS = ['#007acc', '#9cdcfe', '#4ec9b0', '#c586c0', '#ce9178', '#dcdcaa']

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAppStore()
  const settings = useSettingsStore()
  const [tab, setTab] = useState<Tab>('general')

  const [theme, setTheme] = useState<Theme>(settings.theme)
  const [accent, setAccent] = useState(settings.accent)
  const [fontSize, setFontSize] = useState<FontSize>(settings.fontSize)
  const [notifSound, setNotifSound] = useState(settings.notifSound)
  const [notifDesktop, setNotifDesktop] = useState(settings.notifDesktop)
  const [notifMentions, setNotifMentions] = useState(settings.notifMentionsOnly)
  const [compactMode, setCompactMode] = useState(settings.compactMode)
  const [statusPref, setStatusPref] = useState<UserStatusPref>(settings.statusPref)

  const save = async () => {
    settings.setAll({
      theme, accent, fontSize, compactMode,
      notifSound, notifDesktop, notifMentionsOnly: notifMentions, statusPref
    })

    if (statusPref !== settings.statusPref) {
      try { await userService.setStatus(statusPref) } catch (err) { console.error(err) }
    }

    if (notifDesktop && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch {}
    }

    onClose()
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'general', label: 'geral', icon: Settings },
    { id: 'appearance', label: 'aparência', icon: Palette },
    { id: 'notifications', label: 'notificações', icon: Bell },
    { id: 'about', label: 'sobre', icon: Info },
  ]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[640px] h-[480px] rounded flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
            configurações
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div
            className="w-44 flex flex-col py-2"
            style={{ background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border)' }}
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-left transition-colors"
                style={{
                  background: tab === id ? 'var(--bg-active)' : 'transparent',
                  color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderLeft: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === 'general' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>usuário</div>
                  <div className="text-sm font-mono" style={{ color: 'var(--blue)' }}>{user?.username}</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{user?.email}</div>
                </div>

                <div>
                  <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>status</label>
                  <div className="flex gap-2">
                    {([
                      { id: 'online' as const, label: 'online', color: 'var(--green)' },
                      { id: 'away' as const, label: 'ausente', color: 'var(--yellow)' },
                      { id: 'offline' as const, label: 'invisível', color: 'var(--text-secondary)' },
                    ]).map(s => (
                      <button
                        key={s.id}
                        onClick={() => setStatusPref(s.id)}
                        className="flex-1 px-3 py-2 text-xs font-mono rounded transition-colors"
                        style={{
                          background: statusPref === s.id ? 'var(--accent-bg)' : 'var(--bg-input)',
                          border: `1px solid ${statusPref === s.id ? 'var(--accent)' : 'var(--border)'}`,
                          color: s.color,
                        }}
                      >
                        ● {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>modo compacto</label>
                  <button
                    onClick={() => setCompactMode(v => !v)}
                    className="w-full px-3 py-2 text-xs font-mono rounded text-left"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {compactMode ? '[x]' : '[ ]'} reduzir espaçamento entre mensagens
                  </button>
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono mb-2 block" style={{ color: 'var(--text-secondary)' }}>tema</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'dark' as const, label: 'dark (vscode)' },
                      { id: 'darker' as const, label: 'darker' },
                    ]).map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className="px-3 py-2 text-xs font-mono rounded"
                        style={{
                          background: theme === t.id ? 'var(--accent-bg)' : 'var(--bg-input)',
                          border: `1px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                          color: theme === t.id ? 'var(--blue)' : 'var(--text-secondary)',
                        }}
                      >
                        {theme === t.id ? '● ' : '○ '}{t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono mb-2 block" style={{ color: 'var(--text-secondary)' }}>cor de destaque</label>
                  <div className="flex gap-2">
                    {ACCENTS.map(c => (
                      <button
                        key={c}
                        onClick={() => setAccent(c)}
                        className="w-8 h-8 rounded transition-transform"
                        style={{
                          background: c,
                          border: accent === c ? '2px solid #fff' : '2px solid transparent',
                          transform: accent === c ? 'scale(1.1)' : 'scale(1)',
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono mb-2 block" style={{ color: 'var(--text-secondary)' }}>tamanho da fonte</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'small' as const, label: 'pequena' },
                      { id: 'medium' as const, label: 'média' },
                      { id: 'large' as const, label: 'grande' },
                    ]).map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFontSize(f.id)}
                        className="px-3 py-2 text-xs font-mono rounded"
                        style={{
                          background: fontSize === f.id ? 'var(--accent-bg)' : 'var(--bg-input)',
                          border: `1px solid ${fontSize === f.id ? 'var(--accent)' : 'var(--border)'}`,
                          color: fontSize === f.id ? 'var(--blue)' : 'var(--text-secondary)',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="space-y-3">
                {[
                  { val: notifDesktop, set: setNotifDesktop, label: 'notificações de desktop' },
                  { val: notifSound, set: setNotifSound, label: 'som ao receber mensagem' },
                  { val: notifMentions, set: setNotifMentions, label: 'notificar apenas @menções' },
                ].map((n, i) => (
                  <button
                    key={i}
                    onClick={() => n.set(!n.val)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded text-left"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{n.label}</span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        background: n.val ? '#1b4721' : '#3a1d1d',
                        color: n.val ? 'var(--green)' : '#f48771',
                        border: `1px solid ${n.val ? 'var(--green)' : '#f48771'}`,
                      }}
                    >{n.val ? 'on' : 'off'}</span>
                  </button>
                ))}
                {notifDesktop && typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                  <p className="text-[11px] font-mono" style={{ color: '#f48771' }}>
                    // permissão negada no navegador — ative em configurações do site
                  </p>
                )}
              </div>
            )}

            {tab === 'about' && (
              <div className="space-y-3 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <Monitor size={32} style={{ color: 'var(--blue)' }} />
                  <div>
                    <div className="text-base" style={{ color: 'var(--text-primary)' }}>DevSpace</div>
                    <div className="text-xs">v1.0.0</div>
                  </div>
                </div>
                <div>// chat para desenvolvedores</div>
                <div>// React + Node + MongoDB + Socket.io</div>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono rounded"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >cancelar</button>
          <button
            onClick={save}
            className="px-3 py-1.5 text-xs font-mono rounded"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >salvar</button>
        </div>
      </div>
    </div>
  )
}
