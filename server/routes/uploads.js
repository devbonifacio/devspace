import express from 'express'
import { v2 as cloudinary } from 'cloudinary'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

// GET /api/uploads/signature?folder=avatars|chat
// Retorna params + signature pra client fazer upload direto pro Cloudinary
router.get('/signature', protect, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Upload não configurado no servidor' })
    }

    const FOLDERS = {
      avatars: 'devspace/avatars',
      banners: 'devspace/banners',
      chat:    'devspace/chat',
    }
    const folder = FOLDERS[req.query.folder] || FOLDERS.chat
    const timestamp = Math.round(Date.now() / 1000)

    // Tags pro Cloudinary (útil pra auditoria/cleanup futuro)
    const tags = `user_${req.user._id},${folder.split('/').pop()}`

    // Moderação no servidor (Cloudinary add-on). Só ativa se CLOUDINARY_MODERATION
    // estiver definido (ex.: "aws_rek"). Sem isso, upload normal sem moderação.
    const moderation = (process.env.CLOUDINARY_MODERATION || '').trim()

    const paramsToSign = { timestamp, folder, tags }
    if (moderation) paramsToSign.moderation = moderation

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    )

    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder,
      tags,
      moderation,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/uploads/destroy — apaga um asset (usado quando a moderação reprova)
router.post('/destroy', protect, async (req, res) => {
  try {
    if (!isConfigured()) return res.status(503).json({ error: 'Upload não configurado' })
    const { publicId } = req.body
    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ error: 'publicId obrigatório' })
    }
    // Segurança: só apaga assets do DevSpace
    if (!publicId.startsWith('devspace/')) {
      return res.status(400).json({ error: 'publicId inválido' })
    }
    await cloudinary.uploader.destroy(publicId, { invalidate: true })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
