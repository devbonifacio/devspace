import { useState } from 'react'
import { X, Hash } from 'lucide-react'
import { channelService } from '../../services/channel.service'
import { groupService } from '../../services/group.service'
import { useAppStore } from '../../store/useAppStore'

const TYPES = [
  { id: 'text', label: 'Texto — chat geral' },
  { id: 'code-review', label: 'Code Review — compartilhe código' },
  { id: 'announcements', label: 'Anúncios — só admins postam' },
] as const

type ChannelType = typeof TYPES[number]['id']

export default function CreateChannelModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('text')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { activeGroup, setActiveGroup } = useAppStore()

  const handle = async () => {
    if (!name.trim() || !activeGroup) return
    setLoading(true)
    setError('')
    try {
      await channelService.create({
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        groupId: activeGroup._id,
        type
      })
      const updated = await groupService.getById(activeGroup._id)
      setActiveGroup(updated)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar canal')
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
      <div className="w-96 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
            criar canal
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>nome do canal</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <Hash size={13} style={{ color: 'var(--text-secondary)' }} />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="nome-do-canal"
                className="flex-1 bg-transparent outline-none text-sm font-mono"
                style={{ color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-mono mb-2 block" style={{ color: 'var(--text-secondary)' }}>tipo de canal</label>
            <div className="space-y-1.5">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="w-full text-left px-3 py-2 rounded text-sm font-mono transition-colors"
                  style={{
                    background: type === t.id ? 'var(--accent-bg)' : 'var(--bg-input)',
                    border: `1px solid ${type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    color: type === t.id ? 'var(--blue)' : 'var(--text-secondary)'
                  }}
                >
                  {type === t.id ? '● ' : '○ '}{t.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-mono" style={{ color: '#f48771' }}>// {error}</p>}
          <button
            onClick={handle}
            disabled={!name.trim() || loading}
            className="w-full py-2 text-sm font-mono rounded disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'criando...' : '+ criar canal'}
          </button>
        </div>
      </div>
    </div>
  )
}
