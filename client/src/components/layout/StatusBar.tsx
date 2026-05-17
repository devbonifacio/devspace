import { useAppStore } from '../../store/useAppStore'
import { GitBranch, Wifi, Users, Check } from 'lucide-react'

export default function StatusBar() {
  const { activeGroup, onlineUsers, socket } = useAppStore()
  const connected = !!socket?.connected

  return (
    <div
      className="h-[22px] flex items-center px-3 gap-4 flex-shrink-0 text-white/80 text-[11px] font-mono"
      style={{ background: 'var(--statusbar)' }}
    >
      <span className="flex items-center gap-1">
        <GitBranch size={12} /> main
      </span>
      <span className="flex items-center gap-1">
        <Check size={12} /> 0 erros
      </span>
      {activeGroup && (
        <span className="flex items-center gap-1">
          <Users size={12} /> {activeGroup.name}
        </span>
      )}
      <span
        className="ml-auto flex items-center gap-1"
        style={{ color: connected ? '#fff' : '#f48771' }}
      >
        <Wifi size={12} />
        {connected ? 'conectado' : 'reconectando...'}
      </span>
      <span>{onlineUsers.size} online</span>
    </div>
  )
}
