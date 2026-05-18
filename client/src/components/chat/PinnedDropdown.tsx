import { useEffect, useState, useRef } from 'react'
import { Pin, X, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { messageService } from '../../services/message.service'
import type { Message } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PinnedDropdown({ open, onClose }: Props) {
  const { activeChannel, messages } = useAppStore()
  const [pinned, setPinned] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !activeChannel) return
    setLoading(true)
    messageService.getPinned(activeChannel._id)
      .then(setPinned)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, activeChannel, messages])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => window.addEventListener('mousedown', handler), 0)
    return () => window.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute right-3 top-12 z-30 w-80 max-h-96 overflow-y-auto rounded shadow-lg"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between sticky top-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <Pin size={11} /> mensagens fixadas
        </span>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
          <X size={12} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 size={12} className="animate-spin mr-2" /> carregando...
        </div>
      ) : pinned.length === 0 ? (
        <div className="text-center py-8 px-3 font-mono">
          <Pin size={24} style={{ color: 'var(--text-secondary)', margin: '0 auto 6px' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>nenhuma mensagem fixada</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--comment)' }}>
            // hover numa msg → ícone de pin
          </p>
        </div>
      ) : (
        pinned.map(p => (
          <div
            key={p._id}
            className="px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--blue)' }}>
                {p.author.username}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                {formatDistanceToNow(new Date(p.createdAt), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
            <p className="text-xs font-mono line-clamp-3 whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
              {p.content}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
