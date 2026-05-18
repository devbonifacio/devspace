import express from 'express'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// GET /api/users/online — usuários online (com ids dos grupos em comum filtrados no client se necessário)
router.get('/online', protect, async (_req, res) => {
  try {
    const users = await User.find({ status: 'online' }).select('username avatar role status')
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users/search?q=... — busca usuários por username/email (mínimo 2 chars)
router.get('/search', protect, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json([])

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const users = await User.find({
      $or: [
        { username: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } }
      ]
    })
      .select('username email avatar role status')
      .limit(20)

    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users/:id — perfil público de um usuário
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/users/profile — atualiza bio, githubUrl, avatar
router.patch('/profile', protect, async (req, res) => {
  try {
    const { bio, githubUrl, avatar } = req.body
    const updates = {}
    if (bio !== undefined) updates.bio = bio
    if (githubUrl !== undefined) updates.githubUrl = githubUrl
    if (avatar !== undefined) updates.avatar = avatar

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password')
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/users/custom-status — define emoji + texto livre
router.patch('/custom-status', protect, async (req, res) => {
  try {
    const { emoji = '', text = '' } = req.body
    if (typeof emoji !== 'string' || typeof text !== 'string') {
      return res.status(400).json({ error: 'Formato inválido' })
    }
    if (text.length > 60) return res.status(400).json({ error: 'Texto deve ter no máximo 60 caracteres' })

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { customStatus: { emoji: emoji.trim().slice(0, 8), text: text.trim() } },
      { new: true }
    ).select('-password')

    const io = req.app.get('io')
    if (io) io.emit('user-custom-status', {
      userId: req.user._id.toString(),
      customStatus: user.customStatus
    })

    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/users/status — define status manualmente (online, away, offline)
router.patch('/status', protect, async (req, res) => {
  try {
    const { status } = req.body
    if (!['online', 'away', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }
    await User.findByIdAndUpdate(req.user._id, { status })

    const io = req.app.get('io')
    if (io) io.emit('user-status', { userId: req.user._id.toString(), status })

    res.json({ ok: true, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
