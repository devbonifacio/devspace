import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import ChatHeader from './ChatHeader'
import TypingIndicator from './TypingIndicator'
import ShareRepoModal from '../modals/ShareRepoModal'
import ThreadPanel from './ThreadPanel'
import { messageService } from '../../services/message.service'
import { uploadService } from '../../services/upload.service'
import { ChevronUp, Loader2, ImagePlus } from 'lucide-react'

export default function ChatArea() {
  const {
    activeChannel, activeDmUser, messages, hasMoreMessages,
    setMessages, prependMessages, socket, socketConnected, user, replyingTo, setReplyingTo,
  } = useAppStore()
  const [showShareRepo, setShowShareRepo] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dropUploading, setDropUploading] = useState(false)

  const sendDroppedImage = async (file: File) => {
    if (!socket || !socketConnected || !user) return
    if (!activeChannel && !activeDmUser) return
    setDropUploading(true)
    try {
      const res = await uploadService.upload(file, 'chat')
      const payload = {
        content: '[image]',
        type: 'image',
        imageData: { url: res.url, width: res.width, height: res.height, bytes: res.bytes },
        replyTo: replyingTo?._id,
      }
      if (activeChannel) {
        socket.emit('send-message', { authorId: user._id, channelId: activeChannel._id, ...payload })
      } else if (activeDmUser) {
        socket.emit('send-dm', { fromId: user._id, toId: activeDmUser._id, ...payload })
      }
      setReplyingTo(null)
    } catch (err: any) {
      alert(err.message || 'Erro no upload')
    } finally {
      setDropUploading(false)
    }
  }
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
    <div className="flex-1 flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
    <div
      className="flex-1 flex flex-col overflow-hidden relative"
      onDragOver={e => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setIsDragging(true)
        }
      }}
      onDragLeave={e => {
        // Só esconde se realmente saiu do container (não em transições entre filhos)
        if (e.currentTarget === e.target) setIsDragging(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setIsDragging(false)
        const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
        if (file) sendDroppedImage(file)
      }}
    >
      {(isDragging || dropUploading) && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0, 122, 204, 0.15)', border: '2px dashed var(--accent)' }}
        >
          <div className="flex flex-col items-center gap-2 font-mono" style={{ color: 'var(--accent)' }}>
            {dropUploading
              ? <Loader2 size={32} className="animate-spin" />
              : <ImagePlus size={32} />}
            <p className="text-sm">
              {dropUploading ? 'enviando imagem...' : 'solte a imagem aqui pra enviar'}
            </p>
          </div>
        </div>
      )}
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
    <ThreadPanel />
    </div>
  )
}
