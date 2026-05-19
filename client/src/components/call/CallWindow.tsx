import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Phone, PhoneOff, Mic, MicOff, Minimize2, Maximize2, Loader2, AlertCircle,
} from 'lucide-react'
import {
  useCallStore,
  startTitleBlink,
  stopTitleBlink,
} from '../../store/useCallStore'
import { useAppStore } from '../../store/useAppStore'
import Avatar from '../ui/Avatar'

const STATUS_LABEL: Record<string, string> = {
  calling: 'chamando...',
  connecting: 'conectando...',
  'in-call': 'em chamada',
  ended: 'finalizando...',
  ringing: 'tocando...',
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function CallWindow() {
  const {
    status, peer, muted, mini, miniPosition, error, startedAt, remoteStream,
    hangup, toggleMute, setMini, setMiniPosition,
  } = useCallStore()
  const socket = useAppStore(s => s.socket)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [duration, setDuration] = useState('00:00')

  // Plug do remoteStream no <audio>
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream
      audioRef.current.play().catch(err => console.warn('audio play falhou:', err))
    }
  }, [remoteStream])

  // Timer da chamada
  useEffect(() => {
    if (!startedAt) { setDuration('00:00'); return }
    const tick = () => setDuration(formatDuration(Date.now() - startedAt))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  // Pisca título da aba quando em call e aba em background
  useEffect(() => {
    if (status === 'in-call' && peer) {
      startTitleBlink(`🟢 em chamada — ${peer.username}`)
      return () => stopTitleBlink()
    }
  }, [status, peer])

  // Avisa hangup quando a aba é fechada (evita "fantasma" do outro lado)
  useEffect(() => {
    if (status === 'idle') return
    const onUnload = () => {
      const p = useCallStore.getState().peer
      if (p && socket) socket.emit('call-hangup', { toId: p._id })
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [status, socket])

  // ---- Drag da mini janela ----
  const dragRef = useRef<{ offX: number; offY: number; dragging: boolean }>({ offX: 0, offY: 0, dragging: false })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!mini) return
    // Se o clique foi num botão (ou dentro de um), não inicia drag —
    // deixa o onClick do botão funcionar normal
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current.dragging = true
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragRef.current.offX = e.clientX - rect.left
    dragRef.current.offY = e.clientY - rect.top
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [mini])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const x = Math.max(0, Math.min(window.innerWidth - 220, e.clientX - dragRef.current.offX))
    const y = Math.max(0, Math.min(window.innerHeight - 70, e.clientY - dragRef.current.offY))
    setMiniPosition({ x, y })
  }, [setMiniPosition])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current.dragging = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  // Não renderiza nada quando idle/ringing
  if (status === 'idle' || status === 'ringing' || !peer) {
    // Mantém o <audio> escondido pra evitar recriar elemento
    return remoteStream ? <audio ref={audioRef} autoPlay style={{ display: 'none' }} /> : null
  }

  const isActive = status === 'in-call'
  const showError = !!error

  // ===== MODO MINI =====
  if (mini) {
    return (
      <>
        <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="fixed z-[80] rounded shadow-lg select-none flex items-center gap-2 px-2.5 py-2"
          style={{
            left: miniPosition.x,
            top: miniPosition.y,
            width: 220,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent)',
            cursor: dragRef.current.dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        >
          <Avatar username={peer.username} avatar={peer.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono truncate" style={{ color: 'var(--blue)' }}>{peer.username}</div>
            <div className="text-[10px] font-mono" style={{ color: isActive ? 'var(--green)' : 'var(--text-secondary)' }}>
              {isActive ? `● ${duration}` : STATUS_LABEL[status]}
            </div>
          </div>
          <button
            onClick={toggleMute}
            title={muted ? 'desmutar' : 'mutar'}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: muted ? '#f48771' : 'var(--text-secondary)' }}
          >
            {muted ? <MicOff size={12} /> : <Mic size={12} />}
          </button>
          <button
            onClick={() => setMini(false)}
            title="expandir"
            className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={() => hangup(socket)}
            title="desligar"
            className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ background: '#f48771', color: '#1e1e1e' }}
          >
            <PhoneOff size={12} />
          </button>
        </div>
      </>
    )
  }

  // ===== MODO FULL =====
  return (
    <>
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="w-[420px] rounded overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-mono uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={11} /> chamada de voz
            </span>
            <button
              onClick={() => setMini(true)}
              title="minimizar"
              className="text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <Minimize2 size={14} />
            </button>
          </div>

          <div className="py-8 flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar username={peer.username} avatar={peer.avatar} size="xl" className={isActive ? '' : 'animate-pulse'} />
              {isActive && (
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full"
                  style={{ background: 'var(--green)', border: '2px solid var(--bg-secondary)' }}
                />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-mono font-medium" style={{ color: 'var(--blue)' }}>{peer.username}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: isActive ? 'var(--green)' : 'var(--text-secondary)' }}>
                {showError
                  ? <span style={{ color: '#f48771' }} className="flex items-center justify-center gap-1">
                      <AlertCircle size={11} /> {error}
                    </span>
                  : isActive
                  ? `● ${duration}`
                  : <span className="flex items-center justify-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> {STATUS_LABEL[status]}
                    </span>}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-center gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={toggleMute}
              disabled={!isActive && status !== 'connecting'}
              title={muted ? 'desmutar' : 'mutar microfone'}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors disabled:opacity-40"
              style={{
                background: muted ? '#5c1b1b33' : 'var(--bg-input)',
                border: `1px solid ${muted ? '#f48771' : 'var(--border)'}`,
                color: muted ? '#f48771' : 'var(--text-primary)',
              }}
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              onClick={() => hangup(socket)}
              title="desligar"
              className="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#f48771', color: '#1e1e1e' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#ff9a82')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f48771')}
            >
              <PhoneOff size={22} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
