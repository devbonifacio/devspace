import { Hash, Lock, Plus, ChevronDown, ChevronRight, Settings, Cog } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import Avatar from '../ui/Avatar'
import CreateChannelModal from '../modals/CreateChannelModal'
import UserProfileModal from '../modals/UserProfileModal'
import GroupSettingsModal from '../modals/GroupSettingsModal'
import type { Channel, User } from '../../types'

export default function Sidebar() {
  const { user, activeGroup, activeChannel, activeDmUser, setActiveChannel, setActiveDmUser } = useAppStore()
  const [showChannels, setShowChannels] = useState(true)
  const [showDms, setShowDms] = useState(true)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const onlineUsers = useAppStore(s => s.onlineUsers)

  if (!activeGroup) {
    return (
      <div
        className="w-56 flex items-center justify-center text-[var(--text-secondary)] text-sm font-mono"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      >
        selecione um grupo
      </div>
    )
  }

  const copyCode = () => {
    if (!activeGroup) return
    navigator.clipboard.writeText(activeGroup.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="w-56 flex flex-col flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--text-primary)] font-mono truncate">
            {activeGroup.name}
          </span>
          <button
            onClick={() => setShowGroupSettings(true)}
            title="Configurações do grupo"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          >
            <Cog size={12} />
          </button>
        </div>
        <button
          onClick={copyCode}
          title={copied ? 'copiado!' : 'clique para copiar'}
          className="text-[10px] px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors flex-shrink-0"
          style={{
            background: copied ? '#1b4721' : 'var(--accent-bg)',
            color: copied ? 'var(--green)' : 'var(--blue)',
            border: `1px solid ${copied ? 'var(--green)' : '#9cdcfe33'}`
          }}
        >
          {copied ? '✓' : `#${activeGroup.inviteCode}`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <div className="w-full flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-widest font-mono text-[var(--text-secondary)]">
          <button
            className="flex items-center gap-1 flex-1 text-left hover:text-[var(--text-primary)] transition-colors"
            onClick={() => setShowChannels(v => !v)}
          >
            {showChannels ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Canais
          </button>
          <button
            onClick={() => setShowCreateChannel(true)}
            title="Criar canal"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            <Plus size={11} />
          </button>
        </div>

        {showChannels && activeGroup.channels?.map((ch: Channel) => (
          <button
            key={ch._id}
            onClick={() => setActiveChannel(ch)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm font-mono transition-colors text-left ${
              activeChannel?._id === ch._id
                ? 'text-[var(--text-bright)] bg-[var(--bg-active)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            style={activeChannel?._id === ch._id
              ? { borderLeft: '2px solid var(--accent)' }
              : { borderLeft: '2px solid transparent' }}
          >
            {ch.private ? <Lock size={12} /> : <Hash size={12} className="flex-shrink-0" />}
            <span className="truncate">{ch.name}</span>
          </button>
        ))}

        <button
          className="w-full flex items-center gap-1 px-3 py-1 mt-2 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest font-mono"
          onClick={() => setShowDms(v => !v)}
        >
          {showDms ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          Mensagens diretas
        </button>

        {showDms && activeGroup.members?.map((member: User) => {
          if (member._id === user?._id) return null
          const isOnline = onlineUsers.has(member._id)
          const isActive = activeDmUser?._id === member._id

          return (
            <button
              key={member._id}
              onClick={() => setActiveDmUser(member)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 font-mono transition-colors ${
                isActive
                  ? 'text-[var(--text-bright)] bg-[var(--bg-active)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-[var(--green)]' : 'bg-[var(--text-secondary)]'}`} />
              <span className="text-sm truncate">{member.username}</span>
            </button>
          )
        })}
      </div>

      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <Avatar username={user?.username || ''} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--text-primary)] font-mono truncate">{user?.username}</div>
          <div className="text-[10px] text-[var(--green)] font-mono">● online</div>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          title="Perfil"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Settings size={13} />
        </button>
      </div>

      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} />}
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
      {showGroupSettings && <GroupSettingsModal onClose={() => setShowGroupSettings(false)} />}
    </div>
  )
}
