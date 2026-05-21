import { useState } from 'react'
import { MessageCircle, Search, GitBranch, Bell, Bookmark, UserCircle, Settings, LogOut, Shield } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import UserProfileModal from '../modals/UserProfileModal'
import SettingsModal from '../modals/SettingsModal'
import ModerationPanel from '../modals/ModerationPanel'

export type View = 'groups' | 'search' | 'repos' | 'notifications' | 'bookmarks'

interface ActivityBarProps {
  activeView: View
  onViewChange: (view: View) => void
}

const TOP_ITEMS: { id: View; icon: any; label: string }[] = [
  { id: 'groups', icon: MessageCircle, label: 'Grupos e Canais' },
  { id: 'search', icon: Search, label: 'Buscar' },
  { id: 'repos', icon: GitBranch, label: 'Repositórios do Grupo' },
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { id: 'notifications', icon: Bell, label: 'Notificações' },
]

export default function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const { logout, notifications, user } = useAppStore()
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMod, setShowMod] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  return (
    <div
      className="w-12 flex flex-col items-center py-2 gap-1 flex-shrink-0"
      style={{ background: '#333333', borderRight: '1px solid var(--border)' }}
    >
      {TOP_ITEMS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => onViewChange(id)}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative ${
            activeView === id
              ? 'text-[var(--text-primary)] bg-[var(--bg-active)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={activeView === id ? { borderLeft: '2px solid var(--accent)' } : undefined}
        >
          <Icon size={20} />
          {id === 'notifications' && unread > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center font-mono"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      ))}

      <div className="mt-auto flex flex-col gap-1">
        {user?.isOwner && (
          <button
            title="Painel de moderação"
            onClick={() => setShowMod(true)}
            className="w-9 h-9 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            <Shield size={20} />
          </button>
        )}
        <button
          title="Perfil"
          onClick={() => setShowProfile(true)}
          className="w-9 h-9 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <UserCircle size={20} />
        </button>
        <button
          title="Configurações"
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Settings size={20} />
        </button>
        <button
          title="Sair"
          onClick={logout}
          className="w-9 h-9 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showMod && <ModerationPanel onClose={() => setShowMod(false)} />}
    </div>
  )
}
