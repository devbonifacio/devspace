import { useEffect, useState, useRef, useMemo } from 'react'
import { Search, Hash, MessageCircle, Users, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { messageService } from '../../services/message.service'
import { userService } from '../../services/user.service'
import type { Message, User, Group, Channel } from '../../types'

type ResultItem =
  | { kind: 'group'; group: Group }
  | { kind: 'channel'; group: Group; channel: Channel }
  | { kind: 'user'; user: User }
  | { kind: 'message'; msg: Message }

interface Props {
  onClose: () => void
}

export default function CommandPalette({ onClose }: Props) {
  const { groups, activeGroup, setActiveGroup, setActiveChannel, setActiveDmUser } = useAppStore()
  const [q, setQ] = useState('')
  const [serverResults, setServerResults] = useState<{ messages: Message[]; users: User[] }>({ messages: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Busca local (grupos + canais) — instantânea
  const local = useMemo(() => {
    if (q.length < 1) return [] as ResultItem[]
    const needle = q.toLowerCase()
    const results: ResultItem[] = []

    for (const g of groups) {
      if (g.name.toLowerCase().includes(needle)) results.push({ kind: 'group', group: g })
      for (const c of (g.channels || [])) {
        if (c.name.toLowerCase().includes(needle)) results.push({ kind: 'channel', group: g, channel: c })
      }
    }
    return results.slice(0, 10)
  }, [q, groups])

  // Busca server (msgs + users) — debounced
  useEffect(() => {
    if (q.trim().length < 2) {
      setServerResults({ messages: [], users: [] })
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const [users, messages] = await Promise.all([
          userService.search(q),
          activeGroup ? messageService.search(activeGroup._id, q) : Promise.resolve([]),
        ])
        setServerResults({ users: users.slice(0, 6), messages: messages.slice(0, 6) })
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q, activeGroup])

  const items: ResultItem[] = [
    ...local,
    ...serverResults.users.map<ResultItem>(u => ({ kind: 'user', user: u })),
    ...serverResults.messages.map<ResultItem>(m => ({ kind: 'message', msg: m })),
  ]

  useEffect(() => {
    if (activeIdx >= items.length) setActiveIdx(0)
  }, [items.length, activeIdx])

  const choose = (item: ResultItem) => {
    if (item.kind === 'group') {
      setActiveGroup(item.group)
    } else if (item.kind === 'channel') {
      setActiveGroup(item.group)
      setTimeout(() => setActiveChannel(item.channel), 0)
    } else if (item.kind === 'user') {
      setActiveDmUser(item.user)
    } else if (item.kind === 'message') {
      // Vai pro canal da mensagem (não navega pro msg específico — feature futura)
      const channelId = typeof item.msg.channel === 'object' ? item.msg.channel?._id : item.msg.channel
      const g = groups.find(grp => grp.channels?.some(c => c._id === channelId))
      const c = g?.channels?.find(c => c._id === channelId)
      if (g) setActiveGroup(g)
      if (c) setTimeout(() => setActiveChannel(c), 0)
    }
    onClose()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && items[activeIdx]) {
      e.preventDefault()
      choose(items[activeIdx])
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-[60] pt-24"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[560px] max-h-[60vh] flex flex-col rounded overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={15} style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKey}
            placeholder="buscar grupos, canais, usuários, mensagens..."
            className="flex-1 bg-transparent outline-none text-sm font-mono"
            style={{ color: 'var(--text-primary)' }}
          />
          {loading && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />}
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            esc
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {q.length < 1 && (
            <div className="px-4 py-6 text-center font-mono text-xs" style={{ color: 'var(--comment)' }}>
              // digita algo pra buscar
              <div className="mt-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--blue)' }}>↑↓</span> navegar · <span style={{ color: 'var(--blue)' }}>↵</span> abrir · <span style={{ color: 'var(--blue)' }}>esc</span> fechar
              </div>
            </div>
          )}

          {q.length >= 1 && items.length === 0 && !loading && (
            <div className="px-4 py-6 text-center font-mono text-xs" style={{ color: 'var(--comment)' }}>
              // sem resultados pra "{q}"
            </div>
          )}

          {items.map((item, i) => {
            const isActive = i === activeIdx
            const baseStyle = isActive
              ? { background: 'var(--bg-active)', borderLeft: '2px solid var(--accent)' }
              : { borderLeft: '2px solid transparent' }

            if (item.kind === 'group') {
              return (
                <button
                  key={`g-${item.group._id}`}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={baseStyle}
                >
                  <Hash size={13} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{item.group.name}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>grupo</span>
                </button>
              )
            }
            if (item.kind === 'channel') {
              return (
                <button
                  key={`c-${item.channel._id}`}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={baseStyle}
                >
                  <Hash size={13} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{item.channel.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>em {item.group.name}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>canal</span>
                </button>
              )
            }
            if (item.kind === 'user') {
              return (
                <button
                  key={`u-${item.user._id}`}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={baseStyle}
                >
                  <Users size={13} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm font-mono" style={{ color: 'var(--blue)' }}>{item.user.username}</span>
                  <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{item.user.email}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>DM</span>
                </button>
              )
            }
            // message
            return (
              <button
                key={`m-${item.msg._id}`}
                onClick={() => choose(item)}
                onMouseEnter={() => setActiveIdx(i)}
                className="w-full flex items-start gap-3 px-4 py-2 text-left transition-colors"
                style={baseStyle}
              >
                <MessageCircle size={13} style={{ color: 'var(--text-secondary)', marginTop: 3 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--blue)' }}>{item.msg.author.username}</span>
                    {typeof item.msg.channel === 'object' && item.msg.channel && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                        #{item.msg.channel.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono line-clamp-1" style={{ color: 'var(--text-primary)' }}>{item.msg.content}</p>
                </div>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>msg</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
