import { useEffect, useState, useCallback } from 'react'
import { Shield, X, Search, Ban, Loader2, AlertCircle, Check, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { adminService, type ModUser, type ModStats } from '../../services/admin.service'
import Avatar from '../ui/Avatar'

const DURATIONS = [
  { label: '10 min', minutes: 10 },
  { label: '1 hora', minutes: 60 },
  { label: '6 horas', minutes: 360 },
  { label: '1 dia', minutes: 1440 },
  { label: '7 dias', minutes: 10080 },
  { label: '30 dias', minutes: 43200 },
  { label: 'permanente', minutes: 0, permanent: true },
]

const STATUS_COLOR: Record<string, string> = {
  online: 'var(--green)',
  away: 'var(--yellow)',
  offline: 'var(--text-secondary)',
}

function banLabel(ban?: ModUser['ban']): string {
  if (!ban?.until) return ''
  const d = new Date(ban.until)
  if (d.getUTCFullYear() >= 9999) return 'permanente'
  return `até ${format(d, "d MMM yyyy · HH:mm", { locale: ptBR })}`
}

export default function ModerationPanel({ onClose }: { onClose: () => void }) {
  const me = useAppStore(s => s.user)
  const [users, setUsers] = useState<ModUser[]>([])
  const [stats, setStats] = useState<ModStats>({ total: 0, online: 0, banned: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  // Estado do formulário de banimento inline
  const [banningId, setBanningId] = useState<string | null>(null)
  const [durIdx, setDurIdx] = useState(2) // default: 6 horas
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.getUsers(query)
      setUsers(data.users)
      setStats(data.stats)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  // Busca com debounce
  useEffect(() => {
    const t = setTimeout(() => load(q), 300)
    return () => clearTimeout(t)
  }, [q, load])

  const startBan = (id: string) => {
    setBanningId(id)
    setDurIdx(2)
    setReason('')
  }

  const confirmBan = async () => {
    if (!banningId) return
    setBusyId(banningId)
    setError('')
    try {
      const d = DURATIONS[durIdx]
      await adminService.ban(banningId, d.permanent
        ? { permanent: true, reason }
        : { minutes: d.minutes, reason })
      setBanningId(null)
      await load(q)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao banir')
    } finally {
      setBusyId(null)
    }
  }

  const unban = async (id: string) => {
    setBusyId(id)
    setError('')
    try {
      await adminService.unban(id)
      await load(q)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao desbanir')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[70]"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[620px] max-w-[94vw] rounded max-h-[88vh] flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield size={15} style={{ color: 'var(--accent)' }} /> painel de moderação
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 px-4 pt-3 flex-shrink-0">
          {[
            { k: 'total', label: 'usuários', val: stats.total, color: 'var(--blue)' },
            { k: 'online', label: 'online', val: stats.online, color: 'var(--green)' },
            { k: 'banned', label: 'banidos', val: stats.banned, color: '#f48771' },
          ].map(s => (
            <div key={s.k} className="flex-1 rounded px-3 py-2 font-mono"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div className="text-lg font-medium" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div className="px-4 pt-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <Search size={13} style={{ color: 'var(--text-secondary)' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="buscar por username ou email..."
              className="flex-1 bg-transparent outline-none text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {error && (
          <p className="px-4 pt-2 text-xs font-mono flex-shrink-0" style={{ color: '#f48771' }}>// {error}</p>
        )}

        {/* Lista */}
        <div className="p-4 overflow-y-auto space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-12 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 size={14} className="animate-spin mr-2" /> carregando...
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 font-mono text-xs" style={{ color: 'var(--comment)' }}>
              <AlertCircle size={18} /> // nenhum usuário encontrado
            </div>
          ) : (
            users.map(u => {
              const isMe = u._id === me?._id
              const isBanning = banningId === u._id
              const busy = busyId === u._id
              return (
                <div key={u._id} className="rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar username={u.username} avatar={u.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono truncate" style={{ color: 'var(--blue)' }}>
                          {u.username}{isMe && ' (você)'}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-px rounded"
                          style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}>
                          {u.role}
                        </span>
                        {u.banned && (
                          <span
                            title={u.ban?.reason || ''}
                            className="text-[9px] font-mono px-1 py-px rounded"
                            style={{ background: '#5c1b1b', color: '#f48771', border: '1px solid #f4877144' }}
                          >
                            banido · {banLabel(u.ban)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                        {u.email}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[u.status] || STATUS_COLOR.offline }} />
                      <span className="text-[10px] font-mono w-12" style={{ color: 'var(--text-secondary)' }}>{u.status}</span>
                    </div>

                    {!isMe && (
                      <div className="flex-shrink-0">
                        {u.banned ? (
                          <button
                            onClick={() => unban(u._id)}
                            disabled={busy}
                            className="text-[11px] font-mono px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-40"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--green)', border: '1px solid var(--green)' }}
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} desbanir
                          </button>
                        ) : (
                          <button
                            onClick={() => isBanning ? setBanningId(null) : startBan(u._id)}
                            className="text-[11px] font-mono px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            style={{
                              background: isBanning ? '#f48771' : 'var(--bg-secondary)',
                              color: isBanning ? '#1e1e1e' : '#f48771',
                              border: '1px solid #f48771',
                            }}
                          >
                            <Ban size={11} /> {isBanning ? 'cancelar' : 'banir'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Form de banimento inline */}
                  {isBanning && (
                    <div className="px-3 pb-3 pt-1 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="text-[10px] font-mono uppercase tracking-widest pt-1" style={{ color: 'var(--text-secondary)' }}>
                        duração
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {DURATIONS.map((d, i) => (
                          <button
                            key={d.label}
                            onClick={() => setDurIdx(i)}
                            className="text-[11px] font-mono px-2 py-1 rounded transition-colors"
                            style={{
                              background: durIdx === i ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                              color: durIdx === i ? 'var(--blue)' : 'var(--text-secondary)',
                              border: `1px solid ${durIdx === i ? 'var(--accent)' : 'var(--border)'}`,
                            }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <input
                        value={reason}
                        onChange={e => setReason(e.target.value.slice(0, 300))}
                        placeholder="motivo (opcional, visível pro usuário)"
                        className="w-full px-2 py-1.5 text-xs font-mono rounded outline-none"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                      <button
                        onClick={confirmBan}
                        disabled={busy}
                        className="w-full py-1.5 text-xs font-mono rounded flex items-center justify-center gap-1.5 disabled:opacity-40"
                        style={{ background: '#f48771', color: '#1e1e1e' }}
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        confirmar banimento ({DURATIONS[durIdx].label})
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
