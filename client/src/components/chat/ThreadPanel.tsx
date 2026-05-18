import { useEffect, useState, useRef, useCallback } from 'react'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { messageService } from '../../services/message.service'
import MessageBubble from './MessageBubble'
import type { Message } from '../../types'

export default function ThreadPanel() {
  const { threadParentId, openThread, user, socket, socketConnected, activeChannel, activeDmUser } = useAppStore()
  const [parent, setParent] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!threadParentId) return
    setLoading(true)
    try {
      const data = await messageService.getThread(threadParentId)
      setParent(data.parent)
      setReplies(data.replies)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [threadParentId])

  useEffect(() => { load() }, [load])

  // Atualiza replies em tempo real quando chegam new-messages com replyTo igual ao pai
  useEffect(() => {
    if (!socket || !threadParentId) return
    const onNew = (msg: Message) => {
      const r = msg.replyTo
      const rId = typeof r === 'object' && r !== null ? r._id : r
      if (rId === threadParentId) {
        setReplies(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg])
      }
      if (msg._id === threadParentId) setParent(msg)
    }
    const onEdited = (msg: Message) => {
      if (msg._id === threadParentId) setParent(msg)
      setReplies(prev => prev.map(m => m._id === msg._id ? msg : m))
    }
    const onDeleted = (data: { _id: string }) => {
      if (data._id === threadParentId) {
        openThread(null)
        return
      }
      setReplies(prev => prev.filter(m => m._id !== data._id))
    }
    socket.on('new-message', onNew)
    socket.on('new-dm', onNew)
    socket.on('message-edited', onEdited)
    socket.on('message-updated', onEdited)
    socket.on('message-deleted', onDeleted)
    return () => {
      socket.off('new-message', onNew)
      socket.off('new-dm', onNew)
      socket.off('message-edited', onEdited)
      socket.off('message-updated', onEdited)
      socket.off('message-deleted', onDeleted)
    }
  }, [socket, threadParentId, openThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies.length])

  if (!threadParentId) return null

  const handleSend = () => {
    if (!text.trim() || !socket || !socketConnected || !user || !parent) return

    if (activeChannel) {
      socket.emit('send-message', {
        authorId: user._id,
        channelId: activeChannel._id,
        content: text,
        type: 'text',
        replyTo: parent._id,
      })
    } else if (activeDmUser) {
      socket.emit('send-dm', {
        fromId: user._id,
        toId: activeDmUser._id,
        content: text,
        type: 'text',
        replyTo: parent._id,
      })
    }
    setText('')
  }

  return (
    <div
      className="w-96 flex flex-col flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}
    >
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          <MessageSquare size={12} />
          thread
        </div>
        <button
          onClick={() => openThread(null)}
          title="fechar"
          className="text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={14} className="animate-spin mr-2" /> carregando thread...
          </div>
        ) : (
          <>
            {parent && (
              <div className="border-b pb-2 mb-2" style={{ borderColor: 'var(--border)' }}>
                <MessageBubble msg={parent} insideThread />
              </div>
            )}
            {replies.length === 0 ? (
              <div className="text-center py-6 font-mono text-xs" style={{ color: 'var(--comment)' }}>
                // ainda não há respostas — seja o primeiro
              </div>
            ) : (
              replies.map(r => <MessageBubble key={r._id} msg={r} insideThread />)
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex items-end gap-2 px-3 rounded"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="responder na thread..."
            disabled={!socketConnected}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-sm font-mono resize-none py-2.5"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !socketConnected}
            title="enviar (Enter)"
            className="py-2 transition-colors disabled:opacity-30"
            style={{ color: text.trim() ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
