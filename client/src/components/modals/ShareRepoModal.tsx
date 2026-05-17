import { useState } from 'react'
import { GitBranch, X, Search, ExternalLink, Star, GitFork } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { repoService } from '../../services/repo.service'
import type { Repo } from '../../types'

interface Props {
  onClose: () => void
  mode?: 'share' | 'save' // share = posta no canal; save = adiciona ao grupo
}

export default function ShareRepoModal({ onClose, mode = 'share' }: Props) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { socket, user, activeChannel, activeGroup } = useAppStore()

  const fetchPreview = async () => {
    if (!url.includes('github.com')) {
      setError('URL inválida. Use uma URL do GitHub.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await repoService.preview(url)
      setPreview(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Repositório não encontrado ou privado.')
    } finally { setLoading(false) }
  }

  const handleAction = async () => {
    if (!preview) return

    if (mode === 'share') {
      if (!socket || !user || !activeChannel) return
      socket.emit('send-message', {
        authorId: user._id,
        channelId: activeChannel._id,
        content: `compartilhou um repositório: ${preview.name}`,
        type: 'repo',
        repoData: preview
      })
    } else {
      if (!activeGroup) return
      try {
        await repoService.addToGroup(activeGroup._id, preview)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao adicionar')
        return
      }
    }
    onClose()
  }

  const actionLabel = mode === 'share'
    ? `compartilhar no canal #${activeChannel?.name}`
    : `adicionar ao grupo ${activeGroup?.name}`

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[480px] rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
            <GitBranch size={15} /> {mode === 'share' ? 'compartilhar repositório' : 'adicionar repositório ao grupo'}
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchPreview()}
              placeholder="https://github.com/usuario/repositorio"
              className="flex-1 px-3 py-2 text-sm font-mono rounded outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <button
              onClick={fetchPreview}
              disabled={loading}
              className="px-3 py-2 rounded text-sm font-mono flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <Search size={13} /> {loading ? '...' : 'buscar'}
            </button>
          </div>

          {error && <p className="text-xs font-mono" style={{ color: '#f48771' }}>{error}</p>}

          {preview && (
            <div className="p-3 rounded" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <GitFork size={18} style={{ color: 'var(--text-secondary)', marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono" style={{ color: 'var(--blue)' }}>{preview.name}</span>
                    <ExternalLink size={11} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  {preview.description && (
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>{preview.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {preview.language && <span>● {preview.language}</span>}
                    <span className="flex items-center gap-1"><Star size={10} /> {preview.stars}</span>
                    <span className="flex items-center gap-1"><GitFork size={10} /> {preview.forks}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {preview && (
            <button
              onClick={handleAction}
              className="w-full py-2 text-sm font-mono rounded"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
