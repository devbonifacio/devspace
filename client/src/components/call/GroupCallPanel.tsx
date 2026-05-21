import { useEffect } from 'react'
import { Mic, MicOff, PhoneOff, Radio, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useGroupCallStore, type VoicePeer } from '../../store/useGroupCallStore'
import Avatar from '../ui/Avatar'

export default function GroupCallPanel() {
  const { user, socket } = useAppStore()
  const { activeGroupId, groupName, peers, muted, mini, error, toggleMute, leaveCall, setMini } = useGroupCallStore()

  // Encerra a chamada se a aba fechar
  useEffect(() => {
    if (!activeGroupId) return
    const onUnload = () => leaveCall(socket)
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [activeGroupId, socket, leaveCall])

  // Erro de microfone (mostra mesmo sem call ativa)
  if (!activeGroupId) {
    return error ? (
      <div
        className="fixed bottom-4 right-4 z-[60] px-3 py-2 rounded text-xs font-mono"
        style={{ background: '#5c1b1b', color: '#f48771', border: '1px solid #f4877144' }}
      >
        // {error}
      </div>
    ) : null
  }

  const total = peers.length + 1

  if (mini) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
      >
        <PeerAudios peers={peers} />
        <Radio size={14} className="animate-pulse" style={{ color: 'var(--green)' }} />
        <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
          {total} na chamada
        </span>
        <button onClick={toggleMute} title={muted ? 'ativar mic' : 'silenciar'}
          className="w-7 h-7 flex items-center justify-center rounded"
          style={{ background: muted ? '#5c1b1b' : 'var(--bg-input)', color: muted ? '#f48771' : 'var(--text-primary)' }}>
          {muted ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
        <button onClick={() => leaveCall(socket)} title="sair da chamada"
          className="w-7 h-7 flex items-center justify-center rounded"
          style={{ background: '#a52834', color: '#fff' }}>
          <PhoneOff size={13} />
        </button>
        <button onClick={() => setMini(false)} title="expandir"
          className="w-7 h-7 flex items-center justify-center rounded"
          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          <ChevronUp size={13} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] w-72 rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.55)' }}
    >
      <PeerAudios peers={peers} />

      <div className="flex items-center gap-2 px-3 py-2"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}>
        <Radio size={13} className="animate-pulse" style={{ color: '#fff' }} />
        <span className="text-xs font-mono font-medium flex-1 truncate" style={{ color: '#fff' }}>
          voz · {groupName}
        </span>
        <button onClick={() => setMini(true)} title="minimizar" style={{ color: '#fff' }}>
          <ChevronDown size={15} />
        </button>
      </div>

      <div className="p-3">
        <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
          {total} {total === 1 ? 'pessoa' : 'pessoas'} na chamada
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* Eu */}
          <Participant
            name={`${user?.username || 'eu'}`}
            avatar={user?.avatar}
            sub={muted ? 'mutado' : 'você'}
            dim={muted}
            connected
          />
          {peers.map(p => (
            <Participant
              key={p.userId}
              name={p.username}
              avatar={p.avatar}
              sub={p.connected ? 'na call' : 'conectando...'}
              connected={p.connected}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={toggleMute}
            className="flex-1 py-2 text-xs font-mono rounded flex items-center justify-center gap-1.5"
            style={{
              background: muted ? '#5c1b1b' : 'var(--bg-input)',
              color: muted ? '#f48771' : 'var(--text-primary)',
              border: `1px solid ${muted ? '#f4877144' : 'var(--border)'}`,
            }}
          >
            {muted ? <MicOff size={13} /> : <Mic size={13} />}
            {muted ? 'mutado' : 'mic on'}
          </button>
          <button
            onClick={() => leaveCall(socket)}
            className="flex-1 py-2 text-xs font-mono rounded flex items-center justify-center gap-1.5"
            style={{ background: '#a52834', color: '#fff' }}
          >
            <PhoneOff size={13} /> sair
          </button>
        </div>
      </div>
    </div>
  )
}

function Participant({ name, avatar, sub, connected, dim }: {
  name: string; avatar?: string; sub: string; connected: boolean; dim?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-1.5 rounded"
      style={{ background: 'var(--bg-input)', opacity: dim ? 0.6 : 1 }}>
      <div className="relative">
        <Avatar username={name} avatar={avatar} size="md" />
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{ background: connected ? 'var(--green)' : 'var(--yellow)', border: '2px solid var(--bg-input)' }} />
      </div>
      <span className="text-[10px] font-mono truncate w-full text-center" style={{ color: 'var(--text-primary)' }}>
        {name}
      </span>
      <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>{sub}</span>
    </div>
  )
}

// Elementos <audio> escondidos — tocam o áudio de cada peer
function PeerAudios({ peers }: { peers: VoicePeer[] }) {
  return (
    <>
      {peers.map(p => (
        <audio
          key={p.userId}
          autoPlay
          ref={el => { if (el && p.stream && el.srcObject !== p.stream) el.srcObject = p.stream }}
        />
      ))}
    </>
  )
}
