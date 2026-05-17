import { useState, useRef, useCallback, useEffect } from 'react'
import { GitBranch, Code, Smile, Send, AtSign } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface MessageInputProps {
  onShareRepo: () => void
}

const EMOJI_GROUPS: Record<string, string[]> = {
  rosto: ['😀', '😂', '😎', '🥹', '😴', '🤔', '😅', '😭', '🤯', '😤', '🤩', '😇'],
  gestos: ['👍', '👎', '👏', '🙌', '🙏', '💪', '🫡', '🤝', '🤘', '🫶', '👀', '👋'],
  dev: ['🔥', '✅', '❌', '⚡', '🚀', '💡', '⭐', '🐛', '🛠️', '🧠', '📦', '🧪'],
  coração: ['❤️', '🩵', '💚', '💛', '🧡', '💜', '🤍', '🖤', '💔', '✨', '🎉', '🎊'],
}

export default function MessageInput({ onShareRepo }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isCode, setIsCode] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const { socket, socketConnected, user, activeChannel, activeDmUser, activeGroup } = useAppStore()
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTyping = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)

  // Auto-resize do textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(180, ta.scrollHeight) + 'px'
  }, [content])

  // Atalho Ctrl+Shift+C global pra alternar modo código
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setIsCode(v => !v)
        textareaRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fecha emojis ao clicar fora
  useEffect(() => {
    if (!showEmojis) return
    const handler = (e: MouseEvent) => {
      if (!emojiBtnRef.current?.contains(e.target as Node)) {
        const picker = document.getElementById('emoji-picker')
        if (!picker?.contains(e.target as Node)) setShowEmojis(false)
      }
    }
    setTimeout(() => window.addEventListener('click', handler), 0)
    return () => window.removeEventListener('click', handler)
  }, [showEmojis])

  const emitStopTyping = useCallback(() => {
    if (!socket || !activeChannel || !user) return
    if (!isTyping.current) return
    isTyping.current = false
    socket.emit('stop-typing', { channelId: activeChannel._id, username: user.username })
  }, [socket, activeChannel, user])

  const handleTyping = useCallback(() => {
    if (!socket || !activeChannel || !user) return
    if (!isTyping.current) {
      isTyping.current = true
      socket.emit('typing', { channelId: activeChannel._id, username: user.username })
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(emitStopTyping, 2500)
  }, [socket, activeChannel, user, emitStopTyping])

  const handleSend = () => {
    if (!content.trim() || !user) return
    if (!socket || !socketConnected) {
      console.warn('[devspace] socket não conectado, mensagem não enviada')
      return
    }

    const finalContent = isCode ? `\`\`\`javascript\n${content}\n\`\`\`` : content

    if (activeChannel) {
      socket.emit('send-message', {
        authorId: user._id,
        channelId: activeChannel._id,
        content: finalContent,
        type: isCode ? 'code' : 'text'
      })
      emitStopTyping()
    } else if (activeDmUser) {
      socket.emit('send-dm', {
        fromId: user._id,
        toId: activeDmUser._id,
        content: finalContent,
        type: isCode ? 'code' : 'text'
      })
    } else {
      return
    }

    setContent('')
    setIsCode(false)
    setShowEmojis(false)
    setShowMentions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current
    if (!ta) { setContent(c => c + text); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const mentionableMembers = activeGroup?.members?.filter(m => m._id !== user?._id) || []

  const placeholder = activeChannel
    ? `Mensagem em #${activeChannel.name}  ·  **bold** *italic* \`code\` @user`
    : activeDmUser
    ? `DM para ${activeDmUser.username}`
    : 'Selecione um canal'

  const disconnected = !socket || !socketConnected

  return (
    <div className="px-4 py-3 flex-shrink-0 relative" style={{ borderTop: '1px solid var(--border)' }}>
      {disconnected && (
        <div
          className="mb-2 flex items-center gap-2 text-[11px] font-mono px-2 py-1 rounded"
          style={{ background: '#5c1b1b33', color: '#f48771', border: '1px solid #f4877144' }}
        >
          ● sem conexão com o servidor — tentando reconectar...
        </div>
      )}
      {isCode && (
        <div
          className="mb-2 flex items-center gap-2 text-[11px] font-mono px-2 py-1 rounded"
          style={{ background: '#1b3a5c', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}
        >
          <Code size={12} /> Modo código ativo — Enter envia
          <button onClick={() => setIsCode(false)} className="ml-auto hover:text-white">✕</button>
        </div>
      )}

      <div
        className="flex items-end gap-2 px-3 rounded"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => {
            const val = e.target.value
            setContent(val)
            handleTyping()
            if (val.startsWith('```') && !isCode) setIsCode(true)
          }}
          onBlur={emitStopTyping}
          onKeyDown={handleKeyDown}
          placeholder={disconnected ? 'reconectando...' : placeholder}
          disabled={(!activeChannel && !activeDmUser) || disconnected}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none text-sm font-mono resize-none py-2.5"
          style={{ color: 'var(--text-primary)' }}
        />

        <div className="flex items-center gap-1.5 py-2">
          {activeChannel && mentionableMembers.length > 0 && (
            <button
              onClick={() => setShowMentions(v => !v)}
              title="Mencionar membro"
              className="text-[var(--text-secondary)] hover:text-[var(--blue)] transition-colors"
            >
              <AtSign size={15} />
            </button>
          )}
          <button
            ref={emojiBtnRef}
            onClick={() => setShowEmojis(v => !v)}
            title="Emoji"
            className={`transition-colors ${showEmojis ? 'text-[var(--blue)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Smile size={15} />
          </button>
          {activeChannel && (
            <button
              title="Compartilhar repositório"
              onClick={onShareRepo}
              className="text-[var(--text-secondary)] hover:text-[var(--blue)] transition-colors"
            >
              <GitBranch size={15} />
            </button>
          )}
          <button
            title="Modo código (Ctrl+Shift+C)"
            onClick={() => setIsCode(v => !v)}
            className={`transition-colors ${isCode ? 'text-[var(--blue)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Code size={15} />
          </button>
          <button
            onClick={handleSend}
            disabled={!content.trim() || disconnected}
            title={disconnected ? 'sem conexão' : 'enviar (Enter)'}
            className="transition-colors disabled:opacity-30"
            style={{ color: content.trim() && !disconnected ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <div className="mt-1 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
        Enter envia · Shift+Enter nova linha · Ctrl+Shift+C modo código
      </div>

      {showEmojis && (
        <div
          id="emoji-picker"
          className="absolute bottom-full right-4 mb-2 z-20 w-72 max-h-72 overflow-y-auto rounded p-2"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          {Object.entries(EMOJI_GROUPS).map(([group, emojis]) => (
            <div key={group} className="mb-2">
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1 px-1" style={{ color: 'var(--text-secondary)' }}>
                {group}
              </div>
              <div className="grid grid-cols-8 gap-0.5">
                {emojis.map(e => (
                  <button
                    key={e}
                    onClick={() => insertAtCursor(e)}
                    className="text-lg w-8 h-8 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showMentions && activeChannel && (
        <div
          className="absolute bottom-full right-4 mb-2 z-20 w-56 max-h-64 overflow-y-auto rounded p-1"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          {mentionableMembers.map(m => (
            <button
              key={m._id}
              onClick={() => { insertAtCursor(`@${m.username} `); setShowMentions(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <AtSign size={11} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-mono" style={{ color: 'var(--blue)' }}>{m.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
