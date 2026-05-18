import { useState } from 'react'
import { Hash, Lock, Users, Plus, Pin } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import PinnedDropdown from './PinnedDropdown'

interface ChatHeaderProps {
  onShareRepo: () => void
}

export default function ChatHeader({ onShareRepo }: ChatHeaderProps) {
  const { activeChannel, activeDmUser, onlineUsers } = useAppStore()
  const [showPinned, setShowPinned] = useState(false)

  const name = activeChannel ? activeChannel.name : activeDmUser?.username || ''
  const isPrivate = activeChannel?.private
  const isDm = !!activeDmUser
  const memberCount = useAppStore(s => s.activeGroup?.members?.length || 0)

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 relative"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}
    >
      <div className="flex items-center gap-2">
        {isDm ? (
          <div className="w-2 h-2 rounded-full" style={{ background: onlineUsers.has(activeDmUser!._id) ? 'var(--green)' : 'var(--text-secondary)' }} />
        ) : isPrivate ? (
          <Lock size={15} style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <Hash size={15} style={{ color: 'var(--text-secondary)' }} />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>
              {name}
            </span>
            {!isDm && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--green)' }}>
                ● {onlineUsers.size} online
              </span>
            )}
          </div>
          {activeChannel?.topic && (
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
              {activeChannel.topic}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeChannel && (
          <button
            onClick={() => setShowPinned(v => !v)}
            title="mensagens fixadas"
            className="flex items-center justify-center w-7 h-7 rounded transition-colors"
            style={{
              color: showPinned ? 'var(--blue)' : 'var(--text-secondary)',
              background: showPinned ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${showPinned ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            <Pin size={12} />
          </button>
        )}
        {!isDm && (
          <>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Users size={12} /> {memberCount}
            </button>
            <button
              onClick={onShareRepo}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors"
              style={{ background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}
            >
              <Plus size={12} /> compartilhar repo
            </button>
          </>
        )}
      </div>

      <PinnedDropdown open={showPinned} onClose={() => setShowPinned(false)} />
    </div>
  )
}
