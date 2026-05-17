import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { groupService } from '../../services/group.service'
import { useAppStore } from '../../store/useAppStore'

export default function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setGroups, groups } = useAppStore()

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const group = await groupService.create({ name, description })
      setGroups([...groups, group])
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar grupo')
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
            criar novo grupo
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              nome do grupo
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: react-killers"
              className="w-full px-3 py-2 text-sm font-mono rounded outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="sobre o que é esse grupo?"
              rows={2}
              className="w-full px-3 py-2 text-sm font-mono rounded outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          {error && (
            <p className="text-xs font-mono" style={{ color: '#f48771' }}>// erro: {error}</p>
          )}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full py-2 text-sm font-mono rounded flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus size={14} /> {loading ? 'criando...' : 'criar grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}
