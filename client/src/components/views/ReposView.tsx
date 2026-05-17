import { useEffect, useState } from 'react'
import { GitBranch, GitFork, Star, ExternalLink, Plus, Trash2, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { repoService } from '../../services/repo.service'
import ShareRepoModal from '../modals/ShareRepoModal'
import type { Repo } from '../../types'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#569cd6', JavaScript: '#dcdcaa', Python: '#4ec994',
  Rust: '#ce9178', Go: '#9cdcfe', Java: '#f48771', 'C++': '#c586c0', HTML: '#e34c26'
}

export default function ReposView() {
  const { activeGroup, user } = useAppStore()
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    if (!activeGroup) return
    setLoading(true)
    try {
      const data = await repoService.listByGroup(activeGroup._id)
      setRepos(data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar repositórios')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeGroup?._id])

  const canRemove = (r: Repo) => {
    if (!user || !activeGroup) return false
    const myId = user._id
    if (activeGroup.owner === myId) return true
    if (activeGroup.admins?.includes(myId)) return true
    const addedById = typeof r.addedBy === 'string' ? r.addedBy : r.addedBy?._id
    return addedById === myId
  }

  const handleRemove = async (repo: Repo) => {
    if (!activeGroup || !repo._id) return
    if (!confirm(`Remover ${repo.name} dos repositórios do grupo?`)) return
    try {
      await repoService.removeFromGroup(activeGroup._id, repo._id)
      setRepos(rs => rs.filter(r => r._id !== repo._id))
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover')
    }
  }

  if (!activeGroup) {
    return (
      <div className="w-72 flex items-center justify-center text-xs font-mono"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        selecione um grupo
      </div>
    )
  }

  return (
    <div
      className="w-72 flex flex-col flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          repositórios
        </span>
        <button
          onClick={() => setShowAdd(true)}
          title="Adicionar repositório"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && (
          <div className="text-center py-4 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            carregando...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded text-xs font-mono"
            style={{ background: '#5c1b1b33', border: '1px solid #f4877144', color: '#f48771' }}>
            <AlertCircle size={12} className="mt-px flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && repos.length === 0 && (
          <div className="text-center py-8 px-3 font-mono">
            <GitBranch size={28} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              nenhum repo adicionado
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--comment)' }}>
              // clique no + acima
            </p>
          </div>
        )}

        {repos.map(r => (
          <div
            key={r._id || r.url}
            className="group p-2.5 rounded relative"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
          >
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <GitBranch size={11} style={{ color: 'var(--blue)' }} />
                <span className="text-xs font-mono font-medium flex-1 truncate" style={{ color: 'var(--blue)' }}>
                  {r.name}
                </span>
                <ExternalLink size={9} style={{ color: 'var(--text-secondary)' }} />
              </div>
              {r.description && (
                <p className="text-[11px] font-mono line-clamp-2 mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {r.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                {r.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: LANG_COLORS[r.language] || 'var(--text-secondary)' }} />
                    {r.language}
                  </span>
                )}
                <span className="flex items-center gap-0.5"><Star size={9} /> {r.stars}</span>
                <span className="flex items-center gap-0.5"><GitFork size={9} /> {r.forks}</span>
              </div>
            </a>
            {canRemove(r) && (
              <button
                onClick={() => handleRemove(r)}
                title="Remover"
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-secondary)] hover:text-red-400"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && <ShareRepoModal mode="save" onClose={() => { setShowAdd(false); load() }} />}
    </div>
  )
}
