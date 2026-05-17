import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { authService } from '../services/auth.service'
import { checkPassword, validateUsername, validateEmail } from '../utils/validation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAppStore()
  const navigate = useNavigate()

  const pwdCheck = useMemo(() => checkPassword(form.password), [form.password])

  const handle = async () => {
    setError('')

    if (mode === 'register') {
      const uErr = validateUsername(form.username)
      if (uErr) return setError(uErr)
      const eErr = validateEmail(form.email)
      if (eErr) return setError(eErr)
      if (!pwdCheck.ok) return setError('Senha não atende os requisitos')
    }

    setLoading(true)
    try {
      const data = mode === 'login'
        ? await authService.login(form.email, form.password)
        : await authService.register(form.username, form.email, form.password)
      setAuth(data.user, data.token)
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center font-mono" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-[360px]">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {'<'}Dev<span style={{ color: 'var(--accent)' }}>Space</span>{' />'}
          </div>
          <p className="text-xs" style={{ color: 'var(--comment)' }}>
            {'// workspace para developers'}
          </p>
        </div>

        <div className="rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2.5 text-xs font-mono transition-colors"
                style={{
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: mode === m ? 'var(--bg-primary)' : 'transparent',
                  borderTop: mode === m ? '1px solid var(--accent)' : '1px solid transparent'
                }}
              >
                {m === 'login' ? '→ login' : '+ registro'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-3">
            {mode === 'register' && (
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>username</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="seu_username"
                  autoComplete="username"
                  className="w-full px-3 py-2 text-sm rounded outline-none font-mono"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            <div>
              <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="dev@email.com"
                autoComplete="email"
                className="w-full px-3 py-2 text-sm rounded outline-none font-mono"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-2 text-sm rounded outline-none font-mono"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />

              {mode === 'register' && form.password.length > 0 && (
                <div className="mt-2 space-y-0.5 text-[10px] font-mono">
                  <PwdRule ok={pwdCheck.hasLength} label="mínimo 8 caracteres" />
                  <PwdRule ok={pwdCheck.hasUpper} label="1 letra maiúscula" />
                  <PwdRule ok={pwdCheck.hasLower} label="1 letra minúscula" />
                  <PwdRule ok={pwdCheck.hasNumber} label="1 número" />
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs font-mono" style={{ color: '#f48771' }}>// erro: {error}</p>
            )}

            <button
              onClick={handle}
              disabled={loading}
              className="w-full py-2.5 text-sm font-mono rounded mt-2 disabled:opacity-50 transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading ? '█ aguarde...' : mode === 'login' ? '→ entrar' : '+ criar conta'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] mt-4 font-mono" style={{ color: 'var(--comment)' }}>
          {'// built with React + Socket.io'}
        </p>
      </div>
    </div>
  )
}

function PwdRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: ok ? 'var(--green)' : 'var(--text-secondary)' }}>
      {ok ? <Check size={10} /> : <X size={10} />}
      <span>{label}</span>
    </div>
  )
}
