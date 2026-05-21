import { useState, useRef } from 'react'
import { X, GitBranch, Save, Smile, Camera, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { userService } from '../../services/user.service'
import { uploadService } from '../../services/upload.service'
import Avatar from '../ui/Avatar'
import api from '../../services/api'

const PRESET_STATUSES = [
  { emoji: '💻', text: 'Codando' },
  { emoji: '🎯', text: 'Em foco' },
  { emoji: '🧠', text: 'Estudando' },
  { emoji: '☕', text: 'Café break' },
  { emoji: '🌙', text: 'AFK' },
  { emoji: '🎧', text: 'Modo deep work' },
  { emoji: '🐛', text: 'Caçando bug' },
  { emoji: '🚀', text: 'Em deploy' },
]

export default function UserProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setAuth, token } = useAppStore()
  const [bio, setBio] = useState(user?.bio || '')
  const [githubUrl, setGitBranchUrl] = useState(user?.githubUrl || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [banner, setBanner] = useState(user?.banner || '')
  const [emoji, setEmoji] = useState(user?.customStatus?.emoji || '')
  const [statusText, setStatusText] = useState(user?.customStatus?.text || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadErr, setUploadErr] = useState('')
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerPct, setBannerPct] = useState(0)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) return
    setUploadErr('')
    setUploading(true)
    setUploadPct(0)
    try {
      const res = await uploadService.upload(file, 'avatars', pct => setUploadPct(pct))
      setAvatar(res.url)
    } catch (err: any) {
      setUploadErr(err.message || 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const handleBannerChange = async (file: File | undefined) => {
    if (!file) return
    setUploadErr('')
    setBannerUploading(true)
    setBannerPct(0)
    try {
      const res = await uploadService.upload(file, 'banners', pct => setBannerPct(pct))
      setBanner(res.url)
    } catch (err: any) {
      setUploadErr(err.message || 'Erro no upload')
    } finally {
      setBannerUploading(false)
    }
  }

  const handle = async () => {
    if (!token) return
    setLoading(true)
    try {
      await api.patch('/api/users/profile', { bio, githubUrl, avatar, banner })
      const updated = await userService.setCustomStatus(emoji, statusText)
      setAuth(updated, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (p: { emoji: string; text: string }) => {
    setEmoji(p.emoji)
    setStatusText(p.text)
  }

  const clearStatus = () => {
    setEmoji('')
    setStatusText('')
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[440px] rounded max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>perfil</span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} className="hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Banner do perfil */}
          <div>
            <label className="text-[11px] font-mono mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              banner do perfil
            </label>
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              title="trocar banner"
              className="relative w-full h-24 rounded overflow-hidden group block"
              style={{
                background: banner ? undefined : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                border: '1px solid var(--border)',
              }}
            >
              {banner && <img src={banner} alt="banner" className="w-full h-full object-cover" />}
              <span
                className={`absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-mono transition-opacity ${
                  bannerUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                {bannerUploading
                  ? <><Loader2 size={14} className="animate-spin" /> {bannerPct}%</>
                  : <><Camera size={14} /> trocar banner</>}
              </span>
            </button>
            {banner && !bannerUploading && (
              <button
                onClick={() => setBanner('')}
                className="text-[10px] font-mono mt-1 hover:text-white transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                // remover banner
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleBannerChange(e.target.files?.[0])}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar username={user?.username || ''} avatar={avatar} size="xl" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="trocar foto"
                className="absolute inset-0 flex items-center justify-center rounded transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-100"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
              >
                {uploading
                  ? <div className="flex flex-col items-center gap-1">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-[10px] font-mono">{uploadPct}%</span>
                    </div>
                  : <Camera size={18} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleAvatarChange(e.target.files?.[0])}
              />
            </div>
            <div>
              <div className="text-sm font-medium font-mono" style={{ color: 'var(--blue)' }}>
                {user?.username}
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user?.email}</div>
              <div
                className="text-xs font-mono mt-1 px-2 py-px rounded inline-block"
                style={{ background: 'var(--accent-bg)', color: 'var(--blue)', border: '1px solid #9cdcfe33' }}
              >
                {user?.role}
              </div>
              {uploadErr && (
                <p className="text-[10px] font-mono mt-1" style={{ color: '#f48771' }}>// {uploadErr}</p>
              )}
            </div>
          </div>

          {/* Status custom */}
          <div>
            <label className="text-[11px] font-mono mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Smile size={11} /> status (emoji + texto)
            </label>
            <div className="flex gap-2">
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value.slice(0, 4))}
                placeholder="💻"
                maxLength={4}
                className="w-14 text-center px-2 py-2 text-base rounded outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                value={statusText}
                onChange={e => setStatusText(e.target.value.slice(0, 60))}
                placeholder="codando algo..."
                maxLength={60}
                className="flex-1 px-3 py-2 text-sm font-mono rounded outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              {(emoji || statusText) && (
                <button
                  onClick={clearStatus}
                  title="limpar"
                  className="px-2 py-2 text-xs font-mono rounded transition-colors"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_STATUSES.map(p => (
                <button
                  key={p.text}
                  onClick={() => applyPreset(p)}
                  className="text-[11px] font-mono px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{
                    background: emoji === p.emoji && statusText === p.text ? 'var(--accent-bg)' : 'var(--bg-input)',
                    border: `1px solid ${emoji === p.emoji && statusText === p.text ? 'var(--accent)' : 'var(--border)'}`,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {p.emoji} {p.text}
                </button>
              ))}
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
