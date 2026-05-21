import { create } from 'zustand'
import type { Socket } from 'socket.io-client'

// Chamada de voz em GRUPO — topologia mesh: cada participante abre uma
// RTCPeerConnection direta com cada outro. Bom até ~5-6 pessoas (free, sem SFU).

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export interface VoicePeer {
  userId: string
  username: string
  avatar?: string
  stream: MediaStream | null
  connected: boolean
}

interface RoomInfo {
  count: number
  participants: { _id: string; username: string; avatar?: string }[]
}

interface PeerUser { _id: string; username: string; avatar?: string }

interface GroupCallStore {
  activeGroupId: string | null
  groupName: string
  joining: boolean
  peers: VoicePeer[]
  muted: boolean
  mini: boolean
  error: string | null
  localStream: MediaStream | null
  rooms: Record<string, RoomInfo>   // estado de voz por grupo (indicador na sidebar)

  attachSocketHandlers: (socket: Socket, myId: string) => void
  joinCall: (socket: Socket, groupId: string, groupName: string, me: PeerUser) => Promise<void>
  leaveCall: (socket: Socket | null) => void
  toggleMute: () => void
  setMini: (v: boolean) => void
}

// Referências não-reativas
const pcs = new Map<string, RTCPeerConnection>()
const pendingIce = new Map<string, RTCIceCandidateInit[]>()
let socketRef: Socket | null = null
let myId: string | null = null

export const useGroupCallStore = create<GroupCallStore>((set, get) => ({
  activeGroupId: null,
  groupName: '',
  joining: false,
  peers: [],
  muted: false,
  mini: false,
  error: null,
  localStream: null,
  rooms: {},

  attachSocketHandlers: (socket, id) => {
    socketRef = socket
    myId = id

    // Estado de voz de um grupo (indicador)
    socket.on('voice:room', (info: RoomInfo & { groupId: string }) => {
      set(s => ({ rooms: { ...s.rooms, [info.groupId]: { count: info.count, participants: info.participants } } }))
    })

    // Lista de quem já estava na call quando entrei → eu inicio offer pros menores ids
    socket.on('voice:peers', async ({ peers }: { peers: PeerUser[] }) => {
      for (const p of peers) {
        ensurePeer(p)
        const pc = createPC(p._id)
        if (myId && myId < p._id) await sendOffer(pc, p._id)
      }
    })

    // Alguém entrou depois de mim
    socket.on('voice:peer-joined', async ({ user }: { user: PeerUser }) => {
      ensurePeer(user)
      // Regra anti-glare: só o menor id inicia o offer
      if (myId && myId < user._id) {
        const pc = createPC(user._id)
        await sendOffer(pc, user._id)
      }
    })

    // SDP/ICE de um peer
    socket.on('voice:signal', async ({ from, fromUser, data }: { from: string; fromUser: PeerUser; data: any }) => {
      let pc = pcs.get(from)
      try {
        if (data.kind === 'offer') {
          if (!pc) { ensurePeer(fromUser); pc = createPC(from) }
          await pc.setRemoteDescription(data.sdp)
          await flushIce(from, pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socketRef?.emit('voice:signal', { toUserId: from, data: { kind: 'answer', sdp: answer } })
        } else if (data.kind === 'answer') {
          if (pc) { await pc.setRemoteDescription(data.sdp); await flushIce(from, pc) }
        } else if (data.kind === 'ice') {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(data.candidate).catch(() => {})
          } else {
            pendingIce.set(from, [...(pendingIce.get(from) || []), data.candidate])
          }
        }
      } catch (err) {
        console.error('voice:signal', err)
      }
    })

    socket.on('voice:peer-left', ({ userId }: { userId: string }) => {
      removePeer(userId)
    })
  },

  joinCall: async (socket, groupId, groupName, me) => {
    if (get().activeGroupId) return
    set({ joining: true, error: null, peers: [], muted: false })
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      set({ localStream, joining: false, activeGroupId: groupId, groupName, mini: false })
      socket.emit('voice:join', {
        groupId,
        user: { _id: me._id, username: me.username, avatar: me.avatar },
      })
    } catch (err: any) {
      set({
        joining: false,
        error: err.name === 'NotAllowedError'
          ? 'Permissão de microfone negada'
          : 'Erro ao acessar o microfone',
      })
      setTimeout(() => set({ error: null }), 3500)
    }
  },

  leaveCall: (socket) => {
    const gid = get().activeGroupId
    if (gid && socket) socket.emit('voice:leave', { groupId: gid })
    cleanup()
    set({ activeGroupId: null, groupName: '', peers: [], muted: false, mini: false })
  },

  toggleMute: () => {
    const { localStream, muted } = get()
    if (!localStream) return
    const next = !muted
    localStream.getAudioTracks().forEach(t => (t.enabled = !next))
    set({ muted: next })
  },

  setMini: (v) => set({ mini: v }),
}))

// ---- helpers ----

function ensurePeer(user: PeerUser) {
  useGroupCallStore.setState(s =>
    s.peers.some(p => p.userId === user._id)
      ? s
      : { peers: [...s.peers, { userId: user._id, username: user.username || '...', avatar: user.avatar, stream: null, connected: false }] }
  )
}

function removePeer(userId: string) {
  const pc = pcs.get(userId)
  if (pc) {
    pc.ontrack = null
    pc.onicecandidate = null
    pc.onconnectionstatechange = null
    pc.close()
    pcs.delete(userId)
  }
  pendingIce.delete(userId)
  useGroupCallStore.setState(s => ({ peers: s.peers.filter(p => p.userId !== userId) }))
}

function createPC(peerId: string): RTCPeerConnection {
  // Reaproveita se já existe
  const existing = pcs.get(peerId)
  if (existing) return existing

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  const localStream = useGroupCallStore.getState().localStream
  localStream?.getTracks().forEach(t => pc.addTrack(t, localStream))

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socketRef?.emit('voice:signal', { toUserId: peerId, data: { kind: 'ice', candidate: e.candidate.toJSON() } })
    }
  }
  pc.ontrack = (e) => {
    const stream = e.streams[0]
    useGroupCallStore.setState(s => ({
      peers: s.peers.map(p => p.userId === peerId ? { ...p, stream, connected: true } : p),
    }))
  }
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      useGroupCallStore.setState(s => ({
        peers: s.peers.map(p => p.userId === peerId ? { ...p, connected: true } : p),
      }))
    } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      removePeer(peerId)
    }
  }

  pcs.set(peerId, pc)
  return pc
}

async function sendOffer(pc: RTCPeerConnection, peerId: string) {
  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true })
    await pc.setLocalDescription(offer)
    socketRef?.emit('voice:signal', { toUserId: peerId, data: { kind: 'offer', sdp: offer } })
  } catch (err) {
    console.error('sendOffer', err)
  }
}

async function flushIce(peerId: string, pc: RTCPeerConnection) {
  const list = pendingIce.get(peerId)
  if (!list) return
  for (const c of list) await pc.addIceCandidate(c).catch(() => {})
  pendingIce.delete(peerId)
}

function cleanup() {
  pcs.forEach(pc => {
    pc.ontrack = null
    pc.onicecandidate = null
    pc.onconnectionstatechange = null
    pc.close()
  })
  pcs.clear()
  pendingIce.clear()
  const s = useGroupCallStore.getState()
  s.localStream?.getTracks().forEach(t => t.stop())
  useGroupCallStore.setState({ localStream: null })
}
