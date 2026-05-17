import { Bell, MessageCircle, Mail, Trash2, CheckCheck } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ICONS = {
  message: MessageCircle,
  dm: Mail,
  mention: Bell,
  system: Bell,
}

export default function NotificationsView() {
  const { notifications, markAllNotificationsRead, clearNotifications } = useAppStore()
  const unread = notifications.filter(n => !n.read).length

  return (
    <div
      className="w-72 flex flex-col flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          notificações {unread > 0 && (
            <span className="ml-1 px-1.5 py-px rounded text-[10px]" style={{ background: 'var(--accent)', color: '#fff' }}>{unread}</span>
          )}
        </span>
        <div className="flex gap-1">
          <button
            onClick={markAllNotificationsRead}
            disabled={unread === 0}
            title="marcar todas como lidas"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
          >
            <CheckCheck size={13} />
          </button>
          <button
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            title="limpar todas"
            className="text-[var(--text-secondary)] hover:text-red-400 transition-colors disabled:opacity-30"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-10 px-3 font-mono">
            <Bell size={28} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>sem notificações</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--comment)' }}>// fica em silêncio até algo acontecer</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = ICONS[n.type] || Bell
            return (
              <div
                key={n.id}
                className="px-3 py-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                <div className="flex items-start gap-2">
                  <Icon size={12} style={{ color: n.read ? 'var(--text-secondary)' : 'var(--accent)', marginTop: 3 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono font-medium truncate" style={{ color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                    </div>
                    <p className="text-[11px] font-mono mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {n.body}
                    </p>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--comment)' }}>
                      {formatDistanceToNow(new Date(n.createdAt), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
