import { useEffect, useState } from 'react'
import { GitBranch, X, Search, ExternalLink, Star, GitFork, Github, Loader2, Lock } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { repoService } from '../../services/repo.service'
import { githubService, type MyRepo } from '../../services/github.service'
import type { Repo } from '../../types'

interface Props {
  onClose: () => void
  mode?: 'share' | 'save' // share = posta no canal; save = adiciona ao grupo
}

type Tab = 'mine' | 'url'

export default function ShareRepoModal({ onClose, mode = 'share' }: Props) {
  const { socket, user, activeChannel, activeGroup } = useAppStore()
  const connected = !!user?.github?.connected

  const [tab, setTab] = useState<Tab>(connected ? 'mine' : 'url')
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // "Meus repos"
  const [myRepos, setMyRepos] = useState<MyRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (tab !== 'mine' || !connected) return
    setReposLoading(true)
    setError('')
    githubService.myRepos()
      .then(setMyRepos)
      .catch(err => setError(err.response?.data?.error || 'Erro ao buscar repositórios'))
      .finally(() => setReposLoading(false))
  }, [tab, connected])

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
      setError(err.response?.data?.error || 'Repositório não encontrado ou sem permissão.')
    } finally { setLoading(false) }
  }

  const pickMyRepo = (r: MyRepo) => {
    setPreview({
      name: r.name,
      url: r.url,
      description: r.description,
      language: r.language,
      stars: r.stars,
      forks: r.forks,
    })
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
        repoData: preview,
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

  const filteredMyRepos = q.trim()
    ? myRepos.filter(r =>
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description.toLowerCase().includes(q.toLowerCase()))
    : myRepos

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[520px] max-w-[94vw] rounded max-h-[88vh] flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
            <GitBranch size={15} /> {mode === 'share' ? 'compartilhar repositório' : 'adicionar repositório ao grupo'}
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-1 flex-shrink-0">
          {([
            { id: 'mine' as Tab, label: 'meus repos', icon: Github, disabled: !connected },
            { id: 'url' as Tab, label: 'por URL', icon: Search, disabled: false },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => !t.disabled && (setTab(t.id), setPreview(null), setError(''))}
              disabled={t.disabled}
              title={t.disabled ? 'conecte o GitHub no seu perfil pra ver seus repos' : ''}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-t transition-colors disabled:opacity-40"
              style={{
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: tab === t.id ? 'var(--bg-input)' : 'transparent',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {tab === 'url' && (
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
          )}

          {tab === 'mine' && (
            <>
              {!connected ? (
                <p className="text-xs font-mono" style={{ color: 'var(--comment)' }}>
                  // conecte sua conta do GitHub no perfil pra ver seus repos
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <Search size={13} style={{ color: 'var(--text-secondary)' }} />
                    <input
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      placeholder="filtrar..."
                      className="flex-1 bg-transparent outline-none text-sm font-mono"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                  {reposLoading ? (
                    <div className="flex items-center justify-center py-6 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <Loader2 size={13} className="animate-spin mr-2" /> carregando repositórios...
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {filteredMyRepos.length === 0 && (
                        <p className="text-xs font-mono text-center py-4" style={{ color: 'var(--comment)' }}>
                          // nenhum repo encontrado
                        </p>
                      )}
                      {filteredMyRepos.map(r => {
                        const selected = preview?.url === r.url
                        return (
                          <button
                            key={r.url}
                            onClick={() => pickMyRepo(r)}
                            className="w-full text-left px-3 py-2 rounded transition-colors"
                            style={{
                              background: selected ? 'var(--accent-bg)' : 'var(--bg-input)',
                              border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono truncate flex-1" style={{ color: 'var(--blue)' }}>
                                {r.name}
                              </span>
                              {r.private && (
                                <span className="text-[9px] font-mono px-1 py-px rounded flex items-center gap-1"
                                  style={{ background: '#3d3b0e', color: 'var(--yellow, #dcdcaa)', border: '1px solid #dcdcaa44' }}>
                                  <Lock size={9} /> privado
                                </span>
                              )}
                            </div>
                            {r.description && (
                              <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                                {r.description}
                              </p>
                            )}
                            <div className="flex gap-3 mt-1 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {r.language && <span>● {r.language}</span>}
                              <span className="flex items-center gap-1"><Star size={9} /> {r.stars}</span>
                              <span className="flex items-center gap-1"><GitFork size={9} /> {r.forks}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {error && <p className="text-xs font-mono" style={{ color: '#f48771' }}>{error}</p>}

          {preview && (
            <div className="p-3 rounded" style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent)' }}>
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
