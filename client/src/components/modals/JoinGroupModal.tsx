import { useState } from 'react'
import { X, LogIn } from 'lucide-react'
import { groupService } from '../../services/group.service'
import { useAppStore } from '../../store/useAppStore'

export default function JoinGroupModal({ onClose }: { onClose: () => void }) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setGroups, groups } = useAppStore()

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const group = await groupService.join(inviteCode.trim())
      setGroups([...groups, group])
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-96 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
            entrar em grupo
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              código de convite
            </label>
            <input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="ex: a1b2c3d4"
              className="w-full px-3 py-2 text-sm font-mono rounded outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs font-mono" style={{ color: '#f48771' }}>// erro: {error}</p>
          )}
          <button
            onClick={handleJoin}
            disabled={!inviteCode.trim() || loading}
            className="w-full py-2 text-sm font-mono rounded flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <LogIn size={14} /> {loading ? 'entrando...' : 'entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
