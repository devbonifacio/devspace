import express from 'express'
import Bookmark from '../models/Bookmark.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.use(protect)

// GET /api/bookmarks — meus bookmarks (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: 'message',
        populate: [
          { path: 'author', select: 'username avatar role' },
          { path: 'channel', select: 'name group' },
        ]
      })

    // Filtra bookmarks cuja msg foi apagada (orphan)
    const valid = bookmarks.filter(b => b.message)
    res.json(valid)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bookmarks/check/:messageId — true se essa msg está nos meus bookmarks
router.get('/check/:messageId', async (req, res) => {
  try {
    const exists = await Bookmark.exists({ user: req.user._id, message: req.params.messageId })
    res.json({ bookmarked: !!exists })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/bookmarks/:messageId — toggle: cria se não existe, remove se existe
router.post('/:messageId', async (req, res) => {
  try {
    const existing = await Bookmark.findOne({ user: req.user._id, message: req.params.messageId })
    if (existing) {
      await existing.deleteOne()
      return res.json({ bookmarked: false })
    }
    await Bookmark.create({
      user: req.user._id,
      message: req.params.messageId,
      note: req.body?.note?.trim()?.slice(0, 200) || '',
    })
    res.json({ bookmarked: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/bookmarks/:messageId — remover bookmark
router.delete('/:messageId', async (req, res) => {
  try {
    await Bookmark.deleteOne({ user: req.user._id, message: req.params.messageId })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
