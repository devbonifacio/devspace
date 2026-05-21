import Message from '../models/Message.js'
import User from '../models/User.js'
import Channel from '../models/Channel.js'
import { isBanned } from '../utils/ban.js'
import { getBotId, getBotUser, welcomeDM } from '../utils/bot.js'

// Extrai @usernames únicos de um conteúdo
const extractMentions = (text) => {
  const matches = text.match(/@(\w+)/g) || []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

// Notifica usuários mencionados (exceto o próprio autor)
const notifyMentions = async (io, populated, authorId, channelId) => {
  try {
    const usernames = extractMentions(populated.content)
    if (usernames.length === 0) return

    const users = await User.find({
      username: { $in: usernames.map(u => new RegExp(`^${u}$`, 'i')) }
    }).select('_id')

    // Pega o nome do canal pra exibir na notif
    let channelName = ''
    if (channelId) {
      const ch = await Channel.findById(channelId).select('name')
      channelName = ch?.name || ''
    }

    for (const u of users) {
      if (u._id.toString() === authorId.toString()) continue
      io.to(`user:${u._id}`).emit('you-were-mentioned', {
        message: populated,
        channelName,
      })
    }
  } catch (err) {
    console.error('notifyMentions:', err.message)
  }
}

export const setupSocket = (io) => {
  const onlineUsers = new Map() // userId → Set<socketId>

  // Lista de quem está online — o bot entra sempre (fica online 24/7)
  const onlineSnapshot = () => {
    const ids = [...onlineUsers.keys()]
    const botId = getBotId()
    if (botId && !ids.includes(botId)) ids.push(botId)
    return ids
  }

  // Chamadas de voz em grupo — voiceRooms: groupId -> Map(userId -> { socketId, username, avatar })
  const voiceRooms = new Map()

  const voiceRoomState = (groupId) => {
    const room = voiceRooms.get(groupId)
    const participants = room
      ? [...room.entries()].map(([uid, v]) => ({ _id: uid, username: v.username, avatar: v.avatar }))
      : []
    return { groupId, count: participants.length, participants }
  }

  const leaveVoice = (socket, userId, groupId) => {
    if (!groupId) return
    const room = voiceRooms.get(groupId)
    if (!room || !room.has(userId)) return
    room.delete(userId)
    socket.leave(`voice:${groupId}`)
    socket.to(`voice:${groupId}`).emit('voice:peer-left', { userId })
    if (room.size === 0) voiceRooms.delete(groupId)
    io.to(`group:${groupId}`).emit('voice:room', voiceRoomState(groupId))
  }

  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth?.userId
    if (!userId) return

    // Bloqueia conexão de usuário banido
    try {
      const u = await User.findById(userId).select('ban')
      if (u && isBanned(u)) {
        socket.emit('force-logout', { reason: u.ban?.reason || '' })
        return socket.disconnect(true)
      }
    } catch {}

    // Suporta múltiplas abas: cada user pode ter vários sockets
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId).add(socket.id)

    // Cada user entra na própria sala (usado para DMs)
    socket.join(`user:${userId}`)

    // Snapshot: manda pra ESTE socket quem já está online agora
    socket.emit('online-users', onlineSnapshot())

    // O cliente também pode pedir a lista explicitamente (à prova de race)
    socket.on('get-online', () => socket.emit('online-users', onlineSnapshot()))

    if (onlineUsers.get(userId).size === 1) {
      try { await User.findByIdAndUpdate(userId, { status: 'online' }) } catch {}
      io.emit('user-status', { userId, status: 'online' })
    }

    // Boas-vindas do bot — DM ao vivo na 1ª conexão (dispara som + notificação)
    try {
      const me = await User.findById(userId)
      if (me && me.role !== 'bot' && !me.botWelcomed) {
        const bot = await getBotUser()
        const wmsg = await Message.create({
          author: bot._id, dm: me._id, content: welcomeDM(me.username), type: 'text',
        })
        const populated = await Message.findById(wmsg._id)
          .populate('author', 'username avatar role status')
        io.to(`user:${userId}`).emit('new-dm', populated)
        me.botWelcomed = true
        await me.save()
      }
    } catch (e) {
      console.error('bot welcome:', e.message)
    }

    // Em qual grupo este socket está numa chamada de voz (null = nenhuma)
    let voiceGroupId = null

    socket.on('join-channel', (channelId) => socket.join(`channel:${channelId}`))
    socket.on('leave-channel', (channelId) => socket.leave(`channel:${channelId}`))
    socket.on('join-group', (groupId) => {
      socket.join(`group:${groupId}`)
      // Manda o estado atual da chamada de voz desse grupo (pro indicador)
      socket.emit('voice:room', voiceRoomState(groupId))
    })
    socket.on('leave-group', (groupId) => socket.leave(`group:${groupId}`))

    // ===== Chamada de voz em grupo (mesh WebRTC — server só faz signaling) =====
    socket.on('voice:join', ({ groupId, user }) => {
      if (!groupId || !user) return
      let room = voiceRooms.get(groupId)
      if (!room) { room = new Map(); voiceRooms.set(groupId, room) }
      // Manda pro novo a lista de quem já está na call
      const existing = [...room.entries()].map(([uid, v]) => ({ _id: uid, username: v.username, avatar: v.avatar }))
      socket.emit('voice:peers', { peers: existing })
      // Registra e avisa os outros participantes
      room.set(userId, { socketId: socket.id, username: user.username, avatar: user.avatar })
      voiceGroupId = groupId
      socket.join(`voice:${groupId}`)
      socket.to(`voice:${groupId}`).emit('voice:peer-joined', {
        user: { _id: userId, username: user.username, avatar: user.avatar },
      })
      io.to(`group:${groupId}`).emit('voice:room', voiceRoomState(groupId))
    })

    // Relay de SDP/ICE entre dois peers da call
    socket.on('voice:signal', ({ toUserId, data }) => {
      const room = voiceGroupId && voiceRooms.get(voiceGroupId)
      const meInfo = room && room.get(userId)
      io.to(`user:${toUserId}`).emit('voice:signal', {
        from: userId,
        fromUser: { _id: userId, username: meInfo?.username, avatar: meInfo?.avatar },
        data,
      })
    })

    socket.on('voice:leave', ({ groupId }) => {
      const gid = groupId || voiceGroupId
      leaveVoice(socket, userId, gid)
      if (gid === voiceGroupId) voiceGroupId = null
    })

    socket.on('send-message', async (data) => {
      try {
        const msg = await Message.create({
          author: data.authorId,
          channel: data.channelId,
          content: data.content,
          type: data.type || 'text',
          repoData: data.repoData,
          imageData: data.imageData,
          replyTo: data.replyTo || null,
        })
        // Se é uma reply, incrementa replyCount do pai
        if (data.replyTo) {
          await Message.findByIdAndUpdate(data.replyTo, { $inc: { replyCount: 1 } })
          const parent = await Message.findById(data.replyTo).populate('author', 'username role avatar status')
          if (parent) io.to(`channel:${data.channelId}`).emit('message-updated', parent)
        }
        const populated = await Message.findById(msg._id)
          .populate('author', 'username role avatar status')
          .populate({ path: 'replyTo', populate: { path: 'author', select: 'username avatar role' } })
        io.to(`channel:${data.channelId}`).emit('new-message', populated)
        notifyMentions(io, populated, data.authorId, data.channelId)
      } catch (err) {
        socket.emit('error', { message: err.message })
      }
    })

    socket.on('send-dm', async (data) => {
      try {
        const msg = await Message.create({
          author: data.fromId,
          dm: data.toId,
          content: data.content,
          type: data.type || 'text',
          imageData: data.imageData,
          replyTo: data.replyTo || null,
        })
        if (data.replyTo) {
          await Message.findByIdAndUpdate(data.replyTo, { $inc: { replyCount: 1 } })
        }
        const populated = await Message.findById(msg._id)
          .populate('author', 'username avatar role status')
          .populate({ path: 'replyTo', populate: { path: 'author', select: 'username avatar role' } })
        io.to(`user:${data.fromId}`).emit('new-dm', populated)
        if (data.toId !== data.fromId) {
          io.to(`user:${data.toId}`).emit('new-dm', populated)
        }
      } catch (err) {
        socket.emit('error', { message: err.message })
      }
    })

    socket.on('typing', (data) => {
      socket.to(`channel:${data.channelId}`).emit('user-typing', {
        username: data.username,
        channelId: data.channelId
      })
    })

    socket.on('stop-typing', (data) => {
      socket.to(`channel:${data.channelId}`).emit('user-stop-typing', {
        username: data.username,
        channelId: data.channelId
      })
    })

    socket.on('react-message', async (data) => {
      try {
        const msg = await Message.findById(data.messageId)
        if (!msg) return
        const existing = msg.reactions.find(r => r.emoji === data.emoji)
        if (existing) {
          const idx = existing.users.findIndex(u => u.toString() === data.userId)
          if (idx > -1) existing.users.splice(idx, 1)
          else existing.users.push(data.userId)
          // remove emoji se ficar vazio
          if (existing.users.length === 0) {
            msg.reactions = msg.reactions.filter(r => r.emoji !== data.emoji)
          }
        } else {
          msg.reactions.push({ emoji: data.emoji, users: [data.userId] })
        }
        await msg.save()
        if (msg.channel) {
          io.to(`channel:${msg.channel}`).emit('message-reacted', msg)
        } else if (msg.dm) {
          io.to(`user:${msg.author}`).emit('message-reacted', msg)
          io.to(`user:${msg.dm}`).emit('message-reacted', msg)
        }
      } catch {}
    })

    // ============================================================
    // CHAMADAS DE VOZ (WebRTC signaling — server só relaya, sem dados de audio)
    // ============================================================

    // Caller envia offer SDP pro callee
    socket.on('call-user', ({ toId, fromUser, sdp }) => {
      io.to(`user:${toId}`).emit('call-incoming', {
        from: fromUser,   // { _id, username, avatar }
        sdp,
      })
    })

    // Callee aceitou e devolve answer SDP
    socket.on('call-answer', ({ toId, sdp }) => {
      io.to(`user:${toId}`).emit('call-accepted', { sdp })
    })

    // Troca de ICE candidates (bidirecional, durante toda a call)
    socket.on('call-ice-candidate', ({ toId, candidate }) => {
      io.to(`user:${toId}`).emit('call-ice-candidate', { candidate })
    })

    // Desligar (qualquer lado pode emitir)
    socket.on('call-hangup', ({ toId }) => {
      io.to(`user:${toId}`).emit('call-hangup')
    })

    // Recusar chamada antes de aceitar
    socket.on('call-decline', ({ toId }) => {
      io.to(`user:${toId}`).emit('call-declined')
    })

    // Callee já está em outra call
    socket.on('call-busy', ({ toId }) => {
      io.to(`user:${toId}`).emit('call-busy')
    })

    socket.on('disconnect', async () => {
      // Sai de qualquer chamada de voz ao desconectar
      if (voiceGroupId) leaveVoice(socket, userId, voiceGroupId)

      const sockets = onlineUsers.get(userId)
      if (!sockets) return
      sockets.delete(socket.id)
      if (sockets.size === 0) {
        onlineUsers.delete(userId)
        try {
          const user = await User.findById(userId)
          // Só marca offline se o usuário não optou por "invisible" manual
          if (user && user.status !== 'away') {
            await User.findByIdAndUpdate(userId, { status: 'offline' })
          }
        } catch {}
        io.emit('user-status', { userId, status: 'offline' })
      }
    })
  })
}
