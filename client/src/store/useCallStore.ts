import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import type { User } from '../types'

export type CallStatus =
  | 'idle'        // nada acontecendo
  | 'calling'     // eu liguei, esperando resposta
  | 'ringing'     // tô recebendo, modal de aceitar/recusar
  | 'connecting'  // aceitei, negociando WebRTC
  | 'in-call'     // áudio fluindo
  | 'ended'       // recém-terminada (curto, antes de voltar pra idle)

// Servidores STUN públicos do Google (grátis, suficiente pra 90% dos NATs)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

interface CallStore {
  status: CallStatus
  peer: User | null              // o outro lado da chamada
  isCaller: boolean              // true = eu iniciei
  startedAt: number | null       // timestamp do conectado, pra timer
  muted: boolean
  mini: boolean                  // janela minimizada
  miniPosition: { x: number; y: number }  // posição da mini (draggable)
  error: string | null

  // Internos — referências não-reativas
  pc: RTCPeerConnection | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  pendingIce: RTCIceCandidateInit[]

  // Setup do listener de signaling (chamado uma vez ao conectar socket)
  attachSocketHandlers: (socket: Socket, myUserId: string) => void

  // Ações públicas
  startCall: (socket: Socket, callee: User, me: User) => Promise<void>
  acceptIncoming: (socket: Socket) => Promise<void>
  declineIncoming: (socket: Socket) => void
  hangup: (socket: Socket | null) => void
  toggleMute: () => void
  setMini: (v: boolean) => void
  setMiniPosition: (p: { x: number; y: number }) => void
  clearError: () => void
}

// Estado interno auxiliar (não reativo) — mantém o SDP offer que veio do caller
// enquanto o callee não aceitou ainda
let pendingOffer: RTCSessionDescriptionInit | null = null
let socketRef: Socket | null = null
let mySelfId: string | null = null

export const useCallStore = create<CallStore>((set, get) => ({
  status: 'idle',
  peer: null,
  isCaller: false,
  startedAt: null,
  muted: false,
  mini: false,
  miniPosition: { x: 24, y: 24 },
  error: null,
  pc: null,
  localStream: null,
  remoteStream: null,
  pendingIce: [],

  attachSocketHandlers: (socket, myUserId) => {
    socketRef = socket
    mySelfId = myUserId

    // Alguém ligou pra mim
    socket.on('call-incoming', ({ from, sdp }: { from: User; sdp: RTCSessionDescriptionInit }) => {
      const cur = get().status
      if (cur !== 'idle' && cur !== 'ended') {
        // Já em chamada → avisa busy
        socket.emit('call-busy', { toId: from._id })
        return
      }
      pendingOffer = sdp
      set({ status: 'ringing', peer: from, isCaller: false, error: null })
    })

    // Callee aceitou (eu sou o caller)
    socket.on('call-accepted', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const { pc } = get()
      if (!pc) return
      try {
        await pc.setRemoteDescription(sdp)
        // Aplica ICEs que chegaram antes do remoteDescription
        for (const c of get().pendingIce) {
          await pc.addIceCandidate(c).catch(() => {})
        }
        set({ pendingIce: [], status: 'connecting' })
      } catch (err: any) {
        set({ error: err.message || 'Erro ao conectar' })
      }
    })

    socket.on('call-ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const { pc } = get()
      if (!pc) return
      if (pc.remoteDescription) {
        await pc.addIceCandidate(candidate).catch(() => {})
      } else {
        // Buffer até o remoteDescription estar setado
        set(s => ({ pendingIce: [...s.pendingIce, candidate] }))
      }
    })

    socket.on('call-hangup', () => {
      cleanup()
      set({ status: 'ended', error: null })
      setTimeout(() => set({ status: 'idle', peer: null }), 1500)
    })

    socket.on('call-declined', () => {
      cleanup()
      set({ status: 'ended', error: 'Chamada recusada' })
      setTimeout(() => set({ status: 'idle', peer: null, error: null }), 2500)
    })

    socket.on('call-busy', () => {
      cleanup()
      set({ status: 'ended', error: 'Usuário ocupado em outra chamada' })
      setTimeout(() => set({ status: 'idle', peer: null, error: null }), 2500)
    })
  },

  startCall: async (socket, callee, me) => {
    if (get().status !== 'idle' && get().status !== 'ended') return
    set({ status: 'calling', peer: callee, isCaller: true, error: null, muted: false })

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const pc = makePeerConnection(socket, callee._id)
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream))

      const remoteStream = new MediaStream()
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t))
        set({ remoteStream })
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          set({ status: 'in-call', startedAt: Date.now() })
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          // Tenta encerrar limpo
          get().hangup(socketRef)
        }
      }

      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)

      set({ pc, localStream, remoteStream })

      socket.emit('call-user', {
        toId: callee._id,
        fromUser: { _id: me._id, username: me.username, avatar: me.avatar },
        sdp: offer,
      })
    } catch (err: any) {
      cleanup()
      set({
        status: 'ended',
        error: err.name === 'NotAllowedError'
          ? 'Permissão de microfone negada'
          : err.message || 'Erro ao iniciar chamada'
      })
      setTimeout(() => set({ status: 'idle', peer: null, error: null }), 3000)
    }
  },

  acceptIncoming: async (socket) => {
    const offer = pendingOffer
    const peer = get().peer
    if (!offer || !peer) return

    set({ status: 'connecting' })
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const pc = makePeerConnection(socket, peer._id)
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream))

      const remoteStream = new MediaStream()
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t))
        set({ remoteStream })
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          set({ status: 'in-call', startedAt: Date.now() })
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          get().hangup(socketRef)
        }
      }

      await pc.setRemoteDescription(offer)
      // Aplica ICEs bufferizados
      for (const c of get().pendingIce) await pc.addIceCandidate(c).catch(() => {})
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      set({ pc, localStream, remoteStream, pendingIce: [] })
      pendingOffer = null

      socket.emit('call-answer', { toId: peer._id, sdp: answer })
    } catch (err: any) {
      cleanup()
      set({
        status: 'ended',
        error: err.name === 'NotAllowedError'
          ? 'Permissão de microfone negada'
          : err.message || 'Erro ao aceitar'
      })
      setTimeout(() => set({ status: 'idle', peer: null, error: null }), 3000)
    }
  },

  declineIncoming: (socket) => {
    const peer = get().peer
    if (peer) socket.emit('call-decline', { toId: peer._id })
    pendingOffer = null
    cleanup()
    set({ status: 'idle', peer: null })
  },

  hangup: (socket) => {
    const peer = get().peer
    if (socket && peer) socket.emit('call-hangup', { toId: peer._id })
    cleanup()
    set({ status: 'ended' })
    setTimeout(() => set({ status: 'idle', peer: null }), 800)
  },

  toggleMute: () => {
    const { localStream, muted } = get()
    if (!localStream) return
    const next = !muted
    localStream.getAudioTracks().forEach(t => (t.enabled = !next))
    set({ muted: next })
  },

  setMini: (v) => set({ mini: v }),
  setMiniPosition: (p) => set({ miniPosition: p }),
  clearError: () => set({ error: null }),
}))

