import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import ChatHeader from './ChatHeader'
import TypingIndicator from './TypingIndicator'
import ShareRepoModal from '../modals/ShareRepoModal'
import { messageService } from '../../services/message.service'
import { ChevronUp, Loader2 } from 'lucide-react'

export default function ChatArea() {
  const {
    activeChannel, activeDmUser, messages, hasMoreMessages,
    setMessages, prependMessages
  } = useAppStore()
  const [showShareRepo, setShowShareRepo] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const scrollContainer = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMsgCount = useRef(0)
  const lastConversationKey = useRef<string | null>(null)
  const lastUserScrollUp = useRef(false)

  const conversationKey = activeChannel?._id || activeDmUser?._id || null

  useEffect(() => {
    if (!conversationKey) return
    lastConversationKey.current = conversationKey
    setInitialLoading(true)

    const load = async () => {
      try {
        const res = activeChannel
          ? await messageService.getByChannel(activeChannel._id)
          : await messageService.getDms(activeDmUser!._id)
        setMessages(res.messages, res.hasMore)
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    load()
  }, [conversationKey, activeChannel, activeDmUser, setMessages])

  // Auto-scroll: pula pro final quando troca de conversa OU quando chega msg nova
  // e o user já estava perto do fim. Se ele rolou pra ler histórico, não pula.
  useEffect(() => {
    const container = scrollContainer.current
    if (!container) return

    const switched = lastConversationKey.current !== conversationKey ||
                     lastMsgCount.current === 0
    const grew = messages.length > lastMsgCount.current
    lastMsgCount.current = messages.length

    if (switched) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
      lastUserScrollUp.current = false
      return
    }

    if (grew && !lastUserScrollUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, conversationKey])

  const handleScroll = () => {
    const el = scrollContainer.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    lastUserScrollUp.current = distanceFromBottom > 100
  }

  const loadMore = async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return
    setLoadingMore(true)
    const oldest = messages[0]
    const container = scrollContainer.current
    const previousHeight = container?.scrollHeight || 0

    try {
      const res = activeChannel
        ? await messageService.getByChannel(activeChannel._id, oldest._id)
        : await messageService.getDms(activeDmUser!._id, oldest._id)
      prependMessages(res.messages, res.hasMore)

      // Preserva posição do scroll após prepend
      requestAnimationFrame(() => {
        if (container) {
          const diff = container.scrollHeight - previousHeight
          container.scrollTop = diff + 10
        }
      })
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  if (!activeChannel && !activeDmUser) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center font-mono"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
      >
        <div className="text-4xl mb-4">{'>'}_</div>
        <p className="text-sm">selecione um canal ou conversa</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          use a sidebar para navegar
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <ChatHeader onShareRepo={() => setShowShareRepo(true)} />

      <div
        ref={scrollContainer}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-0.5"
      >
        {hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center mb-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono rounded transition-colors disabled:opacity-50"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {loadingMore
                ? <><Loader2 size={11} className="animate-spin" /> carregando...</>
                : <><ChevronUp size={11} /> carregar mensagens anteriores</>}
            </button>
          </div>
        )}

        {initialLoading ? (
          <div className="flex justify-center items-center h-32 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={14} className="animate-spin mr-2" /> carregando...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 font-mono select-none">
            <div className="text-3xl" style={{ color: 'var(--accent)' }}>#</div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              #{activeChannel?.name || `dm/${activeDmUser?.username}`}
            </p>
            <p className="text-xs" style={{ color: 'var(--comment)' }}>
              {'// início do canal — seja o primeiro a postar'}
            </p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg._id} msg={msg} />)
        )}
        <TypingIndicator />
        <div ref={bottomRef} />
      </div>

      <MessageInput onShareRepo={() => setShowShareRepo(true)} />

      {showShareRepo && <ShareRepoModal onClose={() => setShowShareRepo(false)} />}
    </div>
  )
}
