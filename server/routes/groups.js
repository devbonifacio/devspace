import express from 'express'
import Group from '../models/Group.js'
import Channel from '../models/Channel.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const populateGroup = (q) =>
  q.populate('members', 'username avatar status role')
   .populate('channels')

// Helper: trata owner como admin automático se admins ainda não migrado
const isAdmin = (group, userId) => {
  if (group.owner?.equals(userId)) return true
  return (group.admins || []).some(a => a.equals(userId))
}

// GET /api/groups
router.get('/', protect, async (req, res) => {
  try {
    const groups = await populateGroup(Group.find({ members: req.user._id }))
    res.json(groups)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/groups
router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })

    const group = await Group.create({
      name: name.trim(),
      description: description || '',
      owner: req.user._id,
      admins: [req.user._id],
      members: [req.user._id]
    })

    const channel = await Channel.create({
      name: 'geral',
      group: group._id,
      type: 'text',
      topic: 'Canal geral do grupo'
    })
    group.channels.push(channel._id)
    await group.save()

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { groups: group._id } })

    const populated = await populateGroup(Group.findById(group._id))
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/groups/join
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body
    if (!inviteCode?.trim()) return res.status(400).json({ error: 'Código obrigatório' })

    const group = await Group.findOne({ inviteCode: inviteCode.trim().toUpperCase() })
    if (!group) return res.status(404).json({ error: 'Código inválido' })

    const already = group.members.some(m => m.equals(req.user._id))
    if (already) return res.status(400).json({ error: 'Você já está neste grupo' })

    group.members.push(req.user._id)
    await group.save()
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { groups: group._id } })

    const populated = await populateGroup(Group.findById(group._id))

    // Broadcast: avisa membros existentes que houve mudança + posta system msg no canal geral
    const io = req.app.get('io')
    if (io) {
      io.to(`group:${group._id}`).emit('group-updated', populated)

      const geral = populated.channels?.find(c => c.name === 'geral') || populated.channels?.[0]
      if (geral) {
        const sysMsg = await Message.create({
          author: req.user._id,
          channel: geral._id,
          content: `@${req.user.username} entrou no grupo`,
          type: 'system'
        })
        const pop = await sysMsg.populate('author', 'username role avatar status')
        io.to(`channel:${geral._id}`).emit('new-message', pop)
      }
    }

    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/groups/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await populateGroup(Group.findById(req.params.id))
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
    res.json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/groups/:id — só admin pode apagar (cascata canais + mensagens)
router.delete('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ error: 'Apenas administradores podem apagar o grupo' })
    }

    const channelIds = group.channels
    await Message.deleteMany({ channel: { $in: channelIds } })
    await Channel.deleteMany({ _id: { $in: channelIds } })
    await User.updateMany(
      { _id: { $in: group.members } },
      { $pull: { groups: group._id } }
    )
    await group.deleteOne()

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/groups/:id/admins — adiciona admin
router.post('/:id/admins', protect, async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId obrigatório' })

    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ error: 'Apenas administradores podem promover' })
    }

    const isMember = group.members.some(m => m.equals(userId))
    if (!isMember) return res.status(400).json({ error: 'Usuário não é membro do grupo' })

    if (!group.admins) group.admins = []
    if (!group.admins.some(a => a.equals(userId))) {
      group.admins.push(userId)
      await group.save()
    }

    const populated = await populateGroup(Group.findById(group._id))
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/groups/:id/leave — sair do grupo (owner não pode sair sem transferir)
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

    const isMember = group.members.some(m => m.equals(req.user._id))
    if (!isMember) return res.status(400).json({ error: 'Você não é membro deste grupo' })

    if (group.owner?.equals(req.user._id)) {
      return res.status(400).json({ error: 'Owner não pode sair. Transfira o grupo ou apague.' })
    }

    group.members = group.members.filter(m => !m.equals(req.user._id))
    group.admins = (group.admins || []).filter(a => !a.equals(req.user._id))
    await group.save()

    await User.findByIdAndUpdate(req.user._id, { $pull: { groups: group._id } })

    // Broadcast pra membros que ficaram + system msg no geral
    const io = req.app.get('io')
    if (io) {
      const populated = await populateGroup(Group.findById(group._id))
      io.to(`group:${group._id}`).emit('group-updated', populated)

      const geral = populated.channels?.find(c => c.name === 'geral') || populated.channels?.[0]
      if (geral) {
        const sysMsg = await Message.create({
          author: req.user._id,
          channel: geral._id,
          content: `@${req.user.username} saiu do grupo`,
          type: 'system'
        })
        const pop = await sysMsg.populate('author', 'username role avatar status')
        io.to(`channel:${geral._id}`).emit('new-message', pop)
      }
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/groups/:id/permissions — atualiza flags de permissão (só admin/owner)
router.patch('/:id/permissions', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ error: 'Apenas administradores podem alterar permissões' })
    }

    const allowed = ['createChannel', 'pinMessage', 'shareRepo', 'inviteMembers']
    const updates = {}
    for (const k of allowed) {
      const v = req.body?.[k]
      if (v === 'all' || v === 'admins') updates[`permissions.${k}`] = v
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhuma permissão válida no body' })
    }

    await Group.findByIdAndUpdate(req.params.id, { $set: updates })
    const populated = await populateGroup(Group.findById(group._id))

    const io = req.app.get('io')
    if (io) io.to(`group:${group._id}`).emit('group-updated', populated)

    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/groups/:id/members/:userId — kick (só admin pode, não kicka o owner)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ error: 'Apenas administradores podem remover membros' })
    }
    if (group.owner?.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Owner não pode ser removido' })
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Use a rota /leave para sair do grupo' })
    }

    const wasMember = group.members.some(m => m.toString() === req.params.userId)
    if (!wasMember) return res.status(404).json({ error: 'Usuário não é membro' })

    group.members = group.members.filter(m => m.toString() !== req.params.userId)
    group.admins = (group.admins || []).filter(a => a.toString() !== req.params.userId)
    await group.save()

    await User.findByIdAndUpdate(req.params.userId, { $pull: { groups: group._id } })

    const io = req.app.get('io')
    if (io) {
      const populated = await populateGroup(Group.findById(group._id))
      io.to(`group:${group._id}`).emit('group-updated', populated)
      // Avisa o user removido pra atualizar a UI dele
      io.to(`user:${req.params.userId}`).emit('group-kicked', { groupId: group._id.toString() })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/groups/:id/admins/:userId — remove admin (owner não pode ser removido)
router.delete('/:id/admins/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ error: 'Apenas administradores podem rebaixar' })
    }
    if (group.owner?.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Owner não pode ser rebaixado' })
    }

    group.admins = (group.admins || []).filter(a => a.toString() !== req.params.userId)
    await group.save()

    const populated = await populateGroup(Group.findById(group._id))
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
