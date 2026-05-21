import express from 'express'
import User from '../models/User.js'
import { protect, requireOwner } from '../middleware/auth.js'
import { PERMANENT_DATE } from '../utils/ban.js'

const router = express.Router()

// Todas as rotas exigem login + ser o dono do painel
router.use(protect, requireOwner)

// GET /api/admin/users?q= — lista usuários (busca opcional) + estatísticas
router.get('/users', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    const filter = { role: { $ne: 'bot' } }   // a conta-bot não aparece na moderação
    if (q.length >= 1) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { username: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ]
    }

    const users = await User.find(filter)
      .select('username email avatar role status customStatus createdAt ban')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    const now = Date.now()
    const list = users.map(u => ({
      ...u,
      banned: !!(u.ban?.until && new Date(u.ban.until).getTime() > now),
    }))

    res.json({
      users: list,
      stats: {
        total: list.length,
        online: list.filter(u => u.status === 'online').length,
        banned: list.filter(u => u.banned).length,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/ban — body: { minutes?, permanent?, reason? }
router.post('/users/:id/ban', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você não pode banir a si mesmo.' })
    }

    const target = await User.findById(req.params.id)
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' })

    const { minutes, permanent, reason = '' } = req.body
    let until
    if (permanent) {
      until = PERMANENT_DATE
    } else {
      const mins = Number(minutes)
      if (!Number.isFinite(mins) || mins <= 0) {
        return res.status(400).json({ error: 'Duração inválida' })
      }
      until = new Date(Date.now() + mins * 60 * 1000)
    }

    target.ban = {
      until,
      reason: String(reason).trim().slice(0, 300),
      by: req.user.username,
      at: new Date(),
    }
    await target.save()

    // Derruba o usuário em tempo real (avisa, depois desconecta os sockets)
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${target._id}`).emit('force-logout', { reason: target.ban.reason })
      setTimeout(() => {
        try { io.in(`user:${target._id}`).disconnectSockets(true) } catch {}
      }, 1500)
    }

    res.json({ ok: true, ban: target.ban })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/unban — remove o banimento
router.post('/users/:id/unban', async (req, res) => {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' })

    target.ban = { until: null, reason: '', by: '', at: null }
    await target.save()

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
