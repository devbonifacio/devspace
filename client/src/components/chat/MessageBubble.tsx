import { useState, useRef, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Edit2, ExternalLink, GitFork, Star, Trash2, X, Check, Smile,
  Reply, MessageSquare, Pin, PinOff, Bookmark, BookmarkCheck,
} from 'lucide-react'
import { parseMessage } from '../../utils/parseMessage'
import { renderMarkdown, hasMention } from '../../utils/markdown'
import Avatar from '../ui/Avatar'
import { useAppStore } from '../../store/useAppStore'
import { messageService } from '../../services/message.service'
import { bookmarkService } from '../../services/bookmark.service'
import type { Message, Repo } from '../../types'

const EMOJIS = ['🔥', '✅', '👀', '⭐', '💡', '🚀', '❤️', '😂']

interface Props {
  msg: Message
  // Quando renderizado dentro do ThreadPanel, esconde botões de "responder" e "ver thread"
  insideThread?: boolean
}

export default function MessageBubble({ msg, insideThread = false }: Props) {
  const { user, socket, activeChannel, activeGroup, setReplyingTo, openThread, openProfile } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(msg.content)
  const [showAllEmojis, setShowAllEmojis] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // Verifica se essa msg está bookmarkada (lazy: só ao montar)
  useEffect(() => {
    if (msg.type === 'system') return
    bookmarkService.check(msg._id).then(r => setBookmarked(r.bookmarked)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg._id])

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editText.length, editText.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const isMine = user?._id === msg.author._id

  // Moderação: owner global (adm supremo) ou admin/owner do grupo ativo pode apagar
  const groupOwnerId = activeGroup
    ? (typeof activeGroup.owner === 'string' ? activeGroup.owner : (activeGroup.owner as any)?._id)
    : null
  const isGroupMod = !!activeGroup && !!user &&
    (groupOwnerId === user._id || (activeGroup.admins || []).includes(user._id))
  const canModerate = !!user?.isOwner || isGroupMod

  const handleDelete = async () => {
    if (!confirm('Apagar esta mensagem?')) return
    try {
      await messageService.remove(msg._id)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao apagar')
    }
  }

  // System messages — render minimalista; somem sozinhas após 4h
  if (msg.type === 'system') {
    const ageMs = Date.now() - new Date(msg.createdAt).getTime()
    if (ageMs > 4 * 60 * 60 * 1000) return null
    return (
      <div className="group flex items-center justify-center py-1 px-4 select-none">
        <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--comment)' }}>
          <span className="h-px flex-1 min-w-8" style={{ background: 'var(--border)' }} />
          <span>// {msg.content}</span>
          {canModerate && (
            <button
              onClick={handleDelete}
              title="apagar mensagem"
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
            >
              <Trash2 size={10} />
            </button>
          )}
          <span className="h-px flex-1 min-w-8" style={{ background: 'var(--border)' }} />
        </div>
      </div>
    )
  }

  const parsed = parseMessage(msg.content)
  const mentionsMe = user?.username ? hasMention(msg.content, user.username) : false
  const replyParent = typeof msg.replyTo === 'object' && msg.replyTo !== null ? msg.replyTo : null

  const handleReact = (emoji: string) => {
    if (!socket || !user) return
    const channelId = activeChannel?._id || (typeof msg.channel === 'string' ? msg.channel : msg.channel?._id)
    socket.emit('react-message', { messageId: msg._id, channelId, emoji, userId: user._id })
    setShowAllEmojis(false)
  }

  const handleSaveEdit = async () => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === msg.content) {
      setEditing(false)
      return
    }
    try {
      await messageService.edit(msg._id, trimmed)
      setEditing(false)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao editar')
    }
  }

  const handleTogglePin = async () => {
    try {
      await messageService.togglePin(msg._id)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao fixar')
    }
  }

  const handleToggleBookmark = async () => {
    const prev = bookmarked
    setBookmarked(!prev) // otimista
    try {
      const r = await bookmarkService.toggle(msg._id)
      setBookmarked(r.bookmarked)
    } catch (err: any) {
      setBookmarked(prev)
      alert(err.response?.data?.error || 'Erro ao salvar bookmark')
    }
  }

  return (
    <div
      className="msg-bubble flex gap-3 px-4 py-1.5 group hover:bg-[#2a2d2e] transition-colors rounded relative"
      style={mentionsMe ? { borderLeft: '2px solid var(--accent)', background: 'var(--accent-bg)' } : undefined}
    >
      <button
        onClick={() => openProfile(msg.author._id)}
        title={`ver perfil de ${msg.author.username}`}
        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-105"
      >
        <Avatar username={msg.author.username} avatar={msg.author.avatar} size="md" />
      </button>

      <div className="flex-1 min-w-0">
        {/* Preview da mensagem-pai quando essa é uma resposta */}
        {replyParent && (
          <div
            className="flex items-center gap-1.5 mb-1 text-[11px] font-mono cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => !insideThread && openThread(replyParent._id)}
            title={insideThread ? '' : 'ver thread'}
          >
            <Reply size={10} style={{ transform: 'scaleX(-1)' }} />
            <span style={{ color: 'var(--blue)' }}>@{replyParent.author?.username || '...'}</span>
            <span className="truncate max-w-[260px]">{replyParent.content}</span>
          </div>
        )}

        <div className="msg-meta flex items-baseline gap-2 mb-1">
          <button
            onClick={() => openProfile(msg.author._id)}
            className="text-sm font-medium font-mono hover:underline"
            style={{ color: 'var(--blue)' }}
          >
            {msg.author.username}
          </button>
          <span
            className="text-[10px] px-1.5 py-px rounded font-mono"
            style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}
          >
            {msg.author.role}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {formatDistanceToNow(new Date(msg.createdAt), { locale: ptBR, addSuffix: true })}
          </span>
          {msg.edited && (
            <span className="text-[10px] font-mono flex items-center gap-0.5" style={{ color: 'var(--text-secondary)' }}>
              <Edit2 size={9} /> editado
            </span>
          )}
          {msg.pinned && (
            <span className="text-[10px] font-mono flex items-center gap-0.5" style={{ color: 'var(--yellow)' }}>
              <Pin size={9} /> fixado
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-1 space-y-1">
            <textarea
              ref={editRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={Math.min(8, Math.max(2, editText.split('\n').length))}
              className="w-full px-3 py-2 text-sm font-mono rounded outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
            />
            <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 px-2 py-1 rounded"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Check size={11} /> salvar
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(msg.content) }}
                className="flex items-center gap-1 px-2 py-1 rounded"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
              >
                <X size={11} /> cancelar
              </button>
              <span>// Enter salva · Esc cancela</span>
            </div>
          </div>
        ) : msg.type === 'repo' && msg.repoData ? (
          <RepoCard data={msg.repoData} />
        ) : msg.type === 'image' && msg.imageData?.url ? (
          <div className="mt-1">
            <a href={msg.imageData.url} target="_blank" rel="noreferrer">
              <img
                src={msg.imageData.url}
                alt={msg.content || 'imagem'}
                className="rounded max-w-md max-h-80 object-contain"
                style={{ border: '1px solid var(--border)' }}
              />
            </a>
            {msg.content && msg.content !== '[image]' && (
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                {msg.content}
              </p>
            )}
          </div>
        ) : parsed.type === 'code' ? (
          <div className="mt-1 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div
              className="flex items-center justify-between px-3 py-1"
              style={{ background: '#2d2d2d', borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                {parsed.lang}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--comment)' }}>
                {msg.author.username}
              </span>
            </div>
            <SyntaxHighlighter
              language={parsed.lang}
              style={vscDarkPlus}
              customStyle={{ margin: 0, borderRadius: 0, fontSize: 12, background: '#1e1e1e' }}
            >
              {parsed.code || ''}
            </SyntaxHighlighter>
          </div>
        ) : (
          <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap break-words" style={{ color: 'var(--text-code)' }}>
            {renderMarkdown(msg.content, user?.username)}
          </p>
        )}

        {!editing && msg.reactions.filter(r => r.users.length > 0).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {msg.reactions.filter(r => r.users.length > 0).map(r => {
              const reacted = r.users.includes(user?._id || '')
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleReact(r.emoji)}
                  className="text-xs px-2 py-0.5 rounded font-mono transition-colors"
                  style={{
                    background: reacted ? 'var(--accent-bg)' : '#2d2d2d',
                    border: `1px solid ${reacted ? 'var(--accent)' : 'var(--border)'}`,
                    color: reacted ? 'var(--blue)' : 'var(--text-secondary)'
                  }}
                >
                  {r.emoji} {r.users.length}
                </button>
              )
            })}
          </div>
        )}

        {/* Indicador "ver thread" — só em mensagens top-level fora do painel da thread */}
        {!editing && !insideThread && !replyParent && (msg.replyCount ?? 0) > 0 && (
          <button
            onClick={() => openThread(msg._id)}
            className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded transition-colors"
            style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}
          >
            <MessageSquare size={11} />
            {msg.replyCount} {msg.replyCount === 1 ? 'resposta' : 'respostas'} · ver thread
          </button>
        )}
      </div>

      {/* Ações ao hover (canto superior direito) */}
      {!editing && (
        <div
          className="hidden group-hover:flex absolute top-0 right-3 -translate-y-1/2 items-center gap-0.5 rounded px-1 py-0.5"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setShowAllEmojis(v => !v)}
            title="reagir"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Smile size={13} />
          </button>
          {!insideThread && (
            <button
              onClick={() => setReplyingTo(msg)}
              title="responder"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Reply size={13} />
            </button>
          )}
          {activeChannel && (
            <button
              onClick={handleTogglePin}
              title={msg.pinned ? 'desfixar' : 'fixar mensagem'}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
              style={{ color: msg.pinned ? 'var(--yellow)' : 'var(--text-secondary)' }}
            >
              {msg.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
          )}
          <button
            onClick={handleToggleBookmark}
            title={bookmarked ? 'remover bookmark' : 'salvar bookmark'}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ color: bookmarked ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            {bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
          </button>
          {isMine && msg.type !== 'repo' && msg.type !== 'image' && (
            <button
              onClick={() => setEditing(true)}
              title="editar"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Edit2 size={12} />
            </button>
          )}
          {(isMine || canModerate) && (
            <button
              onClick={handleDelete}
              title="apagar"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors hover:text-red-400"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      {showAllEmojis && (
        <div
          className="absolute right-3 top-8 z-10 flex gap-1 p-2 rounded shadow-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-lg w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RepoCard({ data }: { data: Repo }) {
  const langColors: Record<string, string> = {
    TypeScript: '#569cd6', JavaScript: '#dcdcaa', Python: '#4ec994',
    Rust: '#ce9178', Go: '#9cdcfe'
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noreferrer"
      className="flex gap-3 mt-1 p-3 rounded transition-colors"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <GitFork size={18} style={{ color: 'var(--text-secondary)', marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium font-mono" style={{ color: 'var(--blue)' }}>{data.name}</div>
        {data.description && (
          <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>{data.description}</div>
        )}
        <div className="flex gap-4 mt-2 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
          {data.language && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: langColors[data.language] || 'var(--text-secondary)' }} />
              {data.language}
            </span>
          )}
          <span className="flex items-center gap-1"><Star size={10} /> {data.stars}</span>
          <span className="flex items-center gap-1"><GitFork size={10} /> {data.forks}</span>
          <ExternalLink size={10} className="ml-auto" />
        </div>
      </div>
    </a>
  )
}
