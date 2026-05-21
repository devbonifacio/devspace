import { useEffect, useState } from 'react'
import { Search, MessageCircle, Users } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { messageService } from '../../services/message.service'
import { userService } from '../../services/user.service'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Avatar from '../ui/Avatar'
import type { Message, User } from '../../types'

export default function SearchView() {
  const { activeGroup, setActiveChannel, setActiveDmUser, openProfile } = useAppStore()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'messages' | 'users'>('messages')
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  // "Pessoas que talvez você conheça" — carrega uma vez
  useEffect(() => {
    userService.suggestions().then(setSuggestions).catch(() => {})
  }, [])

  useEffect(() => {
    if (q.trim().length < 2) {
      setMessages([]); setUsers([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        if (tab === 'messages' && activeGroup) {
          setMessages(await messageService.search(activeGroup._id, q))
        } else if (tab === 'users') {
          setUsers(await userService.search(q))
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q, tab, activeGroup])

  const goToMessage = (m: Message) => {
    if (!activeGroup) return
    const channelObj = activeGroup.channels.find(c =>
      c._id === (typeof m.channel === 'string' ? m.channel : m.channel?._id))
    if (channelObj) setActiveChannel(channelObj)
  }

  const showSuggestions = tab === 'users' && q.trim().length < 2

  return (
    <div
      className="w-72 flex flex-col flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          buscar
        </span>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <Search size={13} style={{ color: 'var(--text-secondary)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={tab === 'messages' ? 'buscar mensagens...' : 'buscar usuários...'}
            className="flex-1 bg-transparent outline-none text-sm font-mono"
            style={{ color: 'var(--text-primary)' }}
            autoFocus
          />
        </div>

        <div className="flex gap-1 rounded p-0.5" style={{ background: 'var(--bg-input)' }}>
          {(['messages', 'users'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1 text-xs font-mono rounded transition-colors"
              style={{
                background: tab === t ? 'var(--bg-active)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              {t === 'messages' ? 'mensagens' : 'usuários'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && (
          <div className="text-center py-4 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            buscando...
          </div>
        )}

        {!loading && q.trim().length >= 2 && tab === 'messages' && messages.length === 0 && (
          <div className="text-center py-4 text-xs font-mono" style={{ color: 'var(--comment)' }}>
            // sem resultados em {activeGroup?.name || 'nenhum grupo selecionado'}
          </div>
        )}

        {!loading && tab === 'messages' && messages.map(m => (
          <button
            key={m._id}
            onClick={() => goToMessage(m)}
            className="w-full text-left p-2 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={11} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[11px] font-mono" style={{ color: 'var(--blue)' }}>
                {m.author.username}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                #{typeof m.channel === 'object' ? m.channel?.name : '...'}
              </span>
              <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--text-secondary)' }}>
                {formatDistanceToNow(new Date(m.createdAt), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
            <p className="text-xs font-mono line-clamp-2" style={{ color: 'var(--text-primary)' }}>
              {m.content}
            </p>
          </button>
        ))}

        {/* Pessoas que talvez você conheça — quando não há busca ativa */}
        {!loading && showSuggestions && (
          <>
            <div className="flex items-center gap-1.5 px-2 py-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              <Users size={11} /> pessoas que talvez você conheça
            </div>
            {suggestions.length === 0 && (
              <div className="text-center py-4 text-xs font-mono" style={{ color: 'var(--comment)' }}>
                // ninguém por aqui ainda
              </div>
            )}
            {suggestions.map(u => (
              <UserRow key={u._id} u={u} onDm={() => setActiveDmUser(u)} onProfile={() => openProfile(u._id)} />
            ))}
          </>
        )}

        {!loading && tab === 'users' && q.trim().length >= 2 && (
          users.length === 0 ? (
            <div className="text-center py-4 text-xs font-mono" style={{ color: 'var(--comment)' }}>
              // nenhum usuário encontrado
            </div>
          ) : users.map(u => (
            <UserRow key={u._id} u={u} onDm={() => setActiveDmUser(u)} onProfile={() => openProfile(u._id)} />
          ))
        )}
      </div>
    </div>
  )
}

function UserRow({ u, onDm, onProfile }: { u: User; onDm: () => void; onProfile: () => void }) {
  return (
    <div className="w-full flex items-center gap-3 p-2 rounded transition-colors hover:bg-[var(--bg-tertiary)]">
      <button onClick={onProfile} title="ver perfil" className="flex-shrink-0">
        <Avatar username={u.username} avatar={u.avatar} size="sm" />
      </button>
      <button onClick={onProfile} className="flex-1 min-w-0 text-left">
        <div className="text-sm font-mono truncate" style={{ color: 'var(--blue)' }}>{u.username}</div>
        <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{u.role}</div>
      </button>
      <button
        onClick={onDm}
        title="enviar mensagem"
        className="flex-shrink-0 transition-colors text-[var(--text-secondary)] hover:text-[var(--blue)]"
      >
        <MessageCircle size={14} />
      </button>
    </div>
  )
}
