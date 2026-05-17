import express from 'express'
import Channel from '../models/Channel.js'
import Group from '../models/Group.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// GET /api/channels/:groupId
router.get('/:groupId', protect, async (req, res) => {
  try {
    const channels = await Channel.find({ group: req.params.groupId })
    res.json(channels)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/channels — cria canal (só membros do grupo)
router.post('/', protect, async (req, res) => {
  try {
    const { name, groupId, type = 'text', topic = '', isPrivate = false } = req.body
    if (!name?.trim() || !groupId) {
      return res.status(400).json({ error: 'Nome e groupId são obrigatórios' })
    }

    const group = await Group.findById(groupId)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

    const isMember = group.members.some(m => m.equals(req.user._id))
    if (!isMember) return res.status(403).json({ error: 'Sem permissão' })

    const channel = await Channel.create({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      group: groupId,
      type,
      topic,
      private: !!isPrivate
    })

    group.channels.push(channel._id)
    await group.save()

    res.status(201).json(channel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
