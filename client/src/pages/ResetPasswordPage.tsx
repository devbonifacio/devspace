import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { authService } from '../services/auth.service'
import { checkPassword } from '../utils/validation'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pwdCheck = useMemo(() => checkPassword(password), [password])

  const handle = async () => {
    setError('')
    if (!pwdCheck.ok) return setError('Senha não atende os requisitos')
    if (password !== confirm) return setError('As senhas não coincidem')

    setLoading(true)
    try {
      const r = await authService.resetPassword(token, password)
      // Deixa a mensagem de sucesso pra AuthPage exibir
      localStorage.setItem('ds_authmsg', r.message)
      navigate('/auth', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center font-mono" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-[360px]">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold mb-1 inline-flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--green)' }}>&gt;</span>
            <span>Dev</span>
            <span style={{ color: 'var(--accent)' }}>Space</span>
            <span className="ds-cursor" style={{ color: 'var(--green)', marginLeft: -8 }}>_</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--comment)' }}>{'// redefinir senha'}</p>
        </div>

        <div className="rounded p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          {!token ? (
            <div className="space-y-3">
              <p className="text-xs font-mono" style={{ color: '#f48771' }}>
                // link inválido — falta o token de redefinição
              </p>
              <button
                onClick={() => navigate('/auth', { replace: true })}
                className="w-full py-2.5 text-sm font-mono rounded"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                ← voltar pro login
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--comment)' }}>
                {'// crie uma nova senha para sua conta'}
              </p>

              <div>
                <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 text-sm rounded outline-none font-mono"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                {password.length > 0 && (
                  <div className="mt-2 space-y-0.5 text-[10px] font-mono">
                    <PwdRule ok={pwdCheck.hasLength} label="mínimo 8 caracteres" />
                    <PwdRule ok={pwdCheck.hasUpper} label="1 letra maiúscula" />
                    <PwdRule ok={pwdCheck.hasLower} label="1 letra minúscula" />
                    <PwdRule ok={pwdCheck.hasNumber} label="1 número" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 text-sm rounded outline-none font-mono"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {error && (
                <p className="text-xs font-mono" style={{ color: '#f48771' }}>// erro: {error}</p>
              )}

              <button
                onClick={handle}
                disabled={loading}
                className="w-full py-2.5 text-sm font-mono rounded mt-1 disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {loading ? '█ aguarde...' : '✓ redefinir senha'}
              </button>
            </div>
          )}
        </div>
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
