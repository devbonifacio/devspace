import express from 'express'
import Message from '../models/Message.js'
import Channel from '../models/Channel.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.use(protect)

const PAGE_SIZE = 50

// GET /api/messages/:channelId?before=<msgId> — paginação por cursor
router.get('/:channelId', async (req, res) => {
  try {
    const filter = { channel: req.params.channelId }
    if (req.query.before) {
      const ref = await Message.findById(req.query.before).select('createdAt')
      if (ref) filter.createdAt = { $lt: ref.createdAt }
    }
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate('author', 'username email avatar role status')
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
      $or: [
        { author: me, dm: other },
        { author: other, dm: me }
      ]
    }
    if (req.query.before) {
      const ref = await Message.findById(req.query.before).select('createdAt')
      if (ref) filter.createdAt = { $lt: ref.createdAt }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate('author', 'username email avatar role status')

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === PAGE_SIZE
    })
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
    const populated = await msg.populate('author', 'username email avatar role status')

    const io = req.app.get('io')
    if (io && msg.channel) {
      io.to(`channel:${msg.channel}`).emit('message-edited', populated)
    } else if (io && msg.dm) {
      io.to(`user:${msg.author._id}`).emit('message-edited', populated)
      io.to(`user:${msg.dm}`).emit('message-edited', populated)
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
    await msg.deleteOne()

    const io = req.app.get('io')
    if (io && channelId) {
      io.to(`channel:${channelId}`).emit('message-deleted', { _id: req.params.id, channel: channelId })
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