// Helper: cria uma PeerConnection já com handler de ICE
function makePeerConnection(socket: Socket, peerId: string): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('call-ice-candidate', { toId: peerId, candidate: e.candidate.toJSON() })
    }
  }
  return pc
}

// Limpa todos os recursos da chamada
function cleanup() {
  const s = useCallStore.getState()
  s.localStream?.getTracks().forEach(t => t.stop())
  s.remoteStream?.getTracks().forEach(t => t.stop())
  if (s.pc) {
    s.pc.ontrack = null
    s.pc.onicecandidate = null
    s.pc.onconnectionstatechange = null
    s.pc.close()
  }
  pendingOffer = null
  useCallStore.setState({
    pc: null,
    localStream: null,
    remoteStream: null,
    startedAt: null,
    muted: false,
    mini: false,
    pendingIce: [],
    isCaller: false,
  })
}

// Ringtone sintetizado (sem precisar de arquivo MP3) — toca em loop até parar
let ringCtx: AudioContext | null = null
let ringInterval: number | null = null

export function startRingtone() {
  stopRingtone()
  try {
    ringCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playBeep = () => {
      const ctx = ringCtx!
      const now = ctx.currentTime
      // 2 beeps "rrrring rrrring"
      ;[0, 0.4].forEach(offset => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.setValueAtTime(440, now + offset)
        o.frequency.setValueAtTime(480, now + offset + 0.2)
        g.gain.setValueAtTime(0.0001, now + offset)
        g.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32)
        o.start(now + offset)
        o.stop(now + offset + 0.35)
      })
    }
    playBeep()
    ringInterval = window.setInterval(playBeep, 2500)
  } catch (err) {
    console.error('startRingtone:', err)
  }
}

export function stopRingtone() {
  if (ringInterval !== null) {
    clearInterval(ringInterval)
    ringInterval = null
  }
  if (ringCtx) {
    try { ringCtx.close() } catch {}
    ringCtx = null
  }
}

// Pisca o título da aba quando em chamada com aba em background
export function startTitleBlink(text: string) {
  stopTitleBlink()
  const original = document.title
  let toggle = false
  const id = window.setInterval(() => {
    if (!document.hidden) return
    document.title = toggle ? original : text
    toggle = !toggle
  }, 1000)
  ;(window as any).__dsCallTitleBlink = { id, original }
}

export function stopTitleBlink() {
  const ref = (window as any).__dsCallTitleBlink
  if (ref) {
    clearInterval(ref.id)
    document.title = ref.original
    delete (window as any).__dsCallTitleBlink
  }
}

void mySelfId  // unused warning shut
