import { useEffect, useState } from 'react'
import { X, Github, MessageCircle, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { userService } from '../../services/user.service'
import Avatar from '../ui/Avatar'
import type { User } from '../../types'

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  online:  { label: 'online',    color: 'var(--green)' },
  away:    { label: 'ausente',   color: 'var(--yellow)' },
  offline: { label: 'offline',   color: 'var(--text-secondary)' },
}

export default function UserProfileCard() {
  const { viewingProfileId, openProfile, user: me, onlineUsers, customStatuses, setActiveDmUser, activeGroup } = useAppStore()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!viewingProfileId) { setProfile(null); setError(''); return }
    setLoading(true)
    setError('')
    userService.getById(viewingProfileId)
      .then(setProfile)
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar perfil'))
      .finally(() => setLoading(false))
  }, [viewingProfileId])

  if (!viewingProfileId) return null

  const close = () => openProfile(null)
  const isMe = me?._id === viewingProfileId

  // Status efetivo: o bot está sempre online; senão usa a lista de online
  const liveStatus = profile
    ? (profile.role === 'bot'
        ? 'online'
        : (onlineUsers.has(profile._id) ? (profile.status === 'away' ? 'away' : 'online') : 'offline'))
    : 'offline'
  const statusInfo = STATUS_INFO[liveStatus]
  const cs = profile ? (customStatuses.get(profile._id) || profile.customStatus) : null

  // Só dá pra mandar DM se o user é membro do grupo ativo
  const canDM = !isMe && profile && activeGroup?.members?.some(m => m._id === profile._id)

  const handleSendMessage = () => {
    if (!profile) return
    const member = activeGroup?.members?.find(m => m._id === profile._id)
    if (member) {
      setActiveDmUser(member)
      close()
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[65]"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div
        className="w-80 rounded overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={14} className="animate-spin mr-2" /> carregando perfil...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16 font-mono text-xs" style={{ color: '#f48771' }}>
            <AlertCircle size={20} />
            {error}
            <button onClick={close} className="mt-2 px-3 py-1 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              fechar
            </button>
          </div>
        ) : profile ? (
          <>
            {/* Banner (imagem custom ou gradiente accent) */}
            <div
              className="h-20 relative"
              style={{ background: profile.banner ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
            >
              {profile.banner && (
                <img src={profile.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button
                onClick={close}
                className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded transition-colors"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}
              >
                <X size={13} />
              </button>
            </div>

            <div className="px-4 pb-4">
              {/* Avatar sobreposto ao banner, em fluxo normal */}
              <div className="-mt-10 mb-2">
                <div style={{ padding: 3, background: 'var(--bg-secondary)', borderRadius: 8, display: 'inline-block' }}>
                  <Avatar username={profile.username} avatar={profile.avatar} size="xl" />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-mono font-medium break-all" style={{ color: 'var(--blue)' }}>
                  {profile.username}
                </span>
                <span
                  className="text-[10px] px-1.5 py-px rounded font-mono"
                  style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}
                >
                  {profile.role}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full" style={{ background: statusInfo.color }} />
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {statusInfo.label}
                </span>
                {cs && (cs.emoji || cs.text) && (
                  <span className="text-[11px] font-mono ml-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {cs.emoji} {cs.text}
                  </span>
                )}
              </div>

              {/* Divisória */}
              <div className="my-3" style={{ borderTop: '1px solid var(--border)' }} />

              {profile.bio ? (
                <div className="mb-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
                    sobre
                  </div>
                  <p className="text-xs font-mono whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                    {profile.bio}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-mono mb-3" style={{ color: 'var(--comment)' }}>// sem bio</p>
              )}

              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-mono mb-3 transition-colors"
                  style={{ color: 'var(--blue)' }}
                >
                  <Github size={13} />
                  <span className="truncate underline">{profile.githubUrl.replace(/^https?:\/\//, '')}</span>
                </a>
              )}

              {profile.createdAt && (
                <div className="text-[10px] font-mono" style={{ color: 'var(--comment)' }}>
                  // membro desde {format(new Date(profile.createdAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                </div>
              )}

              {canDM && (
                <button
                  onClick={handleSendMessage}
                  className="w-full mt-3 py-2 text-sm font-mono rounded flex items-center justify-center gap-2 transition-colors"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  <MessageCircle size={13} /> enviar mensagem
                </button>
              )}
              {isMe && (
                <div className="mt-3 text-[10px] font-mono text-center" style={{ color: 'var(--comment)' }}>
                  // este é você
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
