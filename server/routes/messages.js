import express from 'express'
import Message from '../models/Message.js'
import Channel from '../models/Channel.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.use(protect)

const PAGE_SIZE = 50

const populateMsg = (q) => q
  .populate('author', 'username email avatar role status')
  .populate({ path: 'replyTo', populate: { path: 'author', select: 'username avatar role' } })

// GET /api/messages/:channelId?before=<msgId> — paginação por cursor (só mensagens top-level)
router.get('/:channelId', async (req, res) => {
  try {
    // Top-level only: replyTo === null. Respostas só aparecem dentro da thread.
    const filter = { channel: req.params.channelId, replyTo: null }
    if (req.query.before) {
      const ref = await Message.findById(req.query.before).select('createdAt')
      if (ref) filter.createdAt = { $lt: ref.createdAt }
    }
    const messages = await populateMsg(
      Message.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE)
    )
    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === PAGE_SIZE
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/dm/:userId?before=<msgId>
router.get('/dm/:userId', async (req, res) => {
  try {
    const me = req.user._id
    const other = req.params.userId

    const filter = {
      replyTo: null,
      $or: [
        { author: me, dm: other },
        { author: other, dm: me }
      ]
    }
    if (req.query.before) {
      const ref = await Message.findById(req.query.before).select('createdAt')
      if (ref) filter.createdAt = { $lt: ref.createdAt }
    }

    const messages = await populateMsg(
      Message.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE)
    )

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === PAGE_SIZE
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/thread/:parentId — todas respostas de uma mensagem
router.get('/thread/:parentId', async (req, res) => {
  try {
    const parent = await populateMsg(Message.findById(req.params.parentId))
    if (!parent) return res.status(404).json({ error: 'Mensagem pai não encontrada' })

    const replies = await populateMsg(
      Message.find({ replyTo: req.params.parentId }).sort({ createdAt: 1 })
    )
    res.json({ parent, replies })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/pinned/:channelId — mensagens pinadas no canal
router.get('/pinned/:channelId', async (req, res) => {
  try {
    const pinned = await populateMsg(
      Message.find({ channel: req.params.channelId, pinned: true }).sort({ pinnedAt: -1 })
    )
    res.json(pinned)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/messages/:id — editar mensagem (autor só)
router.patch('/:id', async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Conteúdo obrigatório' })

    const msg = await Message.findById(req.params.id)
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' })
    if (!msg.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'Você só pode editar suas mensagens' })
    }

    msg.content = content.trim()
    msg.edited = true
    await msg.save()
    const populated = await populateMsg(Message.findById(msg._id))

    const io = req.app.get('io')
    if (io && msg.channel) {
      io.to(`channel:${msg.channel}`).emit('message-edited', populated)
    } else if (io && msg.dm) {
      io.to(`user:${msg.author}`).emit('message-edited', populated)
      io.to(`user:${msg.dm}`).emit('message-edited', populated)
    }

    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/messages/:id/pin — pin/unpin (autor ou admin do grupo)
router.patch('/:id/pin', async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id)
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' })

    // Verifica permissão configurada no grupo
    let canPin = false
    if (msg.channel) {
      const channel = await Channel.findById(msg.channel).populate('group')
      const group = channel?.group
      if (group) {
        const isAdmin = group.owner?.equals(req.user._id) ||
                        (group.admins || []).some(a => a.equals(req.user._id))
        const isMember = group.members?.some(m => m.equals(req.user._id))
        const perm = group.permissions?.pinMessage || 'admins'
        canPin = isAdmin || (perm === 'all' && isMember)
      }
    } else {
      // DM: só o autor pode pinar
      canPin = msg.author.equals(req.user._id)
    }
    if (!canPin) return res.status(403).json({ error: 'Sem permissão para fixar mensagens' })

    msg.pinned = !msg.pinned
    msg.pinnedBy = msg.pinned ? req.user._id : null
    msg.pinnedAt = msg.pinned ? new Date() : null
    await msg.save()
    const populated = await populateMsg(Message.findById(msg._id))

    const io = req.app.get('io')
    if (io && msg.channel) {
      io.to(`channel:${msg.channel}`).emit('message-updated', populated)
    }
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/messages/:id — autor ou admin do grupo
router.delete('/:id', async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id)
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' })

    let canDelete = msg.author.equals(req.user._id)
    if (!canDelete && msg.channel) {
      const channel = await Channel.findById(msg.channel).populate('group')
      const group = channel?.group
      if (group) {
        canDelete = group.owner?.equals(req.user._id) ||
                    (group.admins || []).some(a => a.equals(req.user._id))
      }
    }
    if (!canDelete) return res.status(403).json({ error: 'Sem permissão' })

    const channelId = msg.channel
    const dmFrom = msg.author
    const dmTo = msg.dm
    const parentId = msg.replyTo
    await msg.deleteOne()

    // Se era uma reply, decrementa o contador do pai e emite update
    if (parentId) {
      await Message.findByIdAndUpdate(parentId, { $inc: { replyCount: -1 } })
      const io = req.app.get('io')
      if (io && channelId) {
        const parent = await populateMsg(Message.findById(parentId))
        if (parent) io.to(`channel:${channelId}`).emit('message-updated', parent)
      }
    }

    // Se era top-level com replies, apaga as replies em cascata
    if (!parentId) {
      await Message.deleteMany({ replyTo: req.params.id })
    }

    const io = req.app.get('io')
    if (io && channelId) {
      io.to(`channel:${channelId}`).emit('message-deleted', { _id: req.params.id, channel: channelId, replyTo: parentId })
    } else if (io && dmTo) {
      io.to(`user:${dmFrom}`).emit('message-deleted', { _id: req.params.id, dm: dmTo })
      io.to(`user:${dmTo}`).emit('message-deleted', { _id: req.params.id, dm: dmFrom })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/search/:groupId?q=texto — busca em todos os canais do grupo
router.get('/search/:groupId', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json([])

    const channels = await Channel.find({ group: req.params.groupId }).select('_id')
    const ids = channels.map(c => c._id)

    const messages = await Message.find({
      channel: { $in: ids },
      content: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('author', 'username avatar role')
      .populate('channel', 'name')

    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
