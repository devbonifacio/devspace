import { useState } from 'react'
import { X, Trash2, Shield, ShieldOff, Crown, AlertTriangle, LogOut, UserMinus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { groupService } from '../../services/group.service'
import Avatar from '../ui/Avatar'
import type { User, GroupPermissions, PermissionScope } from '../../types'

const PERM_LABELS: Record<keyof GroupPermissions, string> = {
  createChannel: 'Criar canais',
  pinMessage: 'Fixar mensagens',
  shareRepo: 'Adicionar repositórios ao grupo',
  inviteMembers: 'Convidar novos membros',
}

export default function GroupSettingsModal({ onClose }: { onClose: () => void }) {
  const { activeGroup, user, updateGroup, removeGroup, openProfile } = useAppStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!activeGroup) return null

  const meId = user?._id
  const ownerId = typeof activeGroup.owner === 'string' ? activeGroup.owner : (activeGroup.owner as any)?._id
  const admins = activeGroup.admins || []
  const isOwner = meId === ownerId
  const iAmAdmin = isOwner || admins.includes(meId || '')

  const isMemberAdmin = (id: string) => id === ownerId || admins.includes(id)

  const toggleAdmin = async (member: User) => {
    if (!iAmAdmin || busy) return
    setBusy(true)
    setError('')
    try {
      const updated = isMemberAdmin(member._id)
        ? await groupService.removeAdmin(activeGroup._id, member._id)
        : await groupService.addAdmin(activeGroup._id, member._id)
      updateGroup(updated)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar admin')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!iAmAdmin || busy) return
    setBusy(true)
    setError('')
    try {
      await groupService.remove(activeGroup._id)
      removeGroup(activeGroup._id)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao apagar grupo')
      setBusy(false)
    }
  }

  const handleKick = async (member: User) => {
    if (!iAmAdmin || busy) return
    if (!confirm(`Remover @${member.username} do grupo?`)) return
    setBusy(true)
    setError('')
    try {
      await groupService.kick(activeGroup._id, member._id)
      // O group-updated socket vai atualizar o estado
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao remover membro')
    } finally {
      setBusy(false)
    }
  }

  const togglePerm = async (key: keyof GroupPermissions, value: PermissionScope) => {
    if (!iAmAdmin || busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await groupService.updatePermissions(activeGroup._id, { [key]: value })
      updateGroup(updated)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar permissão')
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    if (isOwner) {
      setError('Owner não pode sair. Transfira o grupo ou apague.')
      return
    }
    if (!confirm(`Sair do grupo "${activeGroup.name}"?`)) return
    setBusy(true)
    setError('')
    try {
      await groupService.leave(activeGroup._id)
      removeGroup(activeGroup._id)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao sair do grupo')
      setBusy(false)
    }
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[480px] rounded max-h-[80vh] flex flex-col" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
            configurações — {activeGroup.name}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-[11px] font-mono mb-2 block uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              membros ({activeGroup.members.length})
            </label>
            <div className="space-y-1">
              {activeGroup.members.map(m => {
                const memberIsOwner = m._id === ownerId
                const memberIsAdmin = isMemberAdmin(m._id)
                const canToggle = iAmAdmin && !memberIsOwner && m._id !== meId
                return (
                  <div
                    key={m._id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                  >
                    <button
                      onClick={() => openProfile(m._id)}
                      title={`ver perfil de ${m.username}`}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left transition-opacity hover:opacity-80"
                    >
                      <Avatar username={m.username} avatar={m.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono truncate" style={{ color: 'var(--blue)' }}>
                          {m.username}{m._id === meId && ' (você)'}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{m.email}</div>
                      </div>
                    </button>
                    {memberIsOwner && (
                      <span className="text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded"
                        style={{ background: '#3d3b0e', color: 'var(--yellow, #dcdcaa)', border: '1px solid #dcdcaa44' }}>
                        <Crown size={10} /> owner
                      </span>
                    )}
                    {!memberIsOwner && memberIsAdmin && (
                      <span className="text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}>
                        <Shield size={10} /> admin
                      </span>
                    )}
                    {canToggle && (
                      <>
                        <button
                          onClick={() => toggleAdmin(m)}
                          disabled={busy}
                          title={memberIsAdmin ? 'remover admin' : 'promover a admin'}
                          className="text-[var(--text-secondary)] hover:text-[var(--blue)] transition-colors disabled:opacity-30"
                        >
                          {memberIsAdmin ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </button>
                        <button
                          onClick={() => handleKick(m)}
                          disabled={busy}
                          title="remover do grupo"
                          className="text-[var(--text-secondary)] hover:text-red-400 transition-colors disabled:opacity-30"
                        >
                          <UserMinus size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {iAmAdmin && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="text-[11px] font-mono mb-2 block uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                permissões
              </label>
              <div className="space-y-1.5">
                {(Object.keys(PERM_LABELS) as Array<keyof GroupPermissions>).map(key => {
                  const current: PermissionScope = activeGroup.permissions?.[key] ?? (key === 'pinMessage' ? 'admins' : 'all')
                  return (
                    <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                      <span className="flex-1 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                        {PERM_LABELS[key]}
                      </span>
                      <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        {(['all', 'admins'] as PermissionScope[]).map(v => (
                          <button
                            key={v}
                            onClick={() => togglePerm(key, v)}
                            disabled={busy || current === v}
                            className="text-[10px] font-mono px-2 py-0.5 transition-colors disabled:cursor-default"
                            style={{
                              background: current === v ? 'var(--accent-bg)' : 'transparent',
                              color: current === v ? 'var(--blue)' : 'var(--text-secondary)',
                            }}
                          >
                            {v === 'all' ? 'todos' : 'admins'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs font-mono" style={{ color: '#f48771' }}>// {error}</p>}

          {!isOwner && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleLeave}
                disabled={busy}
                className="w-full py-2 text-sm font-mono rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <LogOut size={13} /> sair do grupo
              </button>
            </div>
          )}

          {iAmAdmin && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="text-[11px] font-mono mb-2 block uppercase tracking-widest" style={{ color: '#f48771' }}>
                zona perigosa
              </label>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 text-sm font-mono rounded flex items-center justify-center gap-2 transition-colors"
                  style={{ background: 'transparent', color: '#f48771', border: '1px solid #f48771' }}
                >
                  <Trash2 size={13} /> apagar grupo
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 px-3 py-2 rounded"
                    style={{ background: '#5c1b1b33', border: '1px solid #f4877144' }}>
                    <AlertTriangle size={14} style={{ color: '#f48771', flexShrink: 0, marginTop: 2 }} />
                    <p className="text-xs font-mono" style={{ color: '#f48771' }}>
                      isso apaga TODOS os canais, mensagens e o grupo. ação irreversível.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="flex-1 py-2 text-sm font-mono rounded transition-colors"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    >
                      cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      className="flex-1 py-2 text-sm font-mono rounded disabled:opacity-50"
                      style={{ background: '#f48771', color: '#1e1e1e' }}
                    >
                      {busy ? 'apagando...' : 'sim, apagar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
