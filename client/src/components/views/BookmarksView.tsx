import { useEffect, useState } from 'react'
import { Bookmark as BookmarkIcon, Trash2, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { bookmarkService, type Bookmark } from '../../services/bookmark.service'
import Avatar from '../ui/Avatar'

export default function BookmarksView() {
  const { groups, setActiveGroup, setActiveChannel } = useAppStore()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setBookmarks(await bookmarkService.list())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRemove = async (b: Bookmark) => {
    try {
      await bookmarkService.remove(b.message._id)
      setBookmarks(prev => prev.filter(x => x._id !== b._id))
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover')
    }
  }

  const goToMessage = (b: Bookmark) => {
    const channelObj = typeof b.message.channel === 'object' ? b.message.channel : null
    if (!channelObj) return
    const channelId = channelObj._id
    const g = groups.find(grp => grp.channels?.some(c => c._id === channelId))
    const c = g?.channels?.find(c => c._id === channelId)
    if (g) setActiveGroup(g)
    if (c) setTimeout(() => setActiveChannel(c), 0)
  }

  return (
    <div
      className="w-72 flex flex-col flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <BookmarkIcon size={11} /> bookmarks {bookmarks.length > 0 && <span style={{ color: 'var(--accent)' }}>{bookmarks.length}</span>}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={12} className="animate-spin mr-2" /> carregando...
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-10 px-3 font-mono">
            <BookmarkIcon size={28} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>sem bookmarks ainda</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--comment)' }}>
              // hover em uma msg → ícone de marcador
            </p>
          </div>
        ) : (
          bookmarks.map(b => (
            <div
              key={b._id}
              className="group px-3 py-2 transition-colors hover:bg-[var(--bg-tertiary)] cursor-pointer relative"
              style={{ borderBottom: '1px solid var(--border-light)' }}
              onClick={() => goToMessage(b)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Avatar username={b.message.author.username} avatar={b.message.author.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono font-medium truncate" style={{ color: 'var(--blue)' }}>
                      {b.message.author.username}
                    </span>
                    {typeof b.message.channel === 'object' && b.message.channel && (
                      <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                        #{b.message.channel.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--comment)' }}>
                    salvo {formatDistanceToNow(new Date(b.createdAt), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(b) }}
                  title="remover"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-secondary)] hover:text-red-400"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              <p className="text-xs font-mono line-clamp-3 whitespace-pre-wrap break-words ml-8" style={{ color: 'var(--text-primary)' }}>
                {b.message.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
