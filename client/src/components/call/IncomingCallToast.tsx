import { useEffect } from 'react'
import { Phone, PhoneOff } from 'lucide-react'
import { useCallStore, startRingtone, stopRingtone } from '../../store/useCallStore'
import { useAppStore } from '../../store/useAppStore'
import Avatar from '../ui/Avatar'

export default function IncomingCallToast() {
  const { status, peer, acceptIncoming, declineIncoming } = useCallStore()
  const socket = useAppStore(s => s.socket)

  // Toca ringtone só enquanto status === 'ringing'
  useEffect(() => {
    if (status === 'ringing') {
      startRingtone()
      return () => stopRingtone()
    }
  }, [status])

  if (status !== 'ringing' || !peer) return null

  const handleAccept = () => {
    if (!socket) return
    stopRingtone()
    acceptIncoming(socket)
  }

  const handleDecline = () => {
    if (!socket) return
    stopRingtone()
    declineIncoming(socket)
  }

  return (
    <div
      className="fixed top-12 right-4 z-[70] w-80 rounded overflow-hidden"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--accent)',
        boxShadow: '0 8px 30px rgba(0, 122, 204, 0.4)',
        animation: 'ds-slide-in 0.2s ease-out',
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--accent-bg)' }}>
        <div className="relative">
          <Avatar username={peer.username} avatar={peer.avatar} size="lg" />
          <span
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
            style={{ background: 'var(--accent)', border: '2px solid var(--bg-secondary)' }}
          >
            <Phone size={9} color="#fff" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            chamada recebida
          </p>
          <p className="text-sm font-mono font-medium truncate" style={{ color: 'var(--blue)' }}>
            {peer.username}
          </p>
          <p className="text-[11px] font-mono" style={{ color: 'var(--comment)' }}>
            // está te ligando...
          </p>
        </div>
      </div>

      <div className="flex" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleDecline}
          className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-mono transition-colors"
          style={{ background: 'transparent', color: '#f48771' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#5c1b1b33')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <PhoneOff size={14} /> recusar
        </button>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <button
          onClick={handleAccept}
          className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-mono transition-colors"
          style={{ background: 'transparent', color: 'var(--green)' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1b472133')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Phone size={14} /> atender
        </button>
      </div>
    </div>
  )
}
