import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div
      className="h-screen flex flex-col items-center justify-center font-mono"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
    >
      <div className="text-6xl mb-4" style={{ color: 'var(--accent)' }}>404</div>
      <p className="text-sm">// página não encontrada</p>
      <button
        onClick={() => navigate('/app')}
        className="mt-4 px-4 py-2 text-sm rounded"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        → voltar ao app
      </button>
    </div>
  )
}
