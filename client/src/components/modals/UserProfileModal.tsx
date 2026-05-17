import { useState } from 'react'
import { X, GitBranch, Save } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import Avatar from '../ui/Avatar'
import api from '../../services/api'

export default function UserProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setAuth, token } = useAppStore()
  const [bio, setBio] = useState(user?.bio || '')
  const [githubUrl, setGitBranchUrl] = useState(user?.githubUrl || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handle = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.patch('/api/users/profile', { bio, githubUrl })
      setAuth(res.data, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[420px] rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>perfil</span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar username={user?.username || ''} size="lg" />
            <div>
              <div className="text-sm font-medium font-mono" style={{ color: 'var(--blue)' }}>{user?.username}</div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user?.email}</div>
              <div
                className="text-xs font-mono mt-1 px-2 py-px rounded inline-block"
                style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}
              >
                {user?.role}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="// fala um pouco sobre você..."
              className="w-full px-3 py-2 text-sm font-mono rounded outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>github url</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <GitBranch size={13} style={{ color: 'var(--text-secondary)' }} />
              <input
                value={githubUrl}
                onChange={e => setGitBranchUrl(e.target.value)}
                placeholder="https://github.com/seu-user"
                className="flex-1 bg-transparent outline-none text-sm font-mono"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <button
            onClick={handle}
            disabled={loading}
            className="w-full py-2 text-sm font-mono rounded flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: saved ? '#1b4721' : 'var(--accent)',
              color: saved ? 'var(--green)' : '#fff',
              border: `1px solid ${saved ? 'var(--green)' : 'var(--accent)'}`
            }}
          >
            <Save size={13} /> {loading ? 'salvando...' : saved ? '✓ salvo!' : 'salvar perfil'}
          </button>
        </div>
      </div>
    </div>
  )
}
